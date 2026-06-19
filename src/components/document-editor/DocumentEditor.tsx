'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Editor } from '@tiptap/core';
import {
  getDocumentHTML,
  saveDocumentHTML,
  getMasterResume,
} from '@/lib/storage-adapter';
import DocumentIframe, { DocumentIframeHandle } from './DocumentIframe';
import EditorToolbar from './EditorToolbar';
import SmartEditPanel from './SmartEditPanel';
import PrintGuide from './PrintGuide';
import LoadingScreen from '@/components/LoadingScreen';
import UpgradePromptModal from '@/components/UpgradePromptModal';
import { exportDocumentPdf } from '@/lib/export-pdf';

type DocType = 'resume' | 'cover_letter';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function DocumentEditor() {
  const searchParams = useSearchParams();
  const appId = searchParams.get('app');
  const docType = searchParams.get('doc') as DocType | null;

  // Split appId (format: "category/folder")
  const [category, folder] = useMemo(() => {
    if (!appId) return ['', ''];
    const idx = appId.indexOf('/');
    if (idx < 0) return [appId, ''];
    return [appId.slice(0, idx), appId.slice(idx + 1)];
  }, [appId]);

  // Core state
  const [initialHTML, setInitialHTML] = useState<string | null>(null);
  const [currentHTML, setCurrentHTML] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Smart edit + export state
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [printGuideOpen, setPrintGuideOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Daily-limit block
  const [limitBlock, setLimitBlock] = useState<{
    tier: 'free' | 'pro' | 'max';
    used: number;
    limit: number;
    jobsUsed: number;
    jobsLimit: number;
  } | null>(null);

  const iframeRef = useRef<DocumentIframeHandle>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedHTMLRef = useRef<string>('');

  // ---- Initial load ----
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!appId || !docType) {
        setLoadError('Missing app or doc parameter');
        return;
      }
      try {
        const html = await getDocumentHTML(category, folder, docType);
        if (cancelled) return;
        if (!html) {
          setLoadError('Document not found');
          return;
        }
        setInitialHTML(html);
        setCurrentHTML(html);
        lastSavedHTMLRef.current = html;
        setSaveStatus('saved');
        setLastSavedAt(Date.now());

        // Set the page title (used by browser "Save as PDF" filename dialog).
        const jdHtml = await getDocumentHTML(category, folder, 'job_description');
        const masterResume = await getMasterResume();
        const userName = masterResume?.name || '';

        let company = '';
        let jobTitle = '';
        if (jdHtml) {
          const titleMatch = jdHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
          const metaMatch = jdHtml.match(/<p>([^<]+)/);
          if (metaMatch) {
            const decoded = metaMatch[1]
              .replace(/&bull;/g, '·')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
            const metaParts = decoded.split(' · ');
            company = metaParts[0] || '';
          }
          if (titleMatch) jobTitle = titleMatch[1] || '';
        }
        const docLabel = docType === 'resume' ? 'Resume' : 'CoverLetter';
        const titleParts = [userName, company, jobTitle].filter(Boolean).map((p) => p.replace(/\s+/g, ''));
        document.title = titleParts.length > 0
          ? `${titleParts.join('-')}_${docLabel}`
          : `${folder}_${docLabel}`;
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load document');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [appId, category, folder, docType]);

  // The iframe fires onEditorReady once TipTap is mounted on its body.
  const handleEditorReady = useCallback((ed: Editor) => {
    setEditor(ed);
  }, []);

  // ---- Save logic (debounced auto-save + manual save) ----
  const performSave = useCallback(async () => {
    if (!currentHTML || !appId || !docType) return;
    if (currentHTML === lastSavedHTMLRef.current) return;
    setSaveStatus('saving');
    try {
      await saveDocumentHTML(category, folder, docType, currentHTML);
      lastSavedHTMLRef.current = currentHTML;
      setSaveStatus('saved');
      setLastSavedAt(Date.now());
    } catch (err) {
      console.error('[document-editor] save failed:', err);
      setSaveStatus('error');
    }
  }, [currentHTML, category, folder, docType, appId]);

  const handleIframeChange = useCallback(
    (newFullHTML: string) => {
      // If the editor reports the same content we already have on disk
      // (e.g. the initial setContent round-trip), treat it as a no-op
      // so we don't show a misleading "Unsaved changes" status.
      if (newFullHTML === lastSavedHTMLRef.current) {
        setSaveStatus('saved');
        return;
      }
      setCurrentHTML(newFullHTML);
      setSaveStatus('idle');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        performSave();
      }, 2000);
    },
    [performSave]
  );

  const handleManualSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    performSave();
  }, [performSave]);

  // Flush pending save on unload.
  useEffect(() => {
    const flush = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        performSave();
      }
    };
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, [performSave]);

  // ---- Smart edit submit ----
  const handleSmartEdit = useCallback(
    async (message: string) => {
      if (!appId || !docType) return;

      // Pre-flight usage check (soft-fail; server is source of truth).
      try {
        const checkRes = await fetch('/api/usage/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'edit_doc' }),
        });
        if (checkRes.ok) {
          const check = await checkRes.json();
          if (!check.allowed) {
            setLimitBlock({
              tier: check.tier,
              used: check.editsUsed,
              limit: check.editsLimit,
              jobsUsed: check.jobsUsed,
              jobsLimit: check.jobsLimit,
            });
            return;
          }
        }
      } catch (err) {
        console.warn('[document-editor] usage pre-check failed, continuing:', err);
      }

      // Get the latest HTML from the editor (not the state, which may be stale).
      const liveHTML = currentHTML || lastSavedHTMLRef.current;

      setIsAiEditing(true);
      try {
        const res = await fetch('/api/ai/edit-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentHTML: liveHTML,
            docType,
            userMessage: message,
            category,
            folder,
          }),
        });

        if (res.status === 402) {
          const body = await res.json().catch(() => ({}));
          setLimitBlock({
            tier: body.tier ?? 'free',
            used: body.editsLimit ?? 0,
            limit: body.editsLimit ?? 0,
            jobsUsed: 0,
            jobsLimit: body.jobsLimit ?? 0,
          });
          return;
        }

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to edit document');
        }

        const { newFullHTML } = await res.json();

        // Update the iframe (this also persists our splitRef/head).
        iframeRef.current?.applyExternalHTML(newFullHTML);

        // Update local state and mark as saved (AI route already saved via storage? No —
        // the AI route doesn't save; the client saves. So we save now.)
        setCurrentHTML(newFullHTML);
        lastSavedHTMLRef.current = newFullHTML;
        setSaveStatus('saved');
        setLastSavedAt(Date.now());
        try {
          await saveDocumentHTML(category, folder, docType, newFullHTML);
        } catch (err) {
          console.error('[document-editor] save after AI edit failed:', err);
        }

        // Bump counter (fire-and-forget).
        void fetch('/api/usage/increment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'edit_doc' }),
        }).catch((err) => console.warn('[document-editor] usage increment failed:', err));
      } catch (err) {
        console.error('Smart edit failed:', err);
        alert(err instanceof Error ? err.message : 'Failed to apply edit. Please try again.');
      } finally {
        setIsAiEditing(false);
      }
    },
    [appId, docType, category, folder, currentHTML]
  );

  // ---- Export ----
  const handleExportConfirm = useCallback(async () => {
    if (!currentHTML) return;
    setExporting(true);
    try {
      // Flush any pending save first.
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        await performSave();
      }
      await exportDocumentPdf({
        html: currentHTML,
        filename: document.title || 'document',
      });
      setPrintGuideOpen(false);
    } catch (err) {
      console.error('[document-editor] export failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to open print dialog.');
    } finally {
      setExporting(false);
    }
  }, [currentHTML, performSave]);

  // ---- Render ----
  if (loadError) {
    return (
      <div className="document-container">
        <Header backUrl={appId ? `/application?app=${encodeURIComponent(appId)}` : '/'} docType={docType} saveStatus={saveStatus} lastSavedAt={lastSavedAt} onSave={handleManualSave} onExport={() => setPrintGuideOpen(true)} canExport={false} />
        <div className="document-page flex items-center justify-center min-h-[60vh]">
          <p style={{ color: 'var(--danger-text)' }}>{loadError}</p>
        </div>
      </div>
    );
  }

  if (!initialHTML) {
    return (
      <div className="document-container">
        <Header backUrl={appId ? `/application?app=${encodeURIComponent(appId)}` : '/'} docType={docType} saveStatus={saveStatus} lastSavedAt={lastSavedAt} onSave={handleManualSave} onExport={() => setPrintGuideOpen(true)} canExport={false} />
        <div className="document-page">
          <LoadingScreen messages={['Loading your document...', 'Polishing the page...', 'Almost there...']} />
        </div>
      </div>
    );
  }

  return (
    <div className="document-container">
      <Header
        backUrl={appId ? `/application?app=${encodeURIComponent(appId)}` : '/'}
        docType={docType}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        onSave={handleManualSave}
        onExport={() => setPrintGuideOpen(true)}
        canExport
      />

      <EditorToolbar editor={editor} />

      {isAiEditing && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center no-print"
          style={{ backgroundColor: 'var(--scrim)' }}
        >
          <div className="bg-surface border border-hairline rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-[3px] border-hairline border-t-primary rounded-full animate-spin" />
            <p className="text-[15px] text-ink font-semibold">Applying your changes…</p>
            <p className="text-[12px] text-steel">The AI is editing your document. This can take a few seconds.</p>
          </div>
        </div>
      )}

      <div className="document-canvas">
        {/* The key remounts the iframe when switching documents (different appId/docType) */}
        <DocumentIframe
          key={`${category}/${folder}/${docType}`}
          html={initialHTML}
          onChange={handleIframeChange}
          onEditorReady={handleEditorReady}
          ref={iframeRef}
        />
      </div>

      {(docType === 'resume' || docType === 'cover_letter') && (
        <SmartEditPanel onSubmit={handleSmartEdit} busy={isAiEditing} />
      )}

      <PrintGuide
        isOpen={printGuideOpen}
        onClose={() => setPrintGuideOpen(false)}
        onConfirm={handleExportConfirm}
        filename={document.title || 'document'}
        busy={exporting}
      />

      <UpgradePromptModal
        isOpen={!!limitBlock}
        onClose={() => setLimitBlock(null)}
        blockedAction="edit_doc"
        tier={limitBlock?.tier ?? 'free'}
        used={limitBlock?.used ?? 0}
        limit={limitBlock?.limit ?? 0}
        otherUsed={limitBlock?.jobsUsed ?? 0}
        otherLimit={limitBlock?.jobsLimit ?? 0}
        otherLabel="Jobs today"
      />

      {/* The print-specific styles for the iframe are injected on load.
          We also hide the chrome (header, toolbar, smart-edit panel) when
          printing the parent window. The dedicated export window is clean. */}
      <style>{`
        @page { size: A4; margin: 0; }
        .document-canvas {
          background: #525659;
          min-height: calc(100vh - 120px);
        }
        .document-canvas iframe {
          display: block;
          width: 100%;
          min-height: calc(100vh - 120px);
          border: 0;
          background: #525659;
        }
        @media print {
          .no-print, .document-header, .document-toolbar, [class*="no-print"] {
            display: none !important;
          }
          .document-canvas {
            background: #ffffff !important;
            min-height: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

function Header({
  backUrl,
  docType,
  saveStatus,
  lastSavedAt,
  onSave,
  onExport,
  canExport,
}: {
  backUrl: string;
  docType: DocType | null;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  onSave: () => void;
  onExport: () => void;
  canExport: boolean;
}) {
  const docLabel = docType === 'resume' ? 'Resume' : docType === 'cover_letter' ? 'Cover Letter' : 'Document';
  return (
    <div className="document-header no-print bg-surface border-b border-hairline px-6 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <a
            href={backUrl}
            className="flex items-center gap-2 text-steel hover:text-ink transition-colors duration-200 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </a>
          <span className="text-steel text-sm font-medium">|</span>
          <span className="text-steel uppercase tracking-wider text-xs font-semibold">{docLabel}</span>
          <span className="text-steel text-sm font-medium">|</span>
          <SaveStatusChip status={saveStatus} lastSavedAt={lastSavedAt} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saveStatus === 'saving'}
            className="px-3 h-9 rounded-lg text-[13px] font-medium text-ink bg-canvas border border-hairline hover:border-hairline-strong transition-colors disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={!canExport}
            className="px-3 h-9 rounded-lg text-[13px] font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveStatusChip({ status, lastSavedAt }: { status: SaveStatus; lastSavedAt: number | null }) {
  if (status === 'saving') {
    return <span className="text-[12px] text-steel">Saving…</span>;
  }
  if (status === 'error') {
    return <span className="text-[12px]" style={{ color: 'var(--danger-text)' }}>Save failed</span>;
  }
  if (status === 'idle') {
    return <span className="text-[12px] text-steel">Unsaved changes</span>;
  }
  // saved
  if (!lastSavedAt) return null;
  const ago = Math.max(0, Math.floor((Date.now() - lastSavedAt) / 1000));
  const label = ago < 5 ? 'Saved' : `Saved ${ago < 60 ? `${ago}s` : `${Math.floor(ago / 60)}m`} ago`;
  return <span className="text-[12px] text-steel">{label}</span>;
}
