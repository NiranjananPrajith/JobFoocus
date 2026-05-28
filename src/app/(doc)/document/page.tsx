'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDocumentHTML, saveDocumentHTML, getMasterResume } from '@/lib/storage-adapter';

function DocumentContent() {
  const searchParams = useSearchParams();
  const appId = searchParams.get('app');
  const docType = searchParams.get('doc') as 'resume' | 'cover_letter' | 'job_description';

  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function fetchDocument() {
      if (!appId || !docType) {
        setError('Missing app or doc parameter');
        setLoading(false);
        return;
      }

      try {
        // appId is in format "category/folder"
        const [category, ...folderParts] = appId.split('/');
        const folder = folderParts.join('/');

        // Read document content from chrome.storage.local
        const html = await getDocumentHTML(category, folder, docType);
        if (!html) {
          throw new Error('Document not found');
        }
        setContent(html);

        // Fetch JD and master resume to build the page title
        const jdHtml = await getDocumentHTML(category, folder, 'job_description');
        const masterResume = await getMasterResume();
        const userName = masterResume?.name || '';

        let company = '';
        let jobTitle = '';

        if (jdHtml) {
          const titleMatch = jdHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
          const metaMatch = jdHtml.match(/<p>([^<]+)/);
          if (metaMatch) {
            // Decode HTML entities and split on bullet separator
            const decoded = metaMatch[1]
              .replace(/&bull;/g, '·')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
            const metaParts = decoded.split(' · ');
            company = metaParts[0] || '';
          }
          if (titleMatch) {
            jobTitle = titleMatch[1] || '';
          }
        }

        const docLabel = docType === 'resume' ? 'Resume' : docType === 'cover_letter' ? 'CoverLetter' : 'JobDescription';
        const titleParts = [userName, company, jobTitle].filter(Boolean).map(p => p.replace(/\s+/g, ''));
        document.title = titleParts.length > 0
          ? `${titleParts.join('-')}_${docLabel}`
          : `${folder}_${docLabel}`;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    fetchDocument();
  }, [appId, docType]);

  // Reset editing state when document changes
  useEffect(() => {
    setEditingMessage('');
    setIsEditing(false);
  }, [appId, docType]);

  const handleEditSubmit = useCallback(async () => {
    if (!editingMessage.trim() || !appId || !content) return;

    setIsEditing(true);

    try {
      const [category, ...folderParts] = appId.split('/');
      const folder = folderParts.join('/');
      const [jdHtml, masterResume] = await Promise.all([
        getDocumentHTML(category, folder, 'job_description'),
        getMasterResume(),
      ]);
      const jdText = jdHtml ? jdHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

      if (!masterResume) {
        throw new Error('Master resume not found. Please save your master resume first.');
      }

      const res = await fetch('/api/ai/edit-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentHTML: content,
          jobDescription: jdText,
          docType,
          userMessage: editingMessage,
          masterResume,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to edit document');
      }

      const { newFullHTML } = await res.json();

      // Save the new document
      await saveDocumentHTML(category, folder, docType, newFullHTML);

      // Update the displayed content
      setContent(newFullHTML);
      setEditingMessage('');
    } catch (err) {
      console.error('Edit failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to edit document. Please try again.');
    } finally {
      setIsEditing(false);
    }
  }, [editingMessage, appId, content, docType]);

  const handlePrint = () => {
    window.print();
  };

  const getDocLabel = () => {
    switch (docType) {
      case 'resume': return 'Resume';
      case 'cover_letter': return 'Cover Letter';
      case 'job_description': return 'Job Description';
      default: return 'Document';
    }
  };

  // Extract back URL from appId
  const backUrl = appId ? `/application?app=${encodeURIComponent(appId)}` : '/';

  if (loading) {
    return (
      <div className="document-container">
        <div className="document-header no-print bg-white border-b border-stone-200 px-6 py-5">
          <div className="document-header-inner flex items-center justify-between max-w-screen-xl mx-auto">
            <div className="document-header-left flex items-center gap-3">
              <a href={backUrl} className="document-back group flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors duration-200 text-sm font-medium">
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                <span>Back</span>
              </a>
              <span className="document-type text-stone-400 text-sm font-medium">|</span>
              <span className="document-type text-stone-500 uppercase tracking-wider text-xs font-semibold">{getDocLabel()}</span>
            </div>
          </div>
        </div>
        <div className="document-page">
          <p style={{ color: '#6a6a6a' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="document-container">
        <div className="document-header no-print bg-white border-b border-stone-200 px-6 py-5">
          <div className="document-header-inner flex items-center justify-between max-w-screen-xl mx-auto">
            <div className="document-header-left flex items-center gap-3">
              <a href={backUrl} className="document-back group flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors duration-200 text-sm font-medium">
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                <span>Back</span>
              </a>
              <span className="document-type text-stone-400 text-sm font-medium">|</span>
              <span className="document-type text-stone-500 uppercase tracking-wider text-xs font-semibold">{getDocLabel()}</span>
            </div>
          </div>
        </div>
        <div className="document-page flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
          </svg>
          <p className="text-[15px] text-steel font-medium">Generating your updated {getDocLabel().toLowerCase()}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="document-container">
        <div className="document-header no-print bg-white border-b border-stone-200 px-6 py-5">
          <div className="document-header-inner flex items-center justify-between max-w-screen-xl mx-auto">
            <div className="document-header-left flex items-center gap-3">
              <a href={backUrl} className="document-back group flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors duration-200 text-sm font-medium">
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                <span>Back</span>
              </a>
              <span className="document-type text-stone-400 text-sm font-medium">|</span>
              <span className="document-type text-stone-500 uppercase tracking-wider text-xs font-semibold">{getDocLabel()}</span>
            </div>
          </div>
        </div>
        <div className="document-page">
          <p style={{ color: '#e74c3c' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-container">
      <div className="document-header no-print bg-white border-b border-stone-200 px-6 py-5 sticky top-0 z-10">
        <div className="document-header-inner flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="document-header-left flex items-center gap-3">
            <a href={backUrl} className="document-back group flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors duration-200 text-sm font-medium">
              <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
              <span>Back</span>
            </a>
            <span className="document-type text-stone-400 text-sm font-medium">|</span>
            <span className="document-type text-stone-500 uppercase tracking-wider text-xs font-semibold">{getDocLabel()}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="document-print-btn bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 hover:border-stone-300 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              <span>Print to PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document content */}
      <div
        className="document-page pb-36"
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* Floating edit panel */}
      {(docType === 'resume' || docType === 'cover_letter') && !loading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
          <div
            className="rounded-2xl px-5 py-4 shadow-xl border"
            style={{ backgroundColor: '#fff8e0', borderColor: '#e6d5a8' }}
          >
            <p className="text-[13px] font-semibold mb-3" style={{ color: '#fa520f' }}>Want to make a change?</p>
            <div className="flex items-stretch gap-3">
              <textarea
                value={editingMessage}
                onChange={(e) => setEditingMessage(e.target.value)}
                placeholder="Describe your change..."
                rows={2}
                className="flex-1 resize-none rounded-xl px-4 py-3 text-[13px] text-ink placeholder-steel border focus:outline-none transition-all duration-200 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: isEditing ? '#f5f0e0' : '#fffaeb',
                  borderColor: '#e6d5a8',
                }}
                disabled={isEditing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && editingMessage.trim()) {
                    e.preventDefault();
                    handleEditSubmit();
                  }
                }}
              />
              <button
                onClick={handleEditSubmit}
                disabled={!editingMessage.trim() || isEditing}
                className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: editingMessage.trim() && !isEditing ? '#fa520f' : '#e6d5a8',
                  color: editingMessage.trim() && !isEditing ? '#ffffff' : '#999999',
                }}
                title="Send"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @page {
            size: letter;
            margin: 0.6in;
        }
        @media print {
            nav, header, footer, .no-print, .document-header,
            [class*="Navbar"], [class*="NavBar"], [class*="Footer"],
            [class*="Sunset"], .SunsetStripeBand,
            .sticky, .fixed, .z-10 {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                width: 0 !important;
                overflow: hidden !important;
                position: absolute !important;
            }
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: 100% !important;
                overflow: visible !important;
            }
            .document-container {
                display: block !important;
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
                position: static !important;
            }
            .document-page {
                margin: 0 !important;
                padding: 0 !important;
                max-width: none !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .document-page * {
                print-color-adjust: exact !important;
                -webkit-print-color-adjust: exact !important;
            }
        }
        .document-page {
            max-width: 850px;
            margin: 40px auto;
            padding: 0 20px;
        }
        .document-header {
            position: sticky;
            top: 0;
            z-index: 10;
        }
      `}</style>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="document-container">
      <div className="document-header no-print bg-white border-b border-stone-200 px-6 py-5">
        <div className="document-header-inner flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="document-header-left flex items-center gap-3">
            <span className="text-stone-500 uppercase tracking-wider text-xs font-semibold">Loading...</span>
          </div>
        </div>
      </div>
      <div className="document-page">
        <p style={{ color: '#6a6a6a' }}>Loading...</p>
      </div>
    </div>
  );
}

export default function DocumentPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DocumentContent />
    </Suspense>
  );
}