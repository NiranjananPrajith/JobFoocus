'use client';

import Card from '@/components/design/Card';
import type { EnrichedApplication } from '@/lib/storage-adapter';
import { formatApplicationDate } from './helpers';

interface FollowUpsCardProps {
  followUps: EnrichedApplication[];
}

export default function FollowUpsCard({ followUps }: FollowUpsCardProps) {
  if (followUps.length === 0) return null;

  const showCount = Math.min(followUps.length, 5);

  return (
    <Card variant="elevated" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-ink">
          Follow-ups needed
        </h3>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold">
          {followUps.length}
        </span>
      </div>
      <div className="space-y-2">
        {followUps.slice(0, showCount).map((app) => {
          const { relative } = formatApplicationDate(app);
          return (
            <div
              key={`${app.category}/${app.folder}`}
              className="flex items-center justify-between py-1.5 border-b border-hairline-soft last:border-0"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">
                  {app.company}
                </p>
                <p className="text-[12px] text-steel truncate">
                  {app.job_title}
                </p>
              </div>
              <span className="text-[11px] text-muted shrink-0 ml-2">
                {relative}
              </span>
            </div>
          );
        })}
      </div>
      {followUps.length > 5 && (
        <a
          href="/followups"
          className="block text-center text-[12px] font-medium text-primary mt-3 hover:underline"
        >
          View all {followUps.length} →
        </a>
      )}
    </Card>
  );
}
