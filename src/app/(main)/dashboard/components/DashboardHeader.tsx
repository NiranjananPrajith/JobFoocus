'use client';

import React from 'react';
import { getGreeting } from './helpers';

interface DashboardHeaderProps {
  followupsCount: number;
  totalJobs: number;
  search: string;
  onSearchChange: (value: string) => void;
  onAddJob: () => void;
}

export default function DashboardHeader({
  followupsCount,
  totalJobs,
  search,
  onSearchChange,
  onAddJob,
}: DashboardHeaderProps) {
  return (
    <div className="mb-6">
      {/* Greeting + context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[24px] font-semibold text-ink">
            {getGreeting()}
          </h1>
          {totalJobs > 0 && (
            <p className="text-[13px] text-steel mt-0.5">
              {followupsCount > 0 && (
                <>
                  <span className="text-primary font-medium">{followupsCount} follow-up{followupsCount !== 1 ? 's' : ''}</span>
                  {' · '}
                </>
              )}
              {totalJobs} job{totalJobs !== 1 ? 's' : ''} in pipeline
            </p>
          )}
        </div>

        <button
          onClick={onAddJob}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium rounded-lg bg-surface-code text-ink hover:brightness-125 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Job
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-steel pointer-events-none"
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search by company or title..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-[14px] rounded-lg border border-hairline bg-card text-ink placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-ink transition-colors"
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
