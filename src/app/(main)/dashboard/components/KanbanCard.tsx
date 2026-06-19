'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import { statusColors } from '@/lib/design-system';
import type { EnrichedApplication } from '@/lib/storage-adapter';

interface KanbanCardProps {
  app: EnrichedApplication;
  onDelete: (id: string) => void;
}

export default function KanbanCard({ app, onDelete }: KanbanCardProps) {
  const router = useRouter();
  const id = `${app.category}/${app.folder}`;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { app, status: app.status },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const daysAgo = app.days_since_applied ?? null;

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if we just finished dragging
    if (isDragging) return;
    router.push(`/application?app=${encodeURIComponent(id)}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className="group relative bg-card rounded-lg border border-hairline p-3 cursor-grab active:cursor-grabbing hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-hairline-strong transition-all duration-150"
    >
      {/* Category color dot */}
      <div className="flex items-start gap-2.5">
        <span
          className="shrink-0 w-2 h-2 rounded-full mt-1.5"
          style={{ backgroundColor: app.category_color || '#888888' }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-ink leading-tight truncate">
            {app.company}
          </p>
          <p className="text-[12px] text-steel leading-snug mt-0.5 truncate">
            {app.job_title}
          </p>
        </div>

        {/* Delete button — hover only */}
        <button
          onClick={handleDelete}
          className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-steel hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Delete"
          title="Move to trash"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-2 mt-2 pl-[18px]">
        {daysAgo !== null && app.status !== 'prospect' && (
          <span className="text-[11px] text-muted">
            {daysAgo === 0 ? 'today' : `${daysAgo}d ago`}
          </span>
        )}
        {app.needs_followup && (
          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-primary text-white">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
            Follow-up
          </span>
        )}
        <span className="text-[11px] text-muted truncate">
          {app.category_name}
        </span>
      </div>
    </div>
  );
}
