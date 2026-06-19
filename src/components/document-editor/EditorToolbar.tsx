'use client';

import { EditorHandle } from './DocumentIframe';
import { useState, useEffect, useCallback } from 'react';

interface EditorToolbarProps {
  handle: EditorHandle | null;
}

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Helvetica / Arial', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
];

const FONT_SIZES = [
  { label: '9pt', value: '9pt' },
  { label: '10pt', value: '10pt' },
  { label: '10.5pt', value: '10.5pt' },
  { label: '11pt', value: '11pt' },
  { label: '12pt', value: '12pt' },
  { label: '14pt', value: '14pt' },
  { label: '16pt', value: '16pt' },
  { label: '18pt', value: '18pt' },
  { label: '20pt', value: '20pt' },
  { label: '24pt', value: '24pt' },
  { label: '28pt', value: '28pt' },
];

const TEXT_COLORS = [
  '#000000', '#333333', '#666666', '#888888',
  '#fa520f', '#cc3a05', '#2563eb', '#1d4ed8',
  '#16a34a', '#4caf50', '#dc2626', '#e74c3c',
  '#f5a623', '#7c3aed', '#db2777', '#0891b2',
];

function ToolbarButton({
  active,
  onClick,
  title,
  children,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} /* keep editor selection */
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'h-8 min-w-[32px] px-2 inline-flex items-center justify-center gap-1 rounded-md text-[13px] font-medium transition-colors',
        active
          ? 'bg-primary text-on-primary'
          : 'text-ink hover:bg-surface-elevated',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-hairline mx-1" />;
}

export default function EditorToolbar({ handle }: EditorToolbarProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [tick, setTick] = useState(0);

  // Re-render on selection changes so active states update. execCommand
  // has no event hooks, so we poll the selection on a short interval while
  // the toolbar is mounted. (Lightweight — queryCommandState is cheap.)
  useEffect(() => {
    if (!handle) return;
    const interval = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(interval);
  }, [handle]);

  const isActive = useCallback(
    (command: string): boolean => (handle ? handle.queryState(command) : false),
    [handle, tick] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!handle) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-hairline bg-surface text-steel text-sm">
        Loading editor…
      </div>
    );
  }

  const activeFontName = (() => {
    // queryCommandValue('fontName') may return quoted/legacy forms; we
    // match loosely against our preset values.
    const v = handle.queryValue('fontName') || '';
    const match = FONT_FAMILIES.find((f) => f.value && v.replace(/['"]/g, '').toLowerCase().includes(f.value.replace(/['"]/g, '').split(',')[0].toLowerCase()));
    return match ? match.value : '';
  })();

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-hairline bg-surface">
      {/* Font family */}
      <select
        value={activeFontName}
        onChange={(e) => {
          const v = e.target.value;
          if (v) {
            handle.exec('fontName', v);
          } else {
            handle.exec('removeFormat');
          }
        }}
        className="h-8 text-[13px] rounded-md border border-hairline bg-canvas px-2 text-ink mr-1"
        title="Font family"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Font size */}
      <select
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v) handle.wrapFontSize(v);
          // Reset to the placeholder immediately so the dropdown doesn't
          // "stick" on a size after applying.
          e.target.value = '';
        }}
        className="h-8 text-[13px] rounded-md border border-hairline bg-canvas px-2 text-ink mr-1 w-[72px]"
        title="Font size"
      >
        <option value="">Size</option>
        {FONT_SIZES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <Divider />

      {/* Bold / Italic / Underline */}
      <ToolbarButton
        active={isActive('bold')}
        onClick={() => handle.exec('bold')}
        title="Bold (Ctrl+B)"
      >
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton
        active={isActive('italic')}
        onClick={() => handle.exec('italic')}
        title="Italic (Ctrl+I)"
      >
        <span className="italic font-serif">I</span>
      </ToolbarButton>
      <ToolbarButton
        active={isActive('underline')}
        onClick={() => handle.exec('underline')}
        title="Underline (Ctrl+U)"
      >
        <span className="underline">U</span>
      </ToolbarButton>

      <Divider />

      {/* Text color */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setColorPickerOpen((s) => !s)}
          title="Text color"
        >
          <span
            className="inline-block w-4 h-4 rounded-sm border border-hairline"
            style={{
              backgroundColor: handle.queryValue('foreColor') || '#000000',
            }}
          />
          <span className="text-[10px]">▾</span>
        </ToolbarButton>
        {colorPickerOpen && (
          <div
            className="absolute z-50 mt-1 p-2 bg-surface border border-hairline rounded-lg shadow-lg"
            onMouseLeave={() => setColorPickerOpen(false)}
          >
            <div className="grid grid-cols-8 gap-1 mb-2">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    handle.exec('foreColor', c);
                    setColorPickerOpen(false);
                  }}
                  className="w-5 h-5 rounded-sm border border-hairline cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            <label className="flex items-center gap-2 text-[11px] text-steel">
              Custom
              <input
                type="color"
                onChange={(e) => handle.exec('foreColor', e.target.value)}
                className="w-6 h-6 cursor-pointer"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  // Reset to black via a fresh foreColor call.
                  handle.exec('foreColor', '#000000');
                }}
                className="ml-auto text-[11px] text-steel hover:text-ink underline"
              >
                Reset
              </button>
            </label>
          </div>
        )}
      </div>

      <Divider />

      {/* Alignment */}
      <ToolbarButton
        active={isActive('justifyLeft')}
        onClick={() => handle.exec('justifyLeft')}
        title="Align left"
      >
        <AlignIcon type="left" />
      </ToolbarButton>
      <ToolbarButton
        active={isActive('justifyCenter')}
        onClick={() => handle.exec('justifyCenter')}
        title="Align center"
      >
        <AlignIcon type="center" />
      </ToolbarButton>
      <ToolbarButton
        active={isActive('justifyRight')}
        onClick={() => handle.exec('justifyRight')}
        title="Align right"
      >
        <AlignIcon type="right" />
      </ToolbarButton>
      <ToolbarButton
        active={isActive('justifyFull')}
        onClick={() => handle.exec('justifyFull')}
        title="Justify"
      >
        <AlignIcon type="justify" />
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        active={isActive('insertUnorderedList')}
        onClick={() => handle.exec('insertUnorderedList')}
        title="Bullet list"
      >
        <span className="text-[14px]">•</span>
        <span className="text-[12px]">≡</span>
      </ToolbarButton>
      <ToolbarButton
        active={isActive('insertOrderedList')}
        onClick={() => handle.exec('insertOrderedList')}
        title="Numbered list"
      >
        <span className="text-[12px]">1.</span>
        <span className="text-[12px]">≡</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => handle.exec('removeFormat')}
        title="Clear formatting"
      >
        <span className="text-[12px]">Tx</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => handle.exec('undo')}
        title="Undo (Ctrl+Z)"
      >
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => handle.exec('redo')}
        title="Redo (Ctrl+Shift+Z)"
      >
        <RedoIcon />
      </ToolbarButton>
    </div>
  );
}

function AlignIcon({ type }: { type: 'left' | 'center' | 'right' | 'justify' }) {
  const lines: Record<typeof type, string[]> = {
    left: ['M2 4h12', 'M2 8h8', 'M2 12h12', 'M2 16h6'],
    center: ['M2 4h12', 'M4 8h8', 'M2 12h12', 'M5 16h6'],
    right: ['M2 4h12', 'M6 8h8', 'M2 12h12', 'M8 16h6'],
    justify: ['M2 4h12', 'M2 8h12', 'M2 12h12', 'M2 16h12'],
  };
  return (
    <svg width="16" height="16" viewBox="0 0 16 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      {lines[type].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 14 4 9 9 4" />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 14 20 9 15 4" />
      <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
    </svg>
  );
}
