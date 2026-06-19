'use client';

import { useState, useMemo } from 'react';
import Badge from '@/components/design/Badge';
import { statusLabels, type StatusType } from '@/lib/design-system';
import type { EnrichedApplication, UserCategory } from '@/lib/storage-adapter';
import { formatApplicationDate } from './helpers';
import EmptyPipelineState from './EmptyPipelineState';

interface PipelineTableProps {
  applications: EnrichedApplication[];
  categories: UserCategory[];
  onSelect: (app: EnrichedApplication) => void;
  onAddJob: () => void;
}

const ALL_STATUSES: StatusType[] = ['prospect', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'];
const PAGE_SIZE = 20;

export default function PipelineTable({ applications, categories, onSelect, onAddJob }: PipelineTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sort, setSort] = useState<'recent' | 'oldest' | 'company'>('recent');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = [...applications];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.company.toLowerCase().includes(q) ||
        a.job_title.toLowerCase().includes(q) ||
        (a.notes && a.notes.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(a => a.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(a => a.category === categoryFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sort === 'recent') {
        const dateA = a.response_date || a.date_applied;
        const dateB = b.response_date || b.date_applied;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
      if (sort === 'oldest') {
        const dateA = a.response_date || a.date_applied;
        const dateB = b.response_date || b.date_applied;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      }
      return a.company.localeCompare(b.company);
    });

    return result;
  }, [applications, search, statusFilter, categoryFilter, sort]);

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'all' || categoryFilter !== 'all';
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visibleApps = filtered.slice(0, page * PAGE_SIZE);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applications.length };
    for (const app of applications) {
      counts[app.status] = (counts[app.status] || 0) + 1;
    }
    return counts;
  }, [applications]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPage(1);
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-[13px] rounded-md border border-hairline bg-card text-ink placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as StatusType | 'all'); setPage(1); }}
          className="text-[13px] px-3 py-2 rounded-md border border-hairline bg-card text-ink focus:outline-none focus:border-primary capitalize appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236a6a6a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            paddingRight: '28px',
          }}
        >
          <option value="all">All status ({statusCounts.all})</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{statusLabels[s]} ({statusCounts[s] || 0})</option>
          ))}
        </select>

        {/* Category filter */}
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="text-[13px] px-3 py-2 rounded-md border border-hairline bg-card text-ink focus:outline-none focus:border-primary capitalize appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236a6a6a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
              paddingRight: '28px',
            }}
          >
            <option value="all">All categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        )}

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'recent' | 'oldest' | 'company')}
          className="text-[13px] px-3 py-2 rounded-md border border-hairline bg-card text-ink focus:outline-none focus:border-primary appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236a6a6a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            paddingRight: '28px',
          }}
        >
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest first</option>
          <option value="company">Company A-Z</option>
        </select>

        {/* Result count */}
        <span className="text-[12px] text-muted whitespace-nowrap">
          {filtered.length} job{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyPipelineState
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          onAddJob={onAddJob}
        />
      ) : (
        <>
          <div className="border border-hairline-soft rounded-lg overflow-hidden bg-card">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-hairline bg-surface">
                  <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-steel">Company</th>
                  <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-steel hidden sm:table-cell">Title</th>
                  <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-steel hidden md:table-cell">Category</th>
                  <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-steel">Status</th>
                  <th className="py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-steel text-right hidden md:table-cell">Date</th>
                  <th className="py-2.5 px-4 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {visibleApps.map((app) => {
                  const { absolute, relative } = formatApplicationDate(app);
                  const id = `${app.category}/${app.folder}`;
                  return (
                    <tr
                      key={id}
                      onClick={() => onSelect(app)}
                      className="border-b border-hairline-soft last:border-0 hover:bg-surface cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="text-[13px] font-medium text-ink hover:text-primary transition-colors block truncate max-w-[200px]">
                          {app.company}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className="text-[13px] text-steel block truncate max-w-[200px]">
                          {app.job_title}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            backgroundColor: app.category_color ? `${app.category_color}18` : 'var(--surface)',
                            color: app.category_color || 'var(--steel)',
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: app.category_color || '#888' }} />
                          {app.category_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={app.status as StatusType} showLabel={false} className="text-[11px] px-2 py-0.5" />
                      </td>
                      <td className="py-3 px-4 text-right hidden md:table-cell">
                        <span className="text-[12px] text-muted" title={absolute}>
                          {relative}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load more */}
          {page < totalPages && (
            <button
              onClick={() => setPage(p => p + 1)}
              className="w-full mt-3 py-2.5 text-[13px] font-medium text-steel hover:text-ink border border-hairline-soft rounded-lg hover:bg-surface transition-colors"
            >
              Load more ({filtered.length - visibleApps.length} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
