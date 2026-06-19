'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getDocumentHTML,
  saveDocumentHTML,
  getMasterResume,
} from '@/lib/storage-adapter';
import DocumentIframe, { DocumentIframeHandle, EditorHandle } from './DocumentIframe';
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
  const [handle, setHandle] = useState<EditorHandle | null>(null);
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

  // The iframe fires onEditorReady once the contentEditable body is set up.
  const handleEditorReady = useCallback((h: EditorHandle) => {
    setHandle(h);
  }, []);

  // ---- Save logic (debounced auto-save + manual save) ----
  //
  // We read the LIVE HTML from the iframe handle instead of the
  // currentHTML state. By the time a debounced save fires, the state
  // closure in performSave may be stale (more edits could have landed
  // after the callback was scheduled). The handle reads the iframe's
  // body.innerHTML directly, which is always current.
  const performSave = useCallback(async () => {
    if (!appId || !docType) return;
    const liveHTML = iframeRef.current?.getHTML() ?? currentHTML;
    if (!liveHTML) return;
    if (liveHTML === lastSavedHTMLRef.current) return;
    setSaveStatus('saving');
    setCurrentHTML(liveHTML);
    try {
      await saveDocumentHTML(category, folder, docType, liveHTML);
      lastSavedHTMLRef.current = liveHTML;
      setSaveStatus('saved');
      setLastSavedAt(Date.now());
    } catch (err) {
      console.error('[document-editor] save failed:', err);
      setSaveStatus('error');
    }
  }, [appId, docType, category, folder, currentHTML]);

  const handleIframeChange = useCallback(
    (newFullHTML: string) => {
      // If the editor reports the same content we already have on disk
      // (e.g. a programmatic innerHTML set), treat it as a no-op so we
      // don't show a misleading "Unsaved changes" status.
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

      // Flush any pending debounced save so the AI edits the latest
      // on-disk version, not a stale snapshot.
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        await performSave();
      }

      // Get the latest HTML from the iframe handle (always current,
      // unlike the React state closure which may be stale).
      const liveHTML = iframeRef.current?.getHTML() ?? currentHTML ?? lastSavedHTMLRef.current;

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

        // Update the iframe with the AI's new document (this replaces
        // the head <style> AND re-injects the page-sheet styles, then
        // sets the body content).
        iframeRef.current?.applyExternalHTML(newFullHTML);

        // Persist the AI result. Set 'saving' first, then 'saved'/'error'
        // after — so the chip reflects reality even if the write fails
        // (previously it said "Saved" before the await resolved).
        setCurrentHTML(newFullHTML);
        setSaveStatus('saving');
        try {
          await saveDocumentHTML(category, folder, docType, newFullHTML);
          lastSavedHTMLRef.current = newFullHTML;
          setSaveStatus('saved');
          setLastSavedAt(Date.now());
        } catch (err) {
          console.error('[document-editor] save after AI edit failed:', err);
          setSaveStatus('error');
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
    [appId, docType, category, folder, currentHTML, performSave]
  );

  // ---- Export ----
  const handleExportConfirm = useCallback(async () => {
    setExporting(true);
    try {
      // Flush any pending save first so the PDF matches the latest content.
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        await performSave();
      }
      // Read live HTML from the iframe (always current).
      const liveHTML = iframeRef.current?.getHTML() ?? currentHTML;
      if (!liveHTML) return;
      await exportDocumentPdf({
        html: liveHTML,
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

  // ---- Ctrl/Cmd+P → open the export guide instead of printing the
  // app chrome (which would just print a gray box since the iframe
  // content doesn't print from the parent window). ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPrintGuideOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- Re-render the "Saved Xs ago" chip periodically while idle so
  // the relative time stays fresh. ----
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

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

      <div className="document-toolbar sticky top-[49px] z-10 no-print">
        <EditorToolbar handle={handle} />
      </div>

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

      {/* Print/screen styles. The iframe auto-resizes to its content so
          no fixed height is needed. The whole page scrolls as one. */}
      <style>{`
        @page { size: A4; margin: 0; }
        .document-canvas {
          background: #ffffff;
        }
        .document-canvas iframe {
          display: block;
          width: 100%;
          border: 0;
          background: #ffffff;
        }
        @media print {
          .no-print, .document-header, .document-toolbar, [class*="no-print"] {
            display: none !important;
          }
          .document-canvas {
            background: #ffffff !important;
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
