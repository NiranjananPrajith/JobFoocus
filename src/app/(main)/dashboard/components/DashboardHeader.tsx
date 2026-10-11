'use client';
import NavigationIcon from '@/components/design/NavigationIcon';

export default function DashboardHeader({ onAddJob }: { onAddJob: () => void }) {
  return <div className="dashboard-heading"><div><span className="dashboard-overline">ONE STEP CLOSER</span><h1>Your job hunt, in focus.</h1><p>Keep every opportunity and its documents together.</p></div><button className="workspace-primary" type="button" onClick={onAddJob}><NavigationIcon name="plus" />Add job</button></div>;
}
