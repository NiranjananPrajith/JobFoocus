'use client';

import React from 'react';
import type { StatusKey } from '@/lib/storage-adapter';

interface KanbanNavItem {
  key: StatusKey;
  label: string;
  color: string;
  count: number;
}

interface KanbanNavProps {
  items: KanbanNavItem[];
  activeKey: StatusKey;
  onSelect: (key: StatusKey) => void;
}

export default function KanbanNav({ items, activeKey, onSelect }: KanbanNavProps) {
  return (
    <nav
      aria-label="Pipeline sections"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 p-1
                 rounded-full bg-card-glass backdrop-blur-md border border-hairline shadow-lg"
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            aria-current={isActive ? 'true' : undefined}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium flex items-center gap-1.5
              transition-colors duration-150 ${
                isActive
                  ? 'bg-surface text-ink'
                  : 'text-steel hover:text-ink'
              }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
            <span className="text-[11px] text-muted tabular-nums ml-0.5">
              {item.count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
