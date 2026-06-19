'use client';

import Card from '@/components/design/Card';
import type { EnrichedApplication } from '@/lib/storage-adapter';

interface ThisWeekCardProps {
  applications: EnrichedApplication[];
}

export default function ThisWeekCard({ applications }: ThisWeekCardProps) {
  if (applications.length < 5) return null;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const appliedThisWeek = applications.filter(a => {
    if (!a.date_applied) return false;
    return new Date(a.date_applied) >= weekAgo;
  }).length;

  const responsesThisWeek = applications.filter(a => {
    if (!a.response_date) return false;
    return new Date(a.response_date) >= weekAgo;
  }).length;

  const totalApplied = applications.filter(a => a.status !== 'prospect').length;
  const totalResponses = applications.filter(a => a.response_date).length;
  const responseRate = totalApplied > 0 ? Math.round((totalResponses / totalApplied) * 100) : 0;

  return (
    <Card variant="elevated" className="p-4">
      <h3 className="text-[13px] font-semibold text-ink mb-3">
        This week
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-steel">Applied</span>
          <span className="text-[13px] font-medium text-ink">{appliedThisWeek}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-steel">Responses</span>
          <span className="text-[13px] font-medium text-ink">{responsesThisWeek}</span>
        </div>
        <div className="flex items-center justify-between border-t border-hairline-soft pt-2 mt-2">
          <span className="text-[13px] text-steel">Response rate</span>
          <span className="text-[13px] font-semibold text-primary">{responseRate}%</span>
        </div>
      </div>
    </Card>
  );
}
