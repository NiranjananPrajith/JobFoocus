'use client';

import React from 'react';
import Link from 'next/link';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import NavigationIcon from '@/components/design/NavigationIcon';
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
      className="kanban-card group relative bg-surface border border-hairline cursor-grab active:cursor-grabbing hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-hairline-strong transition-all duration-150"
    >
      <div className="kanban-company"><span className="kanban-company-mark" aria-hidden="true">{app.company[0]?.toUpperCase()}</span><span className="truncate pr-4">{app.company}</span></div>
      <h4 className="kanban-job-title"><Link href={`/application?app=${encodeURIComponent(id)}`} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>{app.job_title}</Link></h4>
      <span className="kanban-category"><span className="truncate">{app.category_name}</span></span>
      <p className="kanban-documents">{app.has_resume && app.has_cover_letter ? 'Resume + cover letter' : app.has_resume ? 'Resume' : app.has_cover_letter ? 'Cover letter' : 'No documents yet'}</p>
      <div className="kanban-metadata"><span>{app.status === 'prospect' ? 'Saved' : 'Applied'} {new Date(app.date_applied).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>{app.needs_followup && <span className="kanban-followup">Follow up</span>}</div>
      <button type="button" onPointerDown={event => event.stopPropagation()} onClick={handleDelete} className="kanban-delete" aria-label={`Move ${app.company} ${app.job_title} to trash`} title="Move to trash"><NavigationIcon name="trash" width="14" height="14" /></button>
    </div>
  );
}
