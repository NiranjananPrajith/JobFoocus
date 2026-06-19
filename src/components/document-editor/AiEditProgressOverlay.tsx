'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface AiEditProgressOverlayProps {
  active: boolean;
}

// Total target duration in seconds (3 minutes).
const DURATION_SEC = 180;
// Update interval in ms.
const TICK_MS = 100;
// Progress per tick (percentage per TICK_MS).
const STEP = 100 / ((DURATION_SEC * 1000) / TICK_MS);

// Messages rotate based on progress thresholds.
const MESSAGES: { at: number; text: string }[] = [
  { at: 0, text: 'Understanding your request…' },
  { at: 25, text: 'Editing your document…' },
  { at: 55, text: 'Applying the changes…' },
  { at: 80, text: 'Almost there…' },
];

function getMessage(progress: number): string {
  // Walk backwards through the thresholds to find the current message.
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

    // Show the overlay and reset progress.
    setProgress(0);
    setFlyToFinish(false);
    setVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + STEP;
        if (next >= 100) {
          // Reached 100% while still active — stay at 100.
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 100;
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
    if (active) return; // only react when active is false

    // If we were visible (AI was running), fly to 100% and then hide.
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

  const message = progress >= 100
    ? (flyToFinish ? '' : 'Still working… this is taking longer than expected.')
    : getMessage(progress);

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
