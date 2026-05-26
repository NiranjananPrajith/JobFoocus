'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ApplicationCard from '@/components/ApplicationCard';
import Card from '@/components/design/Card';
import { getAllApplications, type EnrichedApplication } from '@/lib/storage-adapter';
import { StatusType } from '@/lib/design-system';

type Tab = 'all' | 'applied' | 'prospects';

const STATUS_OPTIONS: StatusType[] = ['prospect', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'];

const inputClass =
  'w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11';

const labelClass = 'block text-[11px] uppercase tracking-wide text-steel mb-2';

function JobsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'all';

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state (only meaningful when activeTab === 'all')
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const apps = await getAllApplications();
        setApplications(apps);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
          : `${filteredApplications.length} ${activeTab === 'all' ? 'total' : activeTab === 'applied' ? 'applied' : 'prospect'} jobs`}
      </div>

      {/* Grid */}
      {filteredApplications.length > 0 ? (
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
          active ? 'bg-primary/10 text-primary' : 'bg-stone-100 text-steel',
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
