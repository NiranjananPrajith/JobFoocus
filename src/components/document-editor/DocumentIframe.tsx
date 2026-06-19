'use client';

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useCallback,
} from 'react';
import {
  splitDocument,
  recombineDocument,
  normalizePageSizeToA4,
} from '@/lib/document-split';

// On-screen A4 page-sheet visualization. We turn the document body into a
// Word-like white A4 column on a gray canvas, with visible gray "gaps"
// every 297mm so the user sees multiple distinct pages. The gaps are
// painted by the body's own background — a repeating gradient — so the
// contentEditable stays a single, continuous element (cursor flows across
// pages). Text lines that happen to fall on a gray gap band render on
// gray; that's the accepted visual quirk of this approach. Scoped to
// @media screen so the printed output is unaffected.
//
// GAP_PX is the gray band width at each A4 page boundary. Dial it to
// taste during QA (0 = thin rule, ~10 = visible Word-like gap).
const GAP_PX = 10;
const PAGE_HEIGHT_MM = 297;

const PAGE_SHEET_CSS = `
@media screen {
  html {
    background: #525659;
    min-height: 100%;
  }
  body {
    width: 210mm;
    min-height: ${PAGE_HEIGHT_MM}mm;
    margin: ${GAP_PX}px auto !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    /* White page blocks of PAGE_HEIGHT_MM, separated by GAP_PX gray bands,
       repeating vertically across the whole body height. */
    background: repeating-linear-gradient(
      to bottom,
      #ffffff 0,
      #ffffff ${PAGE_HEIGHT_MM}mm,
      #d0d0d0 ${PAGE_HEIGHT_MM}mm,
      #d0d0d0 calc(${PAGE_HEIGHT_MM}mm + ${GAP_PX}px)
    ) !important;
    background-attachment: local !important;
    /* Make the body a proper A4 page box. */
    box-sizing: border-box;
  }
}
`;

function injectPageSheetStyles(doc: Document) {
  if (!doc.head) return;
  // Avoid double-injection on reloads.
  if (doc.getElementById('jf-page-sheets')) return;
  const style = doc.createElement('style');
  style.id = 'jf-page-sheets';
  style.textContent = PAGE_SHEET_CSS;
  doc.head.appendChild(style);
}

export interface EditorHandle {
  // Run a document.execCommand (bold/italic/underline/justify*/fontName/
  // foreColor/insertUnorderedList/insertOrderedList/undo/redo/removeFormat).
  exec: (command: string, value?: string) => void;
  // queryCommandState for toolbar active highlighting.
  queryState: (command: string) => boolean;
  // queryCommandValue for the active font name / color swatch.
  queryValue: (command: string) => string;
  // Wrap the current selection in <span style="font-size: {pt}">.
  wrapFontSize: (pt: string) => void;
  // Replace the entire document (used after an AI edit).
  applyExternalHTML: (fullHTML: string) => void;
  // Focus the editor surface.
  focus: () => void;
  // Read the live body HTML (used by the parent for saves).
  getHTML: () => string;
}

export interface DocumentIframeHandle extends EditorHandle {
  getIframeDoc: () => Document | null;
}

interface DocumentIframeProps {
  html: string;
  onChange: (newFullHTML: string) => void;
  onEditorReady?: (handle: EditorHandle) => void;
}

const DocumentIframe = forwardRef<DocumentIframeHandle, DocumentIframeProps>(
  function DocumentIframe({ html, onChange, onEditorReady }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const splitRef = useRef<ReturnType<typeof splitDocument> | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onEditorReadyRef = useRef(onEditorReady);
    onEditorReadyRef.current = onEditorReady;
    // Guards against onChange firing for programmatic innerHTML writes
    // (initial load, AI applyExternalHTML). User typing fires the 'input'
    // event; raw innerHTML sets do not, but we keep the guard as a
    // belt-and-braces measure.
    const suppressChangeRef = useRef(true);

    // Compute the initial split and srcdoc synchronously so the iframe
    // renders with the correct srcDoc on the very first paint.
    const initialSplit = useMemo(
      () => splitDocument(normalizePageSizeToA4(html)),
      [html]
    );
    const initialSrcDoc = useMemo(
      () => initialSplit.prefix + initialSplit.suffix,
      [initialSplit]
    );

    // Lazy-init splitRef (no mutation during render).
    if (splitRef.current === null) {
      splitRef.current = initialSplit;
    }

    // ---- Helpers that operate on the live iframe document ----

    const getDoc = useCallback((): Document | null => {
      return iframeRef.current?.contentDocument ?? null;
    }, []);

    const emitChange = useCallback(() => {
      if (suppressChangeRef.current) return;
      const doc = getDoc();
      const s = splitRef.current;
      if (!doc || !s) return;
      const newFullHTML = recombineDocument(s.prefix, doc.body.innerHTML, s.suffix);
      onChangeRef.current(newFullHTML);
    }, [getDoc]);

    // Auto-resize the iframe to fit its content so the whole page scrolls
    // as one (true Word-like UX — no inner iframe scrollbar, no gray gap
    // below a short iframe).
    const autoResize = useCallback(() => {
      const iframe = iframeRef.current;
      const doc = getDoc();
      if (!iframe || !doc || !doc.body) return;
      // Use scrollHeight of the body; the iframe itself has no min-height
      // now (we removed the inline 600px), so it grows with the content.
      const h = Math.ceil(doc.body.scrollHeight) + 16; // small breathing room
      iframe.style.height = `${h}px`;
    }, [getDoc]);

    const exec = useCallback(
      (command: string, value?: string) => {
        const doc = getDoc();
        if (!doc) return;
        doc.body.focus();
        // styleWithCSS makes formatting emit <span style="..."> instead of
        // <b>/<font>/<strike>, which survives re-parsing and matches the
        // print-safe CSS expectations.
        try {
          doc.execCommand('styleWithCSS', false, 'true');
        } catch {
          /* Safari may throw on styleWithCSS — non-fatal */
        }
        doc.execCommand(command, false, value);
        autoResize();
        emitChange();
      },
      [getDoc, autoResize, emitChange]
    );

    const queryState = useCallback(
      (command: string): boolean => {
        const doc = getDoc();
        if (!doc) return false;
        try {
          return doc.queryCommandState(command);
        } catch {
          return false;
        }
      },
      [getDoc]
    );

    const queryValue = useCallback(
      (command: string): string => {
        const doc = getDoc();
        if (!doc) return '';
        try {
          return doc.queryCommandValue(command) || '';
        } catch {
          return '';
        }
      },
      [getDoc]
    );

    // Wrap the current selection in <span style="font-size: {pt}">.
    // execCommand('fontSize') only supports the legacy 1-7 scale, so we do
    // this manually via the Selection/Range API for precise pt sizing.
    const wrapFontSize = useCallback(
      (pt: string) => {
        const doc = getDoc();
        if (!doc) return;
        const win = iframeRef.current?.contentWindow as (Window & typeof globalThis) | null;
        if (!win) return;
        const sel = win.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        if (range.collapsed) return; // nothing to wrap
        const span = doc.createElement('span');
        span.style.fontSize = pt;
        // extractContents moves the selected nodes into the span.
        span.appendChild(range.extractContents());
        range.insertNode(span);
        // Restore selection around the new span.
        sel.removeAllRanges();
        const newRange = doc.createRange();
        newRange.selectNodeContents(span);
        sel.addRange(newRange);
        autoResize();
        emitChange();
      },
      [getDoc, autoResize, emitChange]
    );

    const applyExternalHTML = useCallback(
      (fullHTML: string) => {
        const doc = getDoc();
        if (!doc || !doc.body) return;
        const split = splitDocument(fullHTML);
        // Replace the iframe's <head> content (the <style> may have
        // changed during an AI redesign).
        if (doc.head) {
          doc.head.innerHTML = split.headHTML;
          // Re-inject the page-sheet styles — head.innerHTML replaced
          // them above (issue: AI edit used to wipe the page sheets).
          injectPageSheetStyles(doc);
        }
        // Update our split cache so future onChange can recombine.
        splitRef.current = split;
        // Set the body content. Programmatic innerHTML does NOT fire the
        // 'input' event, but we guard anyway.
        suppressChangeRef.current = true;
        doc.body.innerHTML = split.bodyHTML;
        suppressChangeRef.current = false;
        autoResize();
      },
      [getDoc, autoResize]
    );

    const focusEditor = useCallback(() => {
      const doc = getDoc();
      if (!doc) return;
      doc.body.focus();
    }, [getDoc]);

    const getHTML = useCallback((): string => {
      const doc = getDoc();
      const s = splitRef.current;
      if (!doc || !s) return '';
      return recombineDocument(s.prefix, doc.body.innerHTML, s.suffix);
    }, [getDoc]);

    useImperativeHandle(
      ref,
      (): DocumentIframeHandle => ({
        exec,
        queryState,
        queryValue,
        wrapFontSize,
        applyExternalHTML,
        focus: focusEditor,
        getHTML,
        getIframeDoc: getDoc,
      }),
      [exec, queryState, queryValue, wrapFontSize, applyExternalHTML, focusEditor, getHTML, getDoc]
    );

    // ---- Iframe load → make body editable + wire events ----
    const handleIframeLoad = useCallback(() => {
      const doc = getDoc();
      if (!doc || !doc.body) return;
      const split = splitRef.current;
      if (!split) return;

      // Inject the page-sheet visualization (screen-only).
      injectPageSheetStyles(doc);

      // Populate the body with the original content — raw, preserving all
      // divs/classes/spans (the whole point of switching off TipTap).
      suppressChangeRef.current = true;
      doc.body.innerHTML = split.bodyHTML;
      suppressChangeRef.current = false;

      // Make the body the editing surface. contentEditable keeps the DOM
      // as-is; execCommand applies inline styles on the selection.
      doc.body.contentEditable = 'true';
      // Disable spell-check — resumes shouldn't get red squiggles on
      // every technical term.
      (doc.body as any).spellcheck = false;

      // Wire input → onChange.
      doc.body.addEventListener('input', () => {
        emitChange();
        autoResize();
      });
      // Also resize on image load / dynamic content shifts.
      const ro = new ResizeObserver(() => autoResize());
      ro.observe(doc.body);

      // styleWithCSS on once for the session.
      try {
        doc.execCommand('styleWithCSS', false, 'true');
      } catch {
        /* non-fatal */
      }

      autoResize();

      // Notify the parent that the editor is ready.
      onEditorReadyRef.current?.({
        exec,
        queryState,
        queryValue,
        wrapFontSize,
        applyExternalHTML,
        focus: focusEditor,
        getHTML,
      });
    }, [getDoc, emitChange, autoResize, exec, queryState, queryValue, wrapFontSize, applyExternalHTML, focusEditor, getHTML]);

    // Cleanup on unmount: drop the ResizeObserver + listeners. The iframe
    // itself is removed by React.
    useEffect(() => {
      return () => {
        const doc = getDoc();
        if (doc && doc.body) {
          doc.body.contentEditable = 'false';
        }
      };
    }, [getDoc]);

    return (
      <iframe
        ref={iframeRef}
        title="Document editor"
        srcDoc={initialSrcDoc}
        onLoad={handleIframeLoad}
        className="w-full border-0"
        style={{
          display: 'block',
          width: '100%',
          // No min-height: the iframe auto-resizes to its body's
          // scrollHeight so the whole page scrolls as one.
          height: '600px',
          border: 'none',
          background: '#525659',
        }}
      />
    );
  }
);

export default DocumentIframe;
