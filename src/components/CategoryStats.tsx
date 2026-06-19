'use client';

import React from 'react';
import Card from '@/components/design/Card';
import { type CategoryKey, type StatusKey } from '@/lib/storage-adapter';

interface CategoryStatsProps {
  stats: {
    category: string;
    category_key: CategoryKey;
    category_name: string;
    category_color: string;
    count: number;
    by_status: Record<StatusKey, number>;
  }[];
}

const CategoryStats = ({ stats }: CategoryStatsProps) => {
  if (stats.length === 0) {
    return (
      <Card variant="cream">
        <p className="text-sm text-steel">No categories yet. Categories will appear here once you add them.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((catStats) => {
        const byStatus: Partial<Record<StatusKey, number>> = catStats?.by_status ?? {};

        const total = catStats?.count || 0;
        const applied = byStatus.applied || 0;
        const prospects = byStatus.prospect || 0;
        const responses = byStatus.interview || 0;
        const interviews = byStatus.interview || 0;
        const offers = byStatus.offer || 0;

        return (
          <Card key={catStats.category_key} variant="cream" className="relative">
            {/* Category Header */}
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: catStats.category_color }}
              />
              <h3
                className="text-[14px] font-semibold leading-[20px]"
                style={{ color: catStats.category_color }}
              >
                {catStats.category_name}
              </h3>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-steel">Total</p>
                <p className="text-[20px] font-semibold leading-[24px] text-ink">
                  {total}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-steel">Applied</p>
                <p className="text-[20px] font-semibold leading-[24px] text-ink">
                  {applied}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-steel">Prospects</p>
                <p className="text-[20px] font-semibold leading-[24px] text-ink">
                  {prospects}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-steel">Responses</p>
                <p className="text-[20px] font-semibold leading-[24px] text-ink">
                  {responses}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-steel">Interviews</p>
                <p className="text-[20px] font-semibold leading-[24px] text-ink">
                  {interviews}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-steel">Offers</p>
                <p className="text-[20px] font-semibold leading-[24px] text-ink">
                  {offers}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default CategoryStats;