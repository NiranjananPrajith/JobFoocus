'use client';

import { useEffect, useState } from 'react';
import ApplicationCard from '@/components/ApplicationCard';
import Card from '@/components/design/Card';
import { deleteApplication, getAllApplications, saveApplication, getUserCategories, type EnrichedApplication, type UserCategory } from '@/lib/storage-adapter';
import { StatusType } from '@/lib/design-system';

export default function FollowupsPage() {
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    async function fetchData() {
      try {
        const [apps, cats] = await Promise.all([getAllApplications(), getUserCategories()]);
        setApplications(apps);
        setUserCategories(cats);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const followupApplications = applications.filter((app) => app.needs_followup === true);

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
          <h1 className="text-[28px] md:text-[36px] font-medium text-ink mb-2">Follow-ups</h1>
          <p className="text-[14px] md:text-[16px] text-steel">
            Jobs that need follow-up
          </p>
        </div>
        <span className="bg-primary text-white px-3 py-1.5 rounded-full text-[14px] font-semibold self-start">
          {followupApplications.length}
        </span>
      </div>

      {followupApplications.length === 0 ? (
        <Card variant="cream" className="text-center py-12">
          <p className="text-steel">No follow-ups needed at this time.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {followupApplications.map((app) => (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}