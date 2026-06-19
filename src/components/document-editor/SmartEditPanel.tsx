'use client';

import { useState } from 'react';

interface SmartEditPanelProps {
  onSubmit: (message: string) => Promise<void>;
  busy: boolean;
}

const SUGGESTIONS = [
  'Add a two-column sidebar design with a colored header',
  'Make the summary section more concise',
  'Change the section header style to use an accent color',
  'Convert the experience list to use stronger action verbs',
];

export default function SmartEditPanel({ onSubmit, busy }: SmartEditPanelProps) {
  const [message, setMessage] = useState('');

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setMessage('');
    await onSubmit(trimmed);
  };

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20 no-print"
    >
      <div
        className="rounded-2xl px-5 py-4 shadow-xl border"
        style={{ backgroundColor: 'var(--cream)', borderColor: 'var(--beige-deep)' }}
      >
        <p className="text-[13px] font-semibold mb-2" style={{ color: 'var(--primary)' }}>
          Smart edit
        </p>
        <div className="flex items-stretch gap-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe a change — or pick a suggestion below…"
            rows={2}
            disabled={busy}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-[13px] text-ink placeholder-steel border focus:outline-none transition-all duration-200 disabled:cursor-not-allowed"
            style={{
              backgroundColor: busy ? '#f5f0e0' : '#fffaeb',
              borderColor: '#e6d5a8',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button
            onClick={submit}
            disabled={!message.trim() || busy}
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 disabled:cursor-not-allowed"
            style={{
              backgroundColor: message.trim() && !busy ? '#fa520f' : '#e6d5a8',
              color: message.trim() && !busy ? '#ffffff' : '#999999',
            }}
            title="Send"
            type="button"
          >
            {busy ? (
              <Spinner />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>
        </div>

        {/* Suggestion chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setMessage(s)}
              disabled={busy}
              className="text-[11px] px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 hover:bg-canvas"
              style={{ borderColor: 'var(--beige-deep)', color: 'var(--ink-tint)' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}
