'use client';

import React from 'react';
import Badge from './design/Badge';
import { StatusType } from '@/lib/design-system';

const STATUS_OPTIONS: StatusType[] = ['prospect', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'];

interface ApplicationCardProps {
  id: string;
  company: string;
  job_title: string;
  category: string;
  category_name: string;
  category_color: string;
  status: StatusType;
  date_applied?: string;
  needs_followup?: boolean;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: StatusType) => void;
}

export default function ApplicationCard({
  id,
  company,
  job_title,
  category,
  category_name,
  category_color,
  status,
  date_applied,
  needs_followup,
  onDelete,
  onStatusChange,
}: ApplicationCardProps) {
  const daysSinceApplied = date_applied
    ? Math.floor(
        (Date.now() - new Date(date_applied).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) onDelete(id);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onStatusChange) onStatusChange(id, e.target.value as StatusType);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(date_applied!);
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const daysAgo = daysSinceApplied !== null ? `${daysSinceApplied}d ago` : null;
    return { formatted, daysAgo };
  };

  return (
    <a href={`/application?app=${id}`} className="block group">
      <div
        className="bg-white rounded-xl border border-hairline-soft overflow-hidden transition-all duration-200 group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] group-hover:border-hairline-strong"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        {/* Left category accent bar */}
        <div className="flex">
          <div
            className="w-1 shrink-0"
            style={{ backgroundColor: category_color || '#888888' }}
          />

          <div className="flex-1 min-w-0">
            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-[16px] font-semibold text-ink leading-tight truncate group-hover:text-primary transition-colors">
                  {company}
                </h3>
                <p className="text-[13px] text-steel leading-snug mt-0.5 truncate">
                  {job_title}
                </p>
              </div>
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-steel hover:text-red-500 hover:bg-red-50 transition-colors duration-150 opacity-0 group-hover:opacity-100"
                  aria-label="Delete application"
                  title="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              )}
            </div>

            {/* ── Body: Badges ── */}
            <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5"
                style={{
                  backgroundColor: category_color ? `${category_color}18` : '#f5f5f5',
                  color: category_color || '#6a6a6a',
                  border: `1px solid ${category_color ? `${category_color}30` : '#e5e5e5'}`,
                }}
              >
                {category_name}
              </span>

              <Badge status={status} />

              {needs_followup && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-primary text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Follow-up
                </span>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="border-t border-hairline-soft px-4 pt-3 pb-3">
              <div className="flex items-center gap-3">
                {date_applied && status !== 'prospect' && (
                  <div className="text-[12px] text-steel flex items-center gap-1.5 flex-1 min-w-0">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className="truncate">
                      {formatDate(date_applied).formatted}
                      {formatDate(date_applied).daysAgo && (
                        <span className="ml-1 text-muted">
                          · {formatDate(date_applied).daysAgo}
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {onStatusChange && (
                  <select
                    value={status}
                    onChange={handleStatusChange}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="flex-1 text-[12px] px-2.5 py-1.5 rounded-lg border border-hairline-strong bg-white text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer capitalize appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236a6a6a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 6px center',
                      paddingRight: '22px',
                    }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="capitalize">
                        {opt.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}