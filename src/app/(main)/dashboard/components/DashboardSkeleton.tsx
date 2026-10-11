const lanes = ['Prospect', 'Applied', 'Interview', 'Offer', 'Rejected'];

/** Reserve the actual dashboard layout without displaying invented counts or jobs. */
export default function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading your applications…</span>
      <div aria-hidden="true">
        <div className="dashboard-heading"><div><span className="dashboard-overline">YOUR WORKSPACE</span><h1>Your job hunt, in focus.</h1><p>Loading your applications…</p></div><span className="skeleton-block skeleton-button" /></div>
        <div className="dashboard-overview">{[0, 1, 2].map(index => <div className="dashboard-stat" key={index}><span className="skeleton-block skeleton-label" /><span className="skeleton-block skeleton-number" /><span className="skeleton-block skeleton-caption" /></div>)}<div className="dashboard-attention"><span className="skeleton-block skeleton-label" /><span className="skeleton-block skeleton-line" /><span className="skeleton-block skeleton-caption" /></div></div>
        <div className="dashboard-pipeline"><h2 className="pipeline-title">Your applications</h2><div className="pipeline-toolbar"><span className="skeleton-block skeleton-search" /><span className="skeleton-block skeleton-select" /></div><div className="dashboard-loading-board">{lanes.map((lane, index) => <div className="skeleton-lane" key={lane}><h3>{lane}</h3>{Array.from({ length: index < 2 ? 2 : 1 }, (_, card) => <div className="skeleton-job" key={card}><div className="skeleton-company"><span className="skeleton-block skeleton-avatar" /><span className="skeleton-block skeleton-label" /></div><span className="skeleton-block skeleton-line" /><span className="skeleton-block skeleton-caption" /><span className="skeleton-block skeleton-documents" /></div>)}</div>)}</div></div>
      </div>
    </div>
  );
}
