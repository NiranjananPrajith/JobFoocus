'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { FontSize } from './extensions/FontSize';
import { splitDocument, recombineDocument, normalizePageSizeToA4 } from '@/lib/document-split';

// On-screen A4 page-sheet visualization. We turn the document body into a
// Word-like white A4 column on a gray canvas, with subtle gray "gaps" every
// 297mm so the user sees multiple distinct pages. The gaps are painted by
// the body's own background — a repeating gradient — so the contentEditable
// stays a single, continuous element (cursor flows across pages). Text
// lines that happen to fall on a gray gap band render on gray; that's the
// accepted visual quirk of this approach (true line-level page splitting in
// a live contentEditable is fragile). Scoped to @media screen so the printed
// output is unaffected.
const PAGE_SHEET_CSS = `
@media screen {
  html {
    background: #525659;
    min-height: 100%;
  }
  body {
    width: 210mm;
    min-height: 297mm;
    margin: 16px auto !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    background: repeating-linear-gradient(
      to bottom,
      #ffffff 0,
      #ffffff calc(297mm - 1px),
      #d0d0d0 calc(297mm - 1px),
      #d0d0d0 297mm,
      #ffffff 297mm,
      #ffffff calc(594mm - 1px),
      #d0d0d0 calc(594mm - 1px),
      #d0d0d0 594mm
    ) !important;
    background-attachment: local !important;
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

export interface DocumentIframeHandle {
  getEditor: () => Editor | null;
  getIframeDoc: () => Document | null;
  applyExternalHTML: (fullHTML: string) => void;
}

interface DocumentIframeProps {
  html: string;
  onChange: (newFullHTML: string) => void;
  onEditorReady?: (editor: Editor) => void;
}

const DocumentIframe = forwardRef<DocumentIframeHandle, DocumentIframeProps>(
  function DocumentIframe({ html, onChange, onEditorReady }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const editorRef = useRef<Editor | null>(null);
    const splitRef = useRef<ReturnType<typeof splitDocument> | null>(null);
    const isReadyRef = useRef(false);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // Compute the initial split and srcdoc synchronously so the iframe
    // renders with the correct srcDoc on the very first paint (no
    // double-load from a placeholder empty srcDoc).
    const initialSplit = useMemo(
      () => splitDocument(normalizePageSizeToA4(html)),
      [html]
    );
    const initialSrcDoc = useMemo(
      () => initialSplit.prefix + initialSplit.suffix,
      [initialSplit]
    );

    // Seed the splitRef synchronously so the iframe's onLoad handler can
    // use it on the first load without waiting for an effect.
    if (splitRef.current === null) {
      splitRef.current = initialSplit;
    }

    useImperativeHandle(ref, () => ({
      getEditor: () => editorRef.current,
      getIframeDoc: () => iframeRef.current?.contentDocument ?? null,
      applyExternalHTML: (fullHTML: string) => {
        const editor = editorRef.current;
        const doc = iframeRef.current?.contentDocument;
        if (!editor || !doc) return;
        const split = splitDocument(fullHTML);
        // Replace the iframe's <head> content (style may have changed).
        if (doc.head) {
          doc.head.innerHTML = split.headHTML;
        }
        // Update our split cache so future onChange can recombine.
        splitRef.current = split;
        // setContent with emitUpdate=false to suppress our onChange round-trip
        // (the parent already considers this content "saved" — it came from the AI).
        editor.commands.setContent(split.bodyHTML, { emitUpdate: false });
      },
    }));

    // When the iframe finishes loading, inject the on-screen page-sheet
    // visualization, then mount TipTap on the body.
    const handleIframeLoad = () => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc || !doc.body) return;
      const split = splitRef.current;
      if (!split) return;

      // Inject the page-sheet styles for on-screen viewing. Scoped to
      // @media screen so they never affect the printed output.
      injectPageSheetStyles(doc);

      // Destroy any previous editor (shouldn't happen on first load, but safe).
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }

      const editor = new Editor({
        element: doc.body,
        extensions: [
          StarterKit,
          Underline,
          TextStyle,
          Color,
          FontFamily,
          FontSize,
          TextAlign.configure({
            types: ['heading', 'paragraph'],
          }),
        ],
        content: split.bodyHTML || '<p></p>',
        editable: true,
        onCreate: () => {
          // Editor is mounted and content is parsed. From this point on,
          // any onUpdate represents a real user edit.
          isReadyRef.current = true;
        },
        onUpdate: ({ editor: ed, transaction }) => {
          // Ignore updates that fire during the initial setContent /
          // normalizing transactions — those represent the content we
          // just loaded, not a real user edit.
          if (!isReadyRef.current) return;
          // Ignore transactions that didn't change the document (e.g.
          // pure selection moves / cursor changes). This keeps the
          // "Unsaved changes" chip from flickering on every cursor move.
          if (!transaction.docChanged) return;
          // Reconstruct full HTML from the live body + cached prefix/suffix.
          const s = splitRef.current;
          if (!s) return;
          const newBodyHTML = ed.getHTML();
          const newFullHTML = recombineDocument(s.prefix, newBodyHTML, s.suffix);
          onChangeRef.current(newFullHTML);
        },
      });

      editorRef.current = editor;
      onEditorReady?.(editor);
    };

    // Cleanup on unmount.
    useEffect(() => {
      return () => {
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
        }
      };
    }, []);

    return (
      <iframe
        ref={iframeRef}
        title="Document editor"
        srcDoc={initialSrcDoc}
        onLoad={handleIframeLoad}
        className="w-full h-full border-0"
        style={{
          width: '100%',
          minHeight: '600px',
          background: '#525659', // Word-like gray canvas
          border: 'none',
        }}
      />
    );
  }
);

export default DocumentIframe;
