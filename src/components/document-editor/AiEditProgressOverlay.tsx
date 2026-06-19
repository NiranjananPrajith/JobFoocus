'use client';

import { useEffect, useRef, useState } from 'react';

interface AiEditProgressOverlayProps {
  active: boolean;
}

// Reach 95% in 60 seconds, then hold there until the AI finishes.
const DURATION_SEC = 60;
// The slow-animation ceiling — the bar holds here when active is still true.
const CEILING = 95;
// Update interval in ms.
const TICK_MS = 100;
// Progress per tick toward the ceiling.
const STEP = CEILING / ((DURATION_SEC * 1000) / TICK_MS);

// Messages rotate based on progress thresholds.
const MESSAGES: { at: number; text: string }[] = [
  { at: 0, text: 'Understanding your request…' },
  { at: 25, text: 'Editing your document…' },
  { at: 55, text: 'Applying the changes…' },
  { at: 85, text: 'Processing…' },
];

function getMessage(progress: number): string {
  for (let i = MESSAGES.length - 1; i >= 0; i--) {
    if (progress >= MESSAGES[i].at) return MESSAGES[i].text;
  }
  return MESSAGES[0].text;
}

export default function AiEditProgressOverlay({ active }: AiEditProgressOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [flyToFinish, setFlyToFinish] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start the slow progress animation when active becomes true.
  useEffect(() => {
    if (!active) return;

    setProgress(0);
    setFlyToFinish(false);
    setVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + STEP;
        if (next >= CEILING) {
          // Reached the ceiling — stop ticking, hold at CEILING.
          if (intervalRef.current) clearInterval(intervalRef.current);
          return CEILING;
        }
        return next;
      });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  // When active transitions from true → false (AI finished), fly to 100%
  // then hide after a short delay.
  useEffect(() => {
    if (active) return;

    if (visible) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setFlyToFinish(true);
      setProgress(100);
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        setFlyToFinish(false);
        setProgress(0);
      }, 800); // 500ms fly + 300ms settle
    }

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [active, visible]);

  if (!visible) return null;

  const message = flyToFinish ? '' : getMessage(progress);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center no-print"
      style={{ backgroundColor: 'var(--scrim)' }}
    >
      <div className="bg-surface border border-hairline rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-4 min-w-[320px]">
        {/* Percentage */}
        <p className="text-[28px] font-bold text-ink tabular-nums">
          {Math.round(progress)}%
        </p>

        {/* Progress bar track */}
        <div className="w-72 h-2 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all ease-out"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: 'var(--primary)',
              transitionDuration: flyToFinish ? '500ms' : '300ms',
            }}
          />
        </div>

        {/* Context message */}
        {message && (
          <p className="text-[13px] text-steel text-center min-h-[20px]">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
