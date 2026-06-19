'use client';

import { Suspense } from 'react';
import DocumentEditor from '@/components/document-editor/DocumentEditor';
import LoadingScreen from '@/components/LoadingScreen';

function LoadingFallback() {
  return (
    <div className="document-container">
      <div className="document-header no-print bg-surface border-b border-hairline px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center max-w-screen-xl mx-auto">
          <span className="text-steel uppercase tracking-wider text-xs font-semibold">Document</span>
        </div>
      </div>
      <div className="document-page">
        <LoadingScreen messages={['Loading your document...', 'Polishing the page...', 'Almost there...']} />
      </div>
    </div>
  );
}

export default function DocumentPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DocumentEditor />
    </Suspense>
  );
}
