'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Browser = 'chrome' | 'edge' | 'firefox' | 'safari' | 'other';

function detectBrowser(): Browser {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'chrome';
  if (ua.includes('firefox/')) return 'firefox';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'safari';
  return 'other';
}

const STEPS = [
  {
    title: 'Open the extensions page',
    body: (b: Browser) =>
      b === 'edge'
        ? 'Type edge://extensions into the address bar and press Enter.'
        : 'Type chrome://extensions into the address bar and press Enter.',
    href: (b: Browser) => (b === 'edge' ? 'edge://extensions' : 'chrome://extensions'),
  },
  {
    title: 'Enable Developer mode',
    body: () =>
      'Toggle the Developer mode switch in the top-right corner of the page.',
  },
  {
    title: 'Click "Load unpacked"',
    body: () =>
      'A file picker opens. Select the extension/ folder from the project directory you downloaded.',
  },
  {
    title: 'Pin the extension',
    body: () =>
      'Click the puzzle-piece icon in your browser toolbar, then click the pin icon next to "JobFoocus Scraper".',
  },
  {
    title: 'Try it on a job posting',
    body: () =>
      'Navigate to any job posting (LinkedIn, Indeed, Greenhouse, etc.) and click the JobFoocus toolbar icon. The dashboard opens with the job title, company, and description pre-filled.',
  },
];

export default function ExtensionInstallPage() {
  const [browser, setBrowser] = useState<Browser>('other');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    setBrowser(detectBrowser());
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch('/extensions/build/jobfoocus-extension.zip', { method: 'HEAD' });
      if (!res.ok) {
        throw new Error(
          'No packaged build is available yet. Run `npm run build:extension` locally to generate one, or follow the manual install steps above.'
        );
      }
      window.location.href = '/extensions/build/jobfoocus-extension.zip';
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const browserLabel: Record<Browser, string> = {
    chrome: 'Chrome',
    edge: 'Edge',
    firefox: 'Firefox',
    safari: 'Safari',
    other: 'your browser',
  };

  return (
    <div className="max-w-[860px] mx-auto">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-[32px] md:text-[40px] font-semibold text-ink mb-3">
          Install the JobFoocus extension
        </h1>
        <p className="text-[16px] text-steel leading-relaxed max-w-[640px]">
          One click on any job posting sends the title, company, and description straight into a new
          application workspace on your dashboard.
        </p>
      </div>

      {/* Download CTA card */}
      <div className="mb-10 rounded-2xl border border-hairline-strong bg-cream/40 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-semibold text-ink mb-1">Quick install (recommended)</h2>
            <p className="text-[14px] text-steel leading-relaxed">
              Detected browser:{' '}
              <span className="font-medium text-ink">{browserLabel[browser]}</span>. Download the
              packaged extension and skip the manual steps below.
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-white text-[14px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? 'Preparing…' : 'Download extension (.zip)'}
          </button>
        </div>
        {downloadError && (
          <p className="mt-4 text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {downloadError}
          </p>
        )}
        {browser === 'firefox' || browser === 'safari' ? (
          <p className="mt-4 text-[13px] text-steel">
            <strong>Note:</strong> the extension is currently packaged for Chromium-based browsers
            (Chrome, Edge, Brave, Arc, Opera). Firefox/Safari ports are on the roadmap.
          </p>
        ) : null}
      </div>

      {/* Manual install steps */}
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-[20px] font-semibold text-ink">Or install manually</h2>
        <span className="text-[12px] text-steel">~2 minutes</span>
      </div>

      <ol className="space-y-4 mb-10">
        {STEPS.map((step, idx) => (
          <li
            key={step.title}
            className="rounded-xl border border-hairline-soft bg-white p-5 flex gap-4"
          >
            <div
              className="shrink-0 w-8 h-8 rounded-full bg-primary text-white text-[14px] font-semibold flex items-center justify-center"
              aria-hidden
            >
              {idx + 1}
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-ink mb-1">{step.title}</h3>
              <p className="text-[14px] text-steel leading-relaxed">{step.body(browser)}</p>
              {step.href && (
                <a
                  href={step.href(browser)}
                  className="inline-flex items-center gap-1 mt-2 text-[13px] text-primary hover:underline"
                >
                  Open {step.href(browser)}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* How it works */}
      <div className="rounded-xl border border-hairline-soft bg-canvas p-5 mb-8">
        <h3 className="text-[15px] font-semibold text-ink mb-3">How it works</h3>
        <ul className="text-[13px] text-steel space-y-2 leading-relaxed">
          <li>
            The extension only reads the current page when you click its toolbar icon — it never
            runs in the background and never collects data passively.
          </li>
          <li>
            On click, it sends the page URL, title, company, and description to your JobFoocus
            dashboard via deep-link query parameters.
          </li>
          <li>
            If the page doesn't look like a job posting, the dashboard opens empty with a warning so
            you can paste the JD manually.
          </li>
        </ul>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-[14px] text-steel hover:text-ink transition-colors"
        >
          <span className="mr-2">←</span> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
