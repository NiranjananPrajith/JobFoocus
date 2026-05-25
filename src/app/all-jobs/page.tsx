'use client';

import { useEffect, useState } from 'react';
import ApplicationCard from '@/components/ApplicationCard';
import Card from '@/components/design/Card';
import { getAllApplications, type EnrichedApplication } from '@/lib/storage-adapter';

const STATUS_OPTIONS = ['prospect', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'];
const CATEGORY_OPTIONS = ['1_tech_support', '2_general_basic', '3_kitchen_cook'];
const CATEGORY_LABELS: Record<string, string> = {
  '1_tech_support': 'Tech Support',
  '2_general_basic': 'General',
  '3_kitchen_cook': 'Kitchen',
};

export default function AllJobsPage() {
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);
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

  const filteredApplications = applications.filter((app) => {
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
        <h1 className="text-[28px] md:text-[36px] font-medium text-ink mb-2">All Jobs</h1>
        <p className="text-[14px] md:text-[16px] text-steel">
          Browse and filter all your job applications
        </p>
      </div>

      {/* Filters */}
      <Card variant="default" className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by company or job title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status} className="capitalize">{status.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11"
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Count */}
      <div className="mb-4 text-[12px] text-steel">
        Showing {filteredApplications.length} of {applications.length} applications
      </div>

      {/* Applications Grid */}
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
            status={app.status as any}
            date_applied={app.date_applied}
            needs_followup={app.needs_followup}
          />
        ))}
      </div>

      {filteredApplications.length === 0 && (
        <Card variant="cream" className="text-center py-12">
          <p className="text-steel">No applications found matching your filters.</p>
        </Card>
      )}
    </div>
  );
}