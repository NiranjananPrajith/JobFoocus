'use client';

import { useEffect, useState, useCallback } from 'react';
import AddJobModal from '@/components/AddJobModal';
import ManageCategoriesModal from '@/components/ManageCategoriesModal';
import DashboardHeader from './components/DashboardHeader';
import KanbanBoard from './components/KanbanBoard';
import OnboardingCard from './components/OnboardingCard';
import LoadingScreen from '@/components/LoadingScreen';
import {
  getAllApplications,
  deleteApplication,
  updateApplicationStatus,
  getMasterResume,
  type EnrichedApplication,
  type StatusKey,
} from '@/lib/storage-adapter';

export default function DashboardPage() {
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddJob, setShowAddJob] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [hasMasterResume, setHasMasterResume] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const apps = await getAllApplications();
      setApplications(apps);
    } catch (error) {
      console.error('[dashboard] Error refreshing applications:', error);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [apps, resume] = await Promise.all([
          getAllApplications(),
          getMasterResume(),
        ]);
        setApplications(apps);
        setHasMasterResume(!!resume && (typeof resume !== 'object' || Object.keys(resume).length > 0));
      } catch (error) {
        console.error('[dashboard] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleStatusChange = useCallback(
    async (category: string, folder: string, newStatus: StatusKey) => {
      // Optimistic update
      const key = `${category}/${folder}`;
      setApplications((prev) =>
        prev.map((app) =>
          `${app.category}/${app.folder}` === key
            ? { ...app, status: newStatus }
            : app
        )
      );
      try {
        await updateApplicationStatus(category, folder, newStatus);
        // Reconcile with server
        await refreshData();
      } catch (error) {
        console.error('[dashboard] Error updating status:', error);
        // Revert optimistic update
        await refreshData();
      }
    },
    [refreshData]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const parts = id.split('/');
      const category = parts[0];
      const folder = parts.slice(1).join('/');
      try {
        await deleteApplication(category, folder);
        setApplications((prev) =>
          prev.filter((app) => `${app.category}/${app.folder}` !== id)
        );
      } catch (error) {
        console.error('[dashboard] Error deleting application:', error);
      }
    },
    []
  );

  if (loading) {
    return (
      <LoadingScreen messages={['Fetching your saved jobs...', 'Arranging your kanban board...', 'Sorting follow-ups...', 'Almost there...']} />
    );
  }

  const followupsCount = applications.filter((a) => a.needs_followup).length;
  const isEmpty = applications.length === 0;

  return (
    <div className="min-h-screen pb-12">
      <DashboardHeader
        followupsCount={followupsCount}
        totalJobs={applications.length}
        search={search}
        onSearchChange={setSearch}
        onAddJob={() => setShowAddJob(true)}
      />

      {isEmpty ? (
        <OnboardingCard
          hasMasterResume={hasMasterResume}
          onAddJob={() => setShowAddJob(true)}
        />
      ) : (
        <KanbanBoard
          applications={applications}
          search={search}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      <AddJobModal
        isOpen={showAddJob}
        onClose={() => setShowAddJob(false)}
        onJobAdded={() => {
          setShowAddJob(false);
          refreshData();
        }}
      />

      <ManageCategoriesModal
        isOpen={showManageCategories}
        onClose={() => setShowManageCategories(false)}
        onCategoriesChanged={refreshData}
      />
    </div>
  );
}
