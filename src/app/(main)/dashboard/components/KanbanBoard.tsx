'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { statusColors, statusLabels, type StatusType } from '@/lib/design-system';
import type { EnrichedApplication, StatusKey } from '@/lib/storage-adapter';

const STATUSES: StatusKey[] = ['prospect', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'];

interface KanbanBoardProps {
  applications: EnrichedApplication[];
  search: string;
  onStatusChange: (category: string, folder: string, newStatus: StatusKey) => Promise<void>;
  onDelete: (id: string) => void;
}

export default function KanbanBoard({
  applications,
  search,
  onStatusChange,
  onDelete,
}: KanbanBoardProps) {
  const [activeApp, setActiveApp] = useState<EnrichedApplication | null>(null);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const app = active.data.current?.app as EnrichedApplication | undefined;
    if (app) setActiveApp(app);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveApp(null);

      if (!over) return;

      const app = active.data.current?.app as EnrichedApplication | undefined;
      if (!app) return;

      const newStatus = over.id as StatusKey;
      const oldStatus = app.status as StatusKey;

      // Dropped in the same column — no-op
      if (newStatus === oldStatus) return;

      await onStatusChange(app.category, app.folder, newStatus);
    },
    [onStatusChange]
  );

  // Group applications by status
  const byStatus: Record<StatusKey, EnrichedApplication[]> = {
    prospect: [],
    applied: [],
    phone_screen: [],
    interview: [],
    offer: [],
    rejected: [],
  };
  for (const app of applications) {
    const key = app.status as StatusKey;
    if (byStatus[key]) {
      byStatus[key].push(app);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            label={statusLabels[status]}
            color={statusColors[status]}
            applications={byStatus[status]}
            search={search}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeApp && (
          <div className="w-[260px] rotate-[2deg] opacity-90">
            <KanbanCard app={activeApp} onDelete={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
