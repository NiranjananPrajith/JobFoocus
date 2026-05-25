'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDocumentHTML } from '@/lib/storage-adapter';

function DocumentContent() {
  const searchParams = useSearchParams();
  const appId = searchParams.get('app');
  const docType = searchParams.get('doc') as 'resume' | 'cover_letter' | 'job_description';

  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Set page title
        const title = `${folder}_${docType === 'resume' ? 'Resume' : docType === 'cover_letter' ? 'CoverLetter' : 'JobDescription'}`;
        document.title = title;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    fetchDocument();
  }, [appId, docType]);

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
      <div
        className="document-page"
        dangerouslySetInnerHTML={{ __html: content }}
      />
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