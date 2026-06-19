'use client';

import { useEffect, useState } from 'react';
import { statusColors } from '@/lib/design-system';
import type { StatusKey } from '@/lib/storage-adapter';

/** The five pipeline statuses, matched to the kanban column order. */
const PIPELINE: StatusKey[] = [
  'prospect',
  'applied',
  'interview',
  'offer',
  'rejected',
];

interface LoadingScreenProps {
  /** Messages that rotate every ~2.2 s with a fade-in-up crossfade. */
  messages: string[];
  /** min-h-screen (true) vs min-h-[60vh] (default). */
  fullScreen?: boolean;
  /**
   * Compact mode — just the breathing icon + rotating message, no orbit dots
   * or pulse rings.  For tight inline spots (form fields, dropdowns).
   */
  compact?: boolean;
  /** Icon / orbit radius scale: 'sm' | 'md' | 'lg'.  Default 'md'. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DIMS = {
  sm: { icon: 32, orbit: 28, dot: 6, ring: 44 },
  md: { icon: 48, orbit: 44, dot: 8, ring: 68 },
  lg: { icon: 64, orbit: 60, dot: 10, ring: 92 },
} as const;

export default function LoadingScreen({
  messages,
  fullScreen = false,
  compact = false,
  size = 'md',
  className = '',
}: LoadingScreenProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setInterval(
      () => setIdx((i) => (i + 1) % messages.length),
      2200,
    );
    return () => clearInterval(timer);
  }, [messages.length]);

  const d = DIMS[size];
  const minH = fullScreen ? 'min-h-screen' : 'min-h-[60vh]';

  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 ${minH} ${className}`}
    >
      {/* --- Animated centerpiece --- */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: compact ? d.icon : d.ring * 2, height: compact ? d.icon : d.ring * 2 }}
      >
        {!compact && (
          <>
            {/* Pulse ring 1 */}
            <span
              className="absolute rounded-full border border-primary animate-jf-ring"
              style={{ width: d.ring, height: d.ring }}
            />
            {/* Pulse ring 2 (staggered) */}
            <span
              className="absolute rounded-full border border-primary animate-jf-ring"
              style={{ width: d.ring, height: d.ring, animationDelay: '1.2s' }}
            />

            {/* Orbiting pipeline dots */}
            <div className="absolute inset-0 animate-jf-orbit">
              {PIPELINE.map((status, i) => (
                <span
                  key={status}
                  className="absolute top-1/2 left-1/2 rounded-full"
                  style={{
                    width: d.dot,
                    height: d.dot,
                    backgroundColor: statusColors[status],
                    transform: `translate(-50%, -50%) rotate(${i * 72}deg) translateX(${d.orbit}px)`,
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Breathing JobFoocus icon */}
        <img
          src="/icon.webp"
          alt=""
          className="animate-jf-breathe"
          style={{ width: d.icon, height: d.icon }}
        />
      </div>

      {/* --- Rotating message --- */}
      <p
        key={idx}
        className="animate-jf-fade-up text-steel text-[15px] text-center max-w-xs"
      >
        {messages[idx]}
      </p>
    </div>
  );
}
