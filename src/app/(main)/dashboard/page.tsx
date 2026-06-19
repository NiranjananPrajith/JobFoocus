'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AddJobModal from '@/components/AddJobModal';
import ManageCategoriesModal from '@/components/ManageCategoriesModal';
import DashboardGreeting from './components/DashboardGreeting';
import UsageCard from './components/UsageCard';
import PipelineTable from './components/PipelineTable';
import ApplicationDrawer from './components/ApplicationDrawer';
import FollowUpsCard from './components/FollowUpsCard';
import ThisWeekCard from './components/ThisWeekCard';
import OnboardingCard from './components/OnboardingCard';
import { getAllApplications, getUserCategories, saveApplication, deleteApplication, assignJobToCategory, type EnrichedApplication, type UserCategory } from '@/lib/storage-adapter';
import { bootstrapFromLocalStorage } from '@/lib/db/bootstrap';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddJob, setShowAddJob] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);

  // Drawer state
  const [selectedApp, setSelectedApp] = useState<EnrichedApplication | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const [apps, cats] = await Promise.all([
        getAllApplications(),
        getUserCategories(),
      ]);
      setApplications(apps);
      setUserCategories(cats);

      // If the drawer is open, refresh the selected app's data
      if (selectedApp) {
        const updated = apps.find(
          (a) => a.category === selectedApp.category && a.folder === selectedApp.folder
        );
        if (updated) setSelectedApp(updated);
      }
    } catch (error) {
      console.error('[dashboard] Error refreshing applications:', error);
    }
  }, [selectedApp]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [apps, cats] = await Promise.all([
          getAllApplications(),
          getUserCategories(),
        ]);
        setApplications(apps);
        setUserCategories(cats);
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
  }, []);

  const handleAddJob = () => setShowAddJob(true);

  const handleSelectApp = (app: EnrichedApplication) => {
    setSelectedApp(app);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedApp(null);
  };

  const handleSaveFromDrawer = async (id: string, updates: Partial<EnrichedApplication>) => {
    const parts = id.split('/');
    const category = parts[0];
    const folder = parts.slice(1).join('/');
    const app = applications.find((a) => `${a.category}/${a.folder}` === id);
    if (!app) return;

    // Handle category change separately
    if ('category_name' in updates && updates.category_name !== app.category_name) {
      try {
        await assignJobToCategory(app.category, folder, updates.category_name as string);
        await refreshData();
        return;
      } catch (error) {
        console.error('[dashboard] Error updating category:', error);
      }
    }

    // Full save — preserve all existing fields
    try {
      await saveApplication(category, folder, {
        ...app,
        ...updates,
        // Preserve response_date — never overwrite it on a status change
        response_date: app.response_date,
      });
      await refreshData();
    } catch (error) {
      console.error('[dashboard] Error saving application:', error);
    }
  };

  const handleDeleteFromDrawer = async (id: string) => {
    const parts = id.split('/');
    const category = parts[0];
    const folder = parts.slice(1).join('/');
    try {
      await deleteApplication(category, folder);
      setDrawerOpen(false);
      setSelectedApp(null);
      await refreshData();
    } catch (error) {
      console.error('[dashboard] Error deleting application:', error);
    }
  };

  const followUps = applications.filter((a) => a.needs_followup);
  const hasFirstJob = applications.length > 0;

  // Compute weekly stats for greeting subline
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const newJobsThisWeek = applications.filter(
    (a) => a.date_applied && new Date(a.date_applied) >= weekAgo
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[14px] text-muted">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Top section: Greeting + Usage */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <div className="flex-1 min-w-0">
          <DashboardGreeting
            userName={null}
            followUpCount={followUps.length}
            newJobsThisWeek={newJobsThisWeek}
            hasJobs={hasFirstJob}
            onAddJob={handleAddJob}
          />
          {!hasFirstJob && (
            <OnboardingCard
              hasMasterResume={false}
              hasFirstJob={false}
              onStartResume={() => router.push('/master-resume')}
              onAddJob={handleAddJob}
            />
          )}
        </div>
        <div className="w-full lg:w-[260px] shrink-0">
          <UsageCard
            tier="free"
            usedJobs={applications.length}
            usedEdits={0}
            limitJobs={5}
            limitEdits={25}
            resetAt={new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString()}
          />
        </div>
      </div>

      {/* Main pipeline list */}
      <div className="mb-8">
        <h2 className="text-[16px] font-semibold text-ink mb-4">
          All jobs
        </h2>
        <PipelineTable
          applications={applications}
          categories={userCategories}
          onSelect={handleSelectApp}
          onAddJob={handleAddJob}
        />
      </div>

      {/* Sidebar cards */}
      {(followUps.length > 0 || applications.length >= 5) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FollowUpsCard followUps={followUps} />
          <ThisWeekCard applications={applications} />
        </div>
      )}

      {/* Drawer */}
      <ApplicationDrawer
        application={selectedApp}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        onSave={handleSaveFromDrawer}
        onDelete={handleDeleteFromDrawer}
        userCategories={userCategories}
      />

      {/* Modals */}
      <AddJobModal isOpen={showAddJob} onClose={() => setShowAddJob(false)} />
      <ManageCategoriesModal
        isOpen={showManageCategories}
        onClose={() => setShowManageCategories(false)}
        onCategoriesChanged={refreshData}
      />
    </div>
  );
}
