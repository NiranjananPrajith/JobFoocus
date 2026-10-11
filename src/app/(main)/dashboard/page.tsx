'use client';

import { useEffect, useState, useCallback } from 'react';
import AddJobModal from '@/components/AddJobModal';
import Link from 'next/link';
import NavigationIcon from '@/components/design/NavigationIcon';
import DashboardHeader from './components/DashboardHeader';
import KanbanBoard from './components/KanbanBoard';
import OnboardingCard from './components/OnboardingCard';
import DashboardSkeleton from './components/DashboardSkeleton';
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
  const [category, setCategory] = useState('all');
  const [followupsOnly, setFollowupsOnly] = useState(false);
  const [loadError, setLoadError] = useState('');
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
        setLoadError('Your applications could not be loaded. Please try again.');
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
      <DashboardSkeleton />
    );
  }


  if (loadError) return <div className="dashboard-pipeline" role="alert"><h1>Unable to load your workspace</h1><p className="mt-3 text-steel">{loadError}</p><button className="workspace-primary mt-5" onClick={() => window.location.reload()}>Try again</button></div>;

  const followupsCount = applications.filter(a => a.needs_followup).length;
  const sentCount = applications.filter(a => ['applied', 'interview', 'offer'].includes(a.status)).length;
  const interviewCount = applications.filter(a => a.status === 'interview').length;
  const categories = Array.from(new Set(applications.map(a => a.category))).sort();
  const filtered = applications.filter(a => (category === 'all' || a.category === category) && (!followupsOnly || a.needs_followup) && (!search.trim() || `${a.company} ${a.job_title}`.toLowerCase().includes(search.trim().toLowerCase())));
  const hasFilters = !!search || category !== 'all' || followupsOnly;
  const clearFilters = () => { setSearch(''); setCategory('all'); setFollowupsOnly(false); };

  return (
    <div className="dashboard-page">
      <DashboardHeader onAddJob={() => setShowAddJob(true)} />
      <section className="dashboard-overview" aria-label="Application overview">
        <div className="dashboard-stat"><span>Saved opportunities</span><strong>{applications.length}</strong><p>Across your job hunt</p></div>
        <div className="dashboard-stat"><span>Applications sent</span><strong>{sentCount}</strong><p>Applied, interview, or offer</p></div>
        <div className="dashboard-stat warm"><span>In conversation</span><strong>{interviewCount}</strong><p>At the interview stage</p></div>
        <div className="dashboard-attention"><span>FOLLOW-UPS</span><h2>{followupsCount ? `${followupsCount} ${followupsCount === 1 ? 'role needs' : 'roles need'} a check-in.` : 'You’re up to date.'}</h2><p>{followupsCount ? 'Review applications that need a follow-up.' : 'Applications that need a follow-up will appear here.'}</p>{followupsCount > 0 && <button type="button" onClick={() => { setSearch(''); setCategory('all'); setFollowupsOnly(true); document.getElementById('pipeline')?.scrollIntoView({ behavior: 'auto' }); }}>Show these applications →</button>}</div>
      </section>
      {applications.length === 0 ? <OnboardingCard hasMasterResume={hasMasterResume} onAddJob={() => setShowAddJob(true)} /> : (
        <section className="dashboard-pipeline" id="pipeline" aria-labelledby="pipeline-heading">
          <h2 className="pipeline-title" id="pipeline-heading">Your applications <span>{filtered.length}</span></h2><p className="pipeline-description">See where every role stands. Drag a card to update its status.</p>
          <div className="pipeline-toolbar">
            <label className="pipeline-search"><NavigationIcon name="search" /><input type="search" aria-label="Search company or job title" placeholder="Search company or job title" value={search} onChange={event => setSearch(event.target.value)} /></label>
            <label className="pipeline-category">Category<select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
            {hasFilters && <button className="pipeline-clear" type="button" onClick={clearFilters}>Clear filters</button>}
          </div>
          {followupsOnly && <p className="text-steel text-sm mb-4" role="status">Showing applications that need a follow-up.</p>}
          {filtered.length > 0 ? <KanbanBoard applications={filtered} search="" onStatusChange={handleStatusChange} onDelete={handleDelete} /> : <div className="text-center py-10"><h3 className="font-bold text-lg">No matching applications</h3><p className="text-sm text-steel mt-2">Try another company, title, or category.</p><button className="pipeline-clear mt-4" type="button" onClick={clearFilters}>Clear filters</button></div>}
        </section>
      )}
      {hasMasterResume && <section className="dashboard-resume"><NavigationIcon name="document" /><div><h2>Your master resume is ready.</h2><p>Use your experience to tailor documents for each new role.</p></div><Link href="/master-resume">Edit master resume →</Link></section>}
      <AddJobModal isOpen={showAddJob} onClose={() => setShowAddJob(false)} onJobAdded={() => { setShowAddJob(false); refreshData(); }} />
    </div>
  );
}
