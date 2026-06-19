'use client';

import Button from '@/components/design/Button';
import { getGreeting } from './helpers';

interface DashboardGreetingProps {
  userName: string | null;
  followUpCount: number;
  newJobsThisWeek: number;
  hasJobs: boolean;
  onAddJob: () => void;
}

export default function DashboardGreeting({ userName, followUpCount, newJobsThisWeek, hasJobs, onAddJob }: DashboardGreetingProps) {
  const name = userName?.split(' ')[0] || 'there';

  let subline = '';
  if (!hasJobs) subline = 'Add your first job to get started.';
  else if (followUpCount > 0) subline = `You have ${followUpCount} job${followUpCount !== 1 ? 's' : ''} to follow up on.`;
  else if (newJobsThisWeek > 0) subline = `${newJobsThisWeek} new job${newJobsThisWeek !== 1 ? 's' : ''} this week.`;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-[24px] sm:text-[28px] font-semibold text-ink leading-tight">
          {getGreeting()}, {name}
        </h1>
        {subline && (
          <p className="text-[14px] text-steel mt-1">
            {subline}
          </p>
        )}
      </div>
      <Button variant="primary" onClick={onAddJob} className="shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Job
      </Button>
    </div>
  );
}
