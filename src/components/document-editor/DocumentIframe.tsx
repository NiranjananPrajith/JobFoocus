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

// On-screen editor styles.
//
// The editor is a clean white writing surface with no page separation —
// page breaks and A4 margins appear only in the final PDF (the
// document's own @media print + @page rules handle that).
//
// On desktop the content is a comfortable, centered column (max-width
// 210mm ≈ A4). On mobile it fills the screen with smaller padding.
// Wide AI-generated content (e.g. two-column flex layouts) scrolls
// horizontally inside the iframe rather than breaking the outer page.

const EDITOR_SURFACE_CSS = `
@media screen {
  html {
    background: #ffffff;
    min-height: 100%;
  }
  body {
    width: 100% !important;
    max-width: 210mm;
    margin: 0 auto !important;
    min-height: auto !important;
    background: #ffffff !important;
    box-shadow: none !important;
    /* Responsive padding: comfortable on desktop, tighter on mobile. */
    padding: 24px 32px !important;
    box-sizing: border-box;
    /* Let wide two-column AI designs scroll inside the iframe
       instead of breaking the outer page layout on mobile. */
    overflow-x: auto;
  }
}
@media screen and (max-width: 768px) {
  body {
    max-width: 100% !important;
    padding: 16px !important;
  }
}
`;

function injectEditorStyles(doc: Document) {
  if (!doc.head) return;
  if (doc.getElementById('jf-editor-surface')) return;
  const style = doc.createElement('style');
  style.id = 'jf-editor-surface';
  style.textContent = EDITOR_SURFACE_CSS;
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
          injectEditorStyles(doc);
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
      injectEditorStyles(doc);

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
          background: '#ffffff',
        }}
      />
    );
  }
);

export default DocumentIframe;
