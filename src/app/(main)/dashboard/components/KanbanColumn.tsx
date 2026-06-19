'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import KanbanCard from './KanbanCard';
import type { EnrichedApplication, StatusKey } from '@/lib/storage-adapter';

interface KanbanColumnProps {
  status: StatusKey;
  label: string;
  color: string;
  applications: EnrichedApplication[];
  search: string;
  onDelete: (id: string) => void;
}

export default function KanbanColumn({
  status,
  label,
  color,
  applications,
  search,
  onDelete,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  // Filter by search
  const filtered = applications.filter((app) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      app.company.toLowerCase().includes(q) ||
      app.job_title.toLowerCase().includes(q)
    );
  });

  // Sort: follow-ups first, then most recently applied
  const sorted = [...filtered].sort((a, b) => {
    if (a.needs_followup !== b.needs_followup) return a.needs_followup ? -1 : 1;
    const dateA = new Date(a.date_applied).getTime();
    const dateB = new Date(b.date_applied).getTime();
    return dateB - dateA;
  });

  return (
    <div className="flex flex-col min-w-[260px] flex-1">
      {/* Column header */}
      <div className="flex items-center gap-2 px-2 pb-3 mb-0">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-steel">
          {label}
        </h3>
        <span className="text-[11px] text-muted font-medium ml-auto">
          {filtered.length}
        </span>
      </div>

      {/* Card list */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 p-1 rounded-lg transition-colors min-h-[120px] ${
          isOver ? 'bg-primary/5 ring-1 ring-primary/20' : ''
        }`}
      >
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[12px] text-muted">
            {search ? 'No matches' : 'No jobs'}
          </div>
        ) : (
          sorted.map((app) => (
            <KanbanCard
              key={`${app.category}/${app.folder}`}
              app={app}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
