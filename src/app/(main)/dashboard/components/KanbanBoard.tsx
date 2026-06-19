'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import KanbanNav from './KanbanNav';
import { statusColors, statusLabels } from '@/lib/design-system';
import type { EnrichedApplication, StatusKey } from '@/lib/storage-adapter';

const STATUSES: StatusKey[] = ['prospect', 'applied', 'interview', 'offer', 'rejected'];

// Matches the company/title search filter in KanbanColumn
function matchesSearch(app: EnrichedApplication, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    app.company.toLowerCase().includes(lower) ||
    app.job_title.toLowerCase().includes(lower)
  );
}

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
  const [activeStatus, setActiveStatus] = useState<StatusKey>('prospect');
  const [highlightedStatus, setHighlightedStatus] = useState<StatusKey | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef(new Map<StatusKey, HTMLElement>());
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>();
  const rafId = useRef(0);

  // Column ref callback — stable across renders
  const setColumnRef = useCallback((status: StatusKey) => (el: HTMLDivElement | null) => {
    if (el) columnRefs.current.set(status, el);
    else columnRefs.current.delete(status);
  }, []);

  // ---- DnD sensors ----

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

  // ---- DnD handlers ----

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

      if (newStatus === oldStatus) return;

      await onStatusChange(app.category, app.folder, newStatus);
    },
    [onStatusChange]
  );

  // ---- Scroll-to-center ----

  const scrollToStatus = useCallback((status: StatusKey) => {
    const container = scrollContainerRef.current;
    const col = columnRefs.current.get(status);
    if (!container || !col) return;

    const cRect = container.getBoundingClientRect();
    const colRect = col.getBoundingClientRect();
    const delta = colRect.left - cRect.left - (cRect.width - colRect.width) / 2;
    container.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  // ---- Pill click handler ----

  const handleSelect = useCallback((status: StatusKey) => {
    scrollToStatus(status);
    setActiveStatus(status);
    setHighlightedStatus(status);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedStatus(null), 1500);
  }, [scrollToStatus]);

  // ---- Scroll-spy: highlight the pill nearest the viewport center ----

  const computeActiveStatus = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerCenter = container.getBoundingClientRect().left + container.clientWidth / 2;
    let closest: StatusKey | null = null;
    let closestDist = Infinity;

    for (const status of STATUSES) {
      const col = columnRefs.current.get(status);
      if (!col) continue;
      const colCenter = col.getBoundingClientRect().left + col.offsetWidth / 2;
      const dist = Math.abs(colCenter - containerCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closest = status;
      }
    }

    if (closest) setActiveStatus(closest);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(computeActiveStatus);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, [computeActiveStatus]);

  // ---- Overflow detection ----

  const checkOverflow = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) setOverflowing(container.scrollWidth > container.clientWidth + 1);
  }, []);

  useEffect(() => {
    checkOverflow();
    const container = scrollContainerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(checkOverflow);
    ro.observe(container);
    window.addEventListener('resize', checkOverflow);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [checkOverflow, applications]);

  // ---- Cleanup highlight timer ----

  useEffect(() => {
    return () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); };
  }, []);

  // ---- Group & filter applications by status ----

  const q = search.toLowerCase();
  const counts: Record<StatusKey, number> = {
    prospect: 0, applied: 0, interview: 0, offer: 0, rejected: 0,
  };
  const byStatus: Record<StatusKey, EnrichedApplication[]> = {
    prospect: [], applied: [], interview: [], offer: [], rejected: [],
  };

  for (const app of applications) {
    const key = app.status as StatusKey;
    if (byStatus[key]) {
      byStatus[key].push(app);
      if (matchesSearch(app, q)) counts[key]++;
    }
  }

  const navItems = STATUSES.map((s) => ({
    key: s,
    label: statusLabels[s],
    color: statusColors[s],
    count: counts[s],
  }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={scrollContainerRef}
        className={`flex gap-4 overflow-x-auto -mx-1 px-1 ${
          overflowing ? 'pb-16' : 'pb-4'
        }`}
      >
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            label={statusLabels[status]}
            color={statusColors[status]}
            applications={byStatus[status]}
            search={search}
            onDelete={onDelete}
            columnRef={setColumnRef(status)}
            isHighlighted={highlightedStatus === status}
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

      {overflowing && (
        <KanbanNav
          items={navItems}
          activeKey={activeStatus}
          onSelect={handleSelect}
        />
      )}
    </DndContext>
  );
}
