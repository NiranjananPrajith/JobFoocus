'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllApplications, type EnrichedApplication } from '@/lib/storage-adapter';
import { statusLabels } from '@/lib/design-system';
import LoadingScreen from '@/components/LoadingScreen';
import NavigationIcon from '@/components/design/NavigationIcon';

export default function JobsPage() {
  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    let alive = true;
    getAllApplications().then(apps => { if (alive) setApplications(apps); }).catch(() => { if (alive) setError('Your saved jobs could not be loaded. Please try again.'); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  if (loading) return <LoadingScreen messages={['Loading your saved jobs...']} />;
  const filtered = applications.filter(app => `${app.company} ${app.job_title}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div><div className="dashboard-heading"><div><span className="dashboard-overline">EVERY OPPORTUNITY</span><h1>All Jobs</h1><p>Find your saved roles and open their application details.</p></div><Link className="workspace-primary" href="/application"><NavigationIcon name="plus" />Add job</Link></div><section className="dashboard-pipeline"><label className="pipeline-search mb-6"><NavigationIcon name="search" /><input type="search" placeholder="Search company or job title" aria-label="Search saved jobs" value={search} onChange={event => setSearch(event.target.value)} /></label>{error ? <div role="alert"><p>{error}</p><button className="pipeline-clear mt-4" onClick={() => window.location.reload()}>Try again</button></div> : filtered.length ? <div className="all-jobs-list">{filtered.map(app => <Link className="all-job-row" key={`${app.category}/${app.folder}`} href={`/application?app=${encodeURIComponent(`${app.category}/${app.folder}`)}`}><span className="kanban-company-mark" aria-hidden="true">{app.company[0]?.toUpperCase()}</span><div><h2>{app.job_title}</h2><p>{app.company} · {app.category_name}</p></div><span className="all-job-status">{statusLabels[app.status]}</span><span className="all-job-docs">{app.has_resume && app.has_cover_letter ? 'Resume + cover letter' : app.has_resume ? 'Resume' : app.has_cover_letter ? 'Cover letter' : 'No documents yet'}</span><span aria-hidden="true">→</span></Link>)}</div> : <div className="text-center py-10"><h2 className="text-xl font-bold">{applications.length ? 'No matching jobs' : 'Your next opportunity starts here.'}</h2><p className="text-steel mt-2 text-sm">{applications.length ? 'Try another company or title.' : 'Save a role to begin preparing your application.'}</p>{applications.length > 0 && <button className="pipeline-clear mt-4" onClick={() => setSearch('')}>Clear search</button>}</div>}</section></div>;
}
