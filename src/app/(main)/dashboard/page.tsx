'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import ApplicationCard from '@/components/ApplicationCard';
import Badge from '@/components/design/Badge';
import Card from '@/components/design/Card';
import CategoryStats from '@/components/CategoryStats';
import DataManagement from '@/components/DataManagement';
import { deleteApplication, getAllApplications, getCategoryStats, saveApplication, type EnrichedApplication, type CategoryStats as CategoryStatsType } from '@/lib/storage-adapter';
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

export default function DashboardPage() {
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStatsType[]>([]);
  const [loading, setLoading] = useState(true);

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
      console.error('Error refreshing applications:', error);
    }
  }, [computeStats]);

  useEffect(() => {
    async function fetchData() {
      try {
        const apps = await getAllApplications();
        const catStats = await getCategoryStats(apps);
        setApplications(apps);
        setCategoryStats(catStats);
        setStats(computeStats(apps));
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [computeStats]);

  const recentApplications = [...applications]
    .sort((a, b) => {
      const dateA = a.response_date || a.date_applied;
      const dateB = b.response_date || b.date_applied;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })
    .slice(0, 10);

  const handleDelete = async (id: string) => {
    const parts = id.split('/');
    const category = parts[0];
    const folder = parts.slice(1).join('/');
    try {
      await deleteApplication(category, folder);
      await refreshData();
    } catch (error) {
      console.error('Error deleting application:', error);
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
      console.error('Error updating application:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-xl text-steel">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <h1
          className="text-[28px] md:text-[36px] font-medium text-ink mb-2"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          Dashboard
        </h1>
        <p className="text-[14px] md:text-[16px] text-steel">
          Track your job applications and progress
        </p>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3 mb-6 md:mb-8">
          <Card variant="default">
            <div className="text-[32px] font-semibold text-ink">{stats.total_jobs}</div>
            <div className="text-[11px] uppercase tracking-wide text-steel mt-1">Total Jobs</div>
          </Card>
          <Card variant="default">
            <div className="text-[32px] font-semibold text-ink">{stats.total_applied}</div>
            <div className="text-[11px] uppercase tracking-wide text-steel mt-1">Applied</div>
          </Card>
          <Card variant="default">
            <div className="text-[32px] font-semibold text-ink">{stats.total_prospects}</div>
            <div className="text-[11px] uppercase tracking-wide text-steel mt-1">Prospects</div>
          </Card>
          <Card variant="default">
            <div className="text-[32px] font-semibold text-ink">{stats.total_responses}</div>
            <div className="text-[11px] uppercase tracking-wide text-steel mt-1">Responses</div>
          </Card>
          <Card variant="default">
            <div className="text-[32px] font-semibold text-ink">{stats.total_interviews}</div>
            <div className="text-[11px] uppercase tracking-wide text-steel mt-1">Interviews</div>
          </Card>
          <Card variant="default">
            <div className="text-[32px] font-semibold text-ink">{stats.total_offers}</div>
            <div className="text-[11px] uppercase tracking-wide text-steel mt-1">Offers</div>
          </Card>
          <Card variant="default">
            <div className="text-[32px] font-semibold text-primary">{stats.response_rate}%</div>
            <div className="text-[11px] uppercase tracking-wide text-steel mt-1">Response Rate</div>
          </Card>
        </div>
      )}

      {/* Category Stats */}
      {categoryStats.length > 0 && (
        <div className="mb-6 md:mb-8">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.05em] text-steel mb-4">By Category</h2>
          <CategoryStats stats={categoryStats} />
        </div>
      )}

      {/* Recent Activity */}
      {recentApplications.length > 0 && (
        <div className="mb-6 md:mb-8">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.05em] text-steel mb-4">Recent Activity</h2>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <Card variant="default" className="min-w-[500px]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline-soft">
                    <th className="text-left p-3 text-[11px] font-semibold text-steel uppercase tracking-wide">Company</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-steel uppercase tracking-wide hidden sm:table-cell">Job Title</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-steel uppercase tracking-wide">Status</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-steel uppercase tracking-wide hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApplications.map((app, idx) => (
                    <tr key={idx} className="border-b border-hairline-soft last:border-b-0">
                      <td className="p-3 text-[14px] text-ink whitespace-nowrap">{app.company}</td>
                      <td className="p-3 text-[14px] text-steel whitespace-nowrap hidden sm:table-cell">{app.job_title}</td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge status={app.status as any} />
                      </td>
                      <td className="p-3 text-[12px] text-steel font-mono whitespace-nowrap hidden md:table-cell">
                        {app.response_date || app.date_applied}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {/* Grouped Applications by Status */}
      <div className="space-y-8">
        {['prospect', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'].map((status) => {
          const filteredApps = applications.filter((app) => app.status === status);
          if (filteredApps.length === 0) return null;

          return (
            <div key={status}>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.05em] text-steel mb-4 capitalize">
                {status.replace('_', ' ')} ({filteredApps.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredApps.map((app) => (
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
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Data Management */}
      <Card variant="elevated" className="p-6 mt-12">
        <DataManagement />
      </Card>
    </div>
  );
}
