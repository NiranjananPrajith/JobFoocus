'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import ApplicationCard from '@/components/ApplicationCard';
import Card from '@/components/design/Card';
import ManageCategoriesModal from '@/components/ManageCategoriesModal';
import { deleteApplication, getAllApplications, getTrashedApplications, restoreApplication, permanentlyDeleteApplication, saveApplication, getUserCategories, type EnrichedApplication, type UserCategory } from '@/lib/storage-adapter';
import { StatusType } from '@/lib/design-system';

type Tab = 'all' | 'applied' | 'prospects' | 'trashed';

const STATUS_OPTIONS: StatusType[] = ['prospect', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'];

const inputClass =
  'w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11';

const labelClass = 'block text-[11px] uppercase tracking-wide text-steel mb-2';

function JobsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'all';

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [trashed, setTrashed] = useState<EnrichedApplication[]>([]);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filter state (only meaningful when activeTab === 'all')
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const handleDelete = async (id: string) => {
    const parts = id.split('/');
    const category = parts[0];
    const folder = parts.slice(1).join('/');
    try {
      await deleteApplication(category, folder);
      setApplications((prev) => prev.filter((app) => `${app.category}/${app.folder}` !== id));
    } catch (error) {
      console.error('Error deleting application:', error);
    }
  };

  const handleRestore = async (category: string, folder: string) => {
    try {
      await restoreApplication(category, folder);
      const [apps, trash] = await Promise.all([getAllApplications(), getTrashedApplications()]);
      setApplications(apps);
      setTrashed(trash);
    } catch (error) {
      console.error('Error restoring application:', error);
    }
  };

  const handlePermanentDelete = async (category: string, folder: string) => {
    if (!confirm('Permanently delete this application and all its documents? This cannot be undone.')) return;
    try {
      await permanentlyDeleteApplication(category, folder);
      setTrashed((prev) => prev.filter((app) => !(app.category === category && app.folder === folder)));
    } catch (error) {
      console.error('Error permanently deleting application:', error);
    }
  };

  const handleStatusChange = async (id: string, status: StatusType) => {
    const parts = id.split('/');
    const category = parts[0];
    const folder = parts.slice(1).join('/');
    try {
      const app = applications.find((a) => `${a.category}/${a.folder}` === id);
      if (!app) return;
      await saveApplication(category, folder, {
        company: app.company,
        job_title: app.job_title,
        date_applied: app.date_applied,
        status: status as any,
        response_date: null,
        notes: app.notes || '',
        contact_name: app.contact_name || null,
        contact_email: app.contact_email || null,
        source: app.source || '',
        documents: app.documents || [],
        job_url: app.job_url || null,
      });
      setApplications((prev) =>
        prev.map((a) =>
          `${a.category}/${a.folder}` === id ? { ...a, status: status as any } : a
        )
      );
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  const handleCategoryChange = async (id: string, newCategory: string) => {
    const parts = id.split('/');
    const oldCategory = parts[0];
    const folder = parts.slice(1).join('/');
    try {
      const { assignJobToCategory } = await import('@/lib/storage-adapter');
      await assignJobToCategory(oldCategory, folder, newCategory);
      const apps = await getAllApplications();
      setApplications(apps);
    } catch (error) {
      console.error('Error updating application category:', error);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [apps, trash, cats] = await Promise.all([
        getAllApplications(),
        getTrashedApplications(),
        getUserCategories(),
      ]);
      setApplications(apps);
      setTrashed(trash);
      setUserCategories(cats);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset filters when switching away from All tab
  useEffect(() => {
    if (activeTab !== 'all') {
      setSearch('');
      setStatusFilter('');
      setCategoryFilter('');
    }
  }, [activeTab]);

  // Derived counts
  const appliedCount = applications.filter((a) => a.status !== 'prospect').length;
  const prospectCount = applications.filter((a) => a.status === 'prospect').length;

  // Category map for filter dropdown
  const categoryMap = new Map<string, { name: string; color: string }>();
  applications.forEach((app) => {
    if (!categoryMap.has(app.category)) {
      categoryMap.set(app.category, { name: app.category_name, color: app.category_color });
    }
  });
  const CATEGORY_OPTIONS = Array.from(categoryMap.keys());

  // Filtered applications per tab
  const filteredApplications = applications.filter((app) => {
    if (activeTab === 'applied') return app.status !== 'prospect';
    if (activeTab === 'prospects') return app.status === 'prospect';
    // All tab: use filter bar
    const matchesSearch =
      app.company.toLowerCase().includes(search.toLowerCase()) ||
      app.job_title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || app.status === statusFilter;
    const matchesCategory = !categoryFilter || app.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-xl text-steel">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-[28px] md:text-[36px] font-medium text-ink mb-2">Jobs</h1>
        <p className="text-[14px] md:text-[16px] text-steel">
          Browse, filter, and track all your job applications
        </p>
      </div>

      {/* Tab Bar */}
      <div className="mb-6 flex items-center gap-1 border-b border-hairline-soft">
        <TabButton
          active={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          count={applications.length}
          label="All Jobs"
        />
        <TabButton
          active={activeTab === 'applied'}
          onClick={() => setActiveTab('applied')}
          count={appliedCount}
          label="Applied"
        />
        <TabButton
          active={activeTab === 'prospects'}
          onClick={() => setActiveTab('prospects')}
          count={prospectCount}
          label="Prospects"
        />
        <TabButton
          active={activeTab === 'trashed'}
          onClick={() => setActiveTab('trashed')}
          count={trashed.length}
          label="Trashed"
        />
      </div>

      {/* Filter Bar — only shown on All Jobs tab */}
      {activeTab === 'all' && (
        <Card variant="default" className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Search</label>
              <input
                type="text"
                placeholder="Search by company or job title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status} className="capitalize">
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">All Categories</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryMap.get(cat)?.name || cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Count */}
      <div className="mb-4 text-[12px] text-steel">
        {activeTab === 'all' && (search || statusFilter || categoryFilter)
          ? `Showing ${filteredApplications.length} of ${applications.length} applications`
          : activeTab === 'trashed'
          ? `${trashed.length} item${trashed.length !== 1 ? 's' : ''} in trash`
          : `${filteredApplications.length} ${activeTab === 'all' ? 'total' : activeTab === 'applied' ? 'applied' : 'prospect'} jobs`}
      </div>

      {/* Grid */}
      {activeTab === 'trashed' ? (
        trashed.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trashed.map((app) => (
              <div key={`${app.category}/${app.folder}`} className="bg-surface rounded-xl border border-hairline overflow-hidden">
                <div className="flex items-start">
                  <div className="w-1 shrink-0" style={{ backgroundColor: app.category_color || '#888888' }} />
                  <div className="flex-1 min-w-0 px-4 py-4">
                    <h3 className="text-[15px] font-semibold text-ink truncate">{app.company}</h3>
                    <p className="text-[13px] text-steel truncate mt-0.5">{app.job_title}</p>
                    {app.deleted_at && (
                      <p className="text-[12px] text-red-400 mt-2">
                        Deleted {new Date(app.deleted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleRestore(app.category, app.folder)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-hairline text-steel hover:text-ink hover:border-hairline-strong transition-all text-[12px] font-medium"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10"/>
                          <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                        </svg>
                        Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(app.category, app.folder)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all text-[12px] font-medium"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card variant="cream" className="text-center py-12">
            <p className="text-steel">Trash is empty. Deleted jobs will appear here for 30 days.</p>
          </Card>
        )
      ) : filteredApplications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApplications.map((app) => (
            <ApplicationCard
              key={`${app.category}/${app.folder}`}
              id={`${app.category}/${app.folder}`}
              company={app.company}
              job_title={app.job_title}
              category={app.category}
              category_name={app.category_name}
              category_color={app.category_color}
              status={app.status as StatusType}
              date_applied={app.date_applied}
              needs_followup={app.needs_followup}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onCategoryChange={handleCategoryChange}
              userCategories={userCategories}
              onManageClick={() => setShowManageCategories(true)}
            />
          ))}
        </div>
      ) : (
        <Card variant="cream" className="text-center py-12">
          <p className="text-steel">
            {activeTab === 'all'
              ? search || statusFilter || categoryFilter
                ? 'No applications match your filters.'
                : 'No job applications yet. Add your first job to get started!'
              : activeTab === 'applied'
              ? 'No applied jobs yet. Start applying to see them here!'
              : 'No prospects yet. Add some jobs to track here!'}
          </p>
        </Card>
      )}

      <ManageCategoriesModal
        isOpen={showManageCategories}
        onClose={() => setShowManageCategories(false)}
        onCategoriesChanged={fetchData}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  count,
  label,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium border-b-2 transition-colors duration-150 -mb-px',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-steel hover:text-ink',
      ].join(' ')}
    >
      {label}
      <span
        className={[
          'px-2 py-0.5 rounded-full text-[12px] font-semibold min-w-[24px] text-center',
          active ? 'bg-primary/10 text-primary' : 'bg-surface-elevated text-steel',
        ].join(' ')}
      >
        {count}
      </span>
    </button>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-xl text-steel">Loading...</div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <JobsContent />
    </Suspense>
  );
}
