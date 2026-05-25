'use client';

import { useEffect, useState } from 'react';
import ApplicationCard from '@/components/ApplicationCard';
import Card from '@/components/design/Card';
import { getAllApplications, type EnrichedApplication } from '@/lib/storage-adapter';

export default function AppliedPage() {
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);

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

  const appliedApplications = applications.filter((app) => app.status !== 'prospect');

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
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] md:text-[36px] font-medium text-ink mb-2">Applied Jobs</h1>
          <p className="text-[14px] md:text-[16px] text-steel">
            Jobs you have applied to
          </p>
        </div>
        <span className="bg-primary text-white px-3 py-1.5 rounded-full text-[14px] font-semibold self-start">
          {appliedApplications.length}
        </span>
      </div>

      {appliedApplications.length === 0 ? (
        <Card variant="cream" className="text-center py-12">
          <p className="text-steel">No applied jobs yet. Start applying to see them here!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appliedApplications.map((app) => (
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
      )}
    </div>
  );
}