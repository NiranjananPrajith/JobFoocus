'use client';

import { useEffect, useState, useCallback } from 'react';
import ApplicationCard from '@/components/ApplicationCard';
import Badge from '@/components/design/Badge';
import Card from '@/components/design/Card';
import ManageCategoriesModal from '@/components/ManageCategoriesModal';
import DataManagement from '@/components/DataManagement';
import { deleteApplication, getAllApplications, getCategoryStats, getUserCategories, saveApplication, type EnrichedApplication, type CategoryStats as CategoryStatsType, type UserCategory } from '@/lib/storage-adapter';
import { bootstrapFromLocalStorage } from '@/lib/db/bootstrap';
import { createClient } from '@/lib/supabase/client';
import { StatusType } from '@/lib/design-system';

interface Stats {
  total_jobs: number;
  total_applied: number;
  total_prospects: number;
  total_responses: number;
  total_interviews: number;
  total_offers: number;
  response_rate: number;
}

const TABS = ['prospect', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'] as const;

export default function DashboardPage() {
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStatsType[]>([]);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('prospect');

  const computeStats = useCallback((apps: EnrichedApplication[]) => {
    const total_jobs = apps.length;
    const total_applied = apps.filter(a => a.status === 'applied').length;
    const total_prospects = apps.filter(a => a.status === 'prospect').length;
    const total_responses = apps.filter(a => a.response_date).length;
    const total_interviews = apps.filter(a => a.status === 'interview').length;
    const total_offers = apps.filter(a => a.status === 'offer').length;
    const response_rate = total_applied > 0 ? Math.round((total_responses / total_applied) * 100) : 0;
    return { total_jobs, total_applied, total_prospects, total_responses, total_interviews, total_offers, response_rate };
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const apps = await getAllApplications();
      const catStats = await getCategoryStats(apps);
      setApplications(apps);
      setCategoryStats(catStats);
      setStats(computeStats(apps));
    } catch (error) {
      console.error('[dashboard] Error refreshing applications:', error);
    }
  }, [computeStats]);

  useEffect(() => {
    async function fetchData() {
      try {
        const apps = await getAllApplications();
        const catStats = await getCategoryStats(apps);
        const cats = await getUserCategories();
        setApplications(apps);
        setCategoryStats(catStats);
        setUserCategories(cats);
        setStats(computeStats(apps));
      } catch (error) {
        console.error('[dashboard] Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    }
    async function migrateIfNeeded() {
      if (typeof localStorage === 'undefined') return;
      if (localStorage.getItem('_jf_migrated')) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { migrated } = await bootstrapFromLocalStorage(user.id);
      if (migrated > 0) window.location.reload();
    }
    fetchData();
    migrateIfNeeded();
  }, [computeStats]);

  const recentApplications = [...applications]
    .sort((a, b) => {
      const dateA = a.response_date || a.date_applied;
      const dateB = b.response_date || b.date_applied;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })
    .slice(0, 5);

  const handleDelete = async (id: string) => {
    const parts = id.split('/');
    const category = parts[0];
    const folder = parts.slice(1).join('/');
    try {
      await deleteApplication(category, folder);
      await refreshData();
    } catch (error) {
      console.error('[dashboard] Error deleting application:', error);
    }
  };

  const handleStatusChange = async (id: string, status: StatusType) => {
    const parts = id.split('/');
    const category = parts[0];
    const folder = parts.slice(1).join('/');
    const app = applications.find((a) => `${a.category}/${a.folder}` === id);
    if (!app) return;
    try {
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
      await refreshData();
    } catch (error) {
      console.error('[dashboard] Error updating application:', error);
    }
  };

  const handleCategoryChange = async (id: string, newCategory: string) => {
    const parts = id.split('/');
    const oldCategory = parts[0];
    const folder = parts.slice(1).join('/');
    try {
      const { assignJobToCategory } = await import('@/lib/storage-adapter');
      await assignJobToCategory(oldCategory, folder, newCategory);
      await refreshData();
    } catch (error) {
      console.error('[dashboard] Error updating category:', error);
    }
  };

  const filteredPipelineApps = applications.filter((app) => app.status === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[16px] text-steel">Loading your frontier...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* ── 1. Editorial Hero ────────────────────────────────── */}
      <div className="mb-12 mt-4 md:mt-8">
        <h1
          className="text-[52px] md:text-[64px] leading-[1.10] tracking-[-1px] mb-3"
          style={{
            fontFamily: '"PP Editorial Old", "Times New Roman", Georgia, serif',
            color: 'var(--ink)',
          }}
        >
          Your Career Frontier.
        </h1>
        <p
          className="text-[18px] leading-[1.50] max-w-2xl"
          style={{ color: 'var(--steel)' }}
        >
          Track your trajectory, analyze response rates, and orchestrate your next major career maneuver.
        </p>
      </div>

      {/* ── 2. Asymmetrical Bento Stats Grid ────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-16">
          {/* Hero Stat: Response Rate */}
          <Card
            variant="elevated"
            className="md:col-span-2 lg:col-span-2 row-span-2 flex flex-col justify-center border-t-4 border-t-primary"
          >
            <div className="text-[11px] uppercase tracking-[1px] font-semibold mb-2" style={{ color: 'var(--steel)' }}>
              Conversion Rate
            </div>
            <div
              className="text-[64px] md:text-[84px] leading-[1.05] tracking-[-1.5px]"
              style={{
                fontFamily: '"PP Editorial Old", "Times New Roman", Georgia, serif',
                color: 'var(--primary)',
              }}
            >
              {stats.response_rate}%
            </div>
            <div className="text-[14px] mt-2" style={{ color: 'var(--steel)' }}>
              Based on {stats.total_responses} responses from {stats.total_applied} applied jobs.
            </div>
          </Card>

          {/* Total Pipeline */}
          <Card variant="default" className="lg:col-span-2 flex flex-col justify-between">
            <div className="text-[11px] uppercase tracking-[1px] font-semibold mb-1" style={{ color: 'var(--steel)' }}>
              Total Pipeline
            </div>
            <div
              className="text-[42px] leading-[1.10] tracking-[-0.5px]"
              style={{
                fontFamily: '"PP Editorial Old", "Times New Roman", Georgia, serif',
                color: 'var(--ink)',
              }}
            >
              {stats.total_jobs}
            </div>
          </Card>

          {/* Interviews */}
          <Card variant="default" className="lg:col-span-1 flex flex-col justify-between">
            <div className="text-[11px] uppercase tracking-[1px] font-semibold mb-1" style={{ color: 'var(--steel)' }}>
              Interviews
            </div>
            <div
              className="text-[42px] leading-[1.10]"
              style={{
                fontFamily: '"PP Editorial Old", "Times New Roman", Georgia, serif',
                color: 'var(--ink)',
              }}
            >
              {stats.total_interviews}
            </div>
          </Card>

          {/* Offers */}
          <Card variant="default" className="lg:col-span-1 flex flex-col justify-between">
            <div className="text-[11px] uppercase tracking-[1px] font-semibold mb-1" style={{ color: 'var(--steel)' }}>
              Offers
            </div>
            <div
              className="text-[42px] leading-[1.10]"
              style={{
                fontFamily: '"PP Editorial Old", "Times New Roman", Georgia, serif',
                color: 'var(--ink)',
              }}
            >
              {stats.total_offers}
            </div>
          </Card>

          {/* Category Breakdown */}
          <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {categoryStats.length > 0 ? (
              categoryStats.map((cat) => (
                <Card key={cat.category} variant="cream" className="flex flex-col justify-between py-5">
                  <div
                    className="text-[11px] uppercase tracking-[1px] font-semibold mb-1 truncate"
                    style={{ color: 'var(--ink)' }}
                  >
                    {cat.category_name}
                  </div>
                  <div
                    className="text-[36px] leading-[1.10]"
                    style={{
                      fontFamily: '"PP Editorial Old", "Times New Roman", Georgia, serif',
                      color: 'var(--ink)',
                    }}
                  >
                    {cat.count}
                  </div>
                </Card>
              ))
            ) : (
              <>
                <Card variant="cream" className="flex flex-col justify-between py-5">
                  <div className="text-[11px] uppercase tracking-[1px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                    Uncategorized
                  </div>
                  <div
                    className="text-[36px] leading-[1.10]"
                    style={{
                      fontFamily: '"PP Editorial Old", "Times New Roman", Georgia, serif',
                      color: 'var(--ink)',
                    }}
                  >
                    {stats.total_jobs}
                  </div>
                </Card>
                <Card variant="cream" className="flex flex-col justify-between py-5 opacity-40">
                  <div className="text-[11px] uppercase tracking-[1px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                    &nbsp;
                  </div>
                  <div className="text-[36px] leading-[1.10]" style={{ color: 'var(--ink)' }}>—</div>
                </Card>
                <Card variant="cream" className="flex flex-col justify-between py-5 opacity-40">
                  <div className="text-[11px] uppercase tracking-[1px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                    &nbsp;
                  </div>
                  <div className="text-[36px] leading-[1.10]" style={{ color: 'var(--ink)' }}>—</div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 3. Magazine-Style Ledger (Recent Activity) ──────── */}
      {recentApplications.length > 0 && (
        <div className="mb-16">
          <h2
            className="text-[18px] font-medium mb-6 pb-2"
            style={{
              color: 'var(--ink)',
              borderBottom: '1px solid var(--hairline-soft)',
            }}
          >
            Recent Activity
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--hairline-strong)' }}>
                  <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: 'var(--steel)' }}>
                    Company
                  </th>
                  <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[1px] hidden sm:table-cell" style={{ color: 'var(--steel)' }}>
                    Job Title
                  </th>
                  <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: 'var(--steel)' }}>
                    Status
                  </th>
                  <th className="py-3 text-[11px] font-semibold uppercase tracking-[1px] text-right hidden md:table-cell" style={{ color: 'var(--steel)' }}>
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((app, idx) => (
                  <tr
                    key={idx}
                    className="border-b transition-colors"
                    style={{
                      borderColor: 'var(--hairline-soft)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                    }}
                  >
                    <td className="py-4 pr-4">
                      <a
                        href={`/application?app=${encodeURIComponent(app.category + '/' + app.folder)}`}
                        className="text-[14px] font-medium transition-colors"
                        style={{ color: 'var(--ink)' }}
                      >
                        {app.company}
                      </a>
                    </td>
                    <td className="py-4 pr-4 text-[14px] hidden sm:table-cell" style={{ color: 'var(--steel)' }}>
                      {app.job_title}
                    </td>
                    <td className="py-4 pr-4">
                      <Badge status={app.status as any} />
                    </td>
                    <td className="py-4 text-[13px] text-right hidden md:table-cell" style={{ color: 'var(--steel)' }}>
                      {app.response_date || app.date_applied}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. Segmented Pipeline Tabs ──────────────────────── */}
      <div className="mb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-0 border-b" style={{ borderColor: 'var(--hairline-soft)' }}>
          <h2 className="text-[18px] font-medium" style={{ color: 'var(--ink)' }}>
            Active Pipeline
          </h2>

          {/* Mistral-style segmented tabs */}
          <div className="flex overflow-x-auto hide-scrollbar gap-2">
            {TABS.map((status) => {
              const count = applications.filter(a => a.status === status).length;
              const isActive = activeTab === status;
              return (
                <button
                  key={status}
                  onClick={() => setActiveTab(status)}
                  className="whitespace-nowrap px-4 py-2 text-[14px] font-medium transition-all border-b-2 -mb-[1px]"
                  style={{
                    borderColor: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--steel)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--ink)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--steel)'
                  }}
                >
                  {status.replace('_', ' ')} <span className="text-[12px] opacity-70 ml-1">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        {filteredPipelineApps.length === 0 ? (
          <div
            className="text-center py-16 rounded-lg"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--hairline-soft)',
            }}
          >
            <p className="text-[14px]" style={{ color: 'var(--steel)' }}>
              No applications currently in{' '}
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                {activeTab.replace('_', ' ')}
              </span>{' '}
              status.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPipelineApps.map((app) => (
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
        )}
      </div>

      {/* ── 5. Closing CTA ──────────────────────────────────── */}
      <Card variant="cream" className="flex flex-col items-center text-center py-12 px-4 mb-8">
        <h2
          className="text-[36px] leading-[1.15] tracking-[-0.5px] mb-4"
          style={{
            fontFamily: '"PP Editorial Old", "Times New Roman", Georgia, serif',
            color: 'var(--ink)',
          }}
        >
          The next chapter of your career is yours.
        </h2>
        <p
          className="text-[16px] mb-8 max-w-lg"
          style={{ color: 'var(--charcoal)' }}
        >
          Keep the momentum going. Expand your frontier by adding your next prospective role.
        </p>
        <div className="flex gap-4">
          <a
            href="/application"
            className="inline-flex items-center px-5 py-2.5 text-[14px] font-medium rounded-md text-white transition-colors"
            style={{ backgroundColor: 'var(--ink)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ink-tint)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--ink)')}
          >
            Add New Job
          </a>
          <a
            href="/jobs"
            className="inline-flex items-center px-5 py-2.5 text-[14px] font-medium rounded-md transition-colors"
            style={{
              color: 'var(--ink)',
              border: '1px solid var(--hairline-strong)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            View All History
          </a>
        </div>
      </Card>

      {/* ── 6. Data Management ──────────────────────────────── */}
      <Card variant="elevated" className="p-6">
        <DataManagement />
      </Card>

      {/* Manage Categories Modal */}
      <ManageCategoriesModal
        isOpen={showManageCategories}
        onClose={() => setShowManageCategories(false)}
        onCategoriesChanged={refreshData}
      />
    </div>
  );
}
