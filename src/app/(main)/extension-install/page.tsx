'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';

const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/dddmilicbgjmfidicpahglaflfjfcnjl';
const FIREFOX_ADDON_URL = 'https://addons.mozilla.org/en-CA/firefox/addon/jobfoocus/';
const EXT_VERSION = '1.2.0';

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
    title: () => 'Open the extensions page',
    body: (b: Browser) =>
      b === 'firefox'
        ? 'Type about:debugging#/runtime/this-firefox into the address bar and press Enter.'
        : b === 'edge'
        ? 'Type edge://extensions into the address bar and press Enter.'
        : 'Type chrome://extensions into the address bar and press Enter.',
    href: (b: Browser) =>
      b === 'firefox'
        ? 'about:debugging#/runtime/this-firefox'
        : b === 'edge'
        ? 'edge://extensions'
        : 'chrome://extensions',
  },
  {
    title: () => 'Enable Developer mode',
    body: (b: Browser) =>
      b === 'firefox'
        ? 'Firefox does not need Developer mode — proceed to the next step.'
        : 'Toggle the Developer mode switch in the top-right corner of the page.',
  },
  {
    title: (b: Browser) =>
      b === 'firefox' ? 'Click "Load Temporary Add-on…"' : 'Click "Load unpacked"',
    body: (b: Browser) =>
      b === 'firefox'
        ? 'A file picker opens. Select the manifest.json file from the extracted extension folder.'
        : 'A file picker opens. Select the extracted extension folder (the one containing manifest.json).',
  },
  {
    title: () => 'Pin the extension',
    body: () =>
      'Click the puzzle-piece icon in your browser toolbar, then click the pin icon next to "JobFoocus".',
  },
  {
    title: () => 'Try it on a job posting',
    body: () =>
      'Navigate to any job posting (LinkedIn, Indeed, Greenhouse, etc.) and click the JobFoocus toolbar icon.',
  },
];

function ChromeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" fill="white" stroke="#e5e5e5" strokeWidth="1" />
      <circle cx="24" cy="24" r="10" fill="#4285F4" />
      <path d="M24 14a10 10 0 0 0-8.66 5l4.33-7.5A10 10 0 0 1 34 19h-8.66a10 10 0 0 0-1.34-5z" fill="#EA4335" />
      <path d="M24 34a10 10 0 0 0 8.66-5l-4.33 7.5A10 10 0 0 1 14 29h8.66a10 10 0 0 0 1.34 5z" fill="#34A853" />
      <path d="M15.34 19a10 10 0 0 0 0 10l4.33-7.5-4.33-7.5A10 10 0 0 0 15.34 19z" fill="#FBBC05" />
      <circle cx="24" cy="24" r="4" fill="#4285F4" />
    </svg>
  );
}

function FirefoxIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" fill="white" stroke="#e5e5e5" strokeWidth="1" />
      <path d="M34.5 18.5C35 20 35 22 34 24c-1 2-2.5 3.5-4.5 4.5-1.5.8-3.5 1.5-5.5 1.5-3 0-5.5-1-7.5-3-1.5-1.5-2.5-3.5-2.5-6 0-1.5.5-3 1.5-4.5C17 13 19 11.5 21.5 11c-1.5 2-2.5 4-2.5 6 0 2 1 4 2.5 5.5s3.5 2.5 5.5 2.5c2 0 4-1 5.5-2.5 1-1 1.5-2.5 1.5-4 0-1-.5-2-1-3l-1-1" fill="#FF7139" />
      <path d="M28 13c-1.5-1.5-3.5-2.5-6-2.5-1.5 0-3 .5-4.5 1.5C15 13.5 14 15.5 14 18c0 1.5.5 3 1.5 4.5 1.5-2 3.5-3.5 6-4 2-.5 4-.5 5.5.5-1.5-2-3.5-4-6-5s-5-1-7 1" fill="#FF9500" />
      <path d="M27 10.5C24.5 9 21.5 8.5 18.5 9.5S13.5 13 13 16.5c-.5 3.5.5 6.5 2.5 9-1-1.5-1.5-3-1.5-5 0-3 1.5-6 4-8s5.5-3 9-2" fill="#FF7139" />
      <path d="M21.5 11c-2 2.5-3 5.5-2 8.5 1 2.5 3 4.5 5.5 5.5 2 .8 4.5.5 6.5-1 2-1.5 3-3.5 3-6 0-1-.5-2-1-3 .5 2 .5 3.5 0 5s-2 3-4 3.5-3.5.5-5-1c-1.5-1.5-2-3.5-1.5-5.5.5-1.5 1.5-3 3-4" fill="#FF7139" />
      <circle cx="24" cy="22" r="2" fill="#FF9500" />
    </svg>
  );
}

function ChromeLogo() {
  return <ChromeIcon />;
}

export default function ExtensionInstallPage() {
  const [browser, setBrowser] = useState<Browser>('other');
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    setBrowser(detectBrowser());
  }, []);

  const isChromeFamily = browser === 'chrome' || browser === 'edge';
  const isFirefox = browser === 'firefox';
  const isRecommended = (store: 'chrome' | 'firefox') =>
    (store === 'chrome' && (isChromeFamily || browser === 'other')) ||
    (store === 'firefox' && isFirefox);

  return (
    <div className="max-w-[860px] mx-auto">

      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-[32px] md:text-[40px] font-semibold text-ink mb-3">
          Install the JobFoocus browser extension
        </h1>
        <p className="text-[16px] text-steel leading-relaxed max-w-[640px]">
          Add any job posting to your dashboard with one click. The extension
          extracts the title, company, and description and pre-fills a new
          application workspace — no copy-pasting.
        </p>
      </div>

      {/* Store cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {/* Chrome */}
        <div
          className={`relative rounded-xl border-2 p-6 flex flex-col ${
            isRecommended('chrome')
              ? 'border-primary bg-primary/5'
              : 'border-hairline-soft bg-canvas'
          }`}
        >
          {isRecommended('chrome') && (
            <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-md bg-primary text-on-primary text-[11px] font-bold uppercase tracking-wider">
              Recommended
            </span>
          )}
          <div className="flex items-center gap-3 mb-4">
            <ChromeLogo />
            <div>
              <p className="text-[15px] font-semibold text-ink">Chrome Web Store</p>
              <p className="text-[12px] text-steel">Version {EXT_VERSION}</p>
            </div>
          </div>
          <p className="text-[13px] text-steel leading-relaxed mb-5 flex-1">
            Works in Chrome, Edge, Brave, Arc, Opera, Vivaldi, and any
            Chromium-based browser. One-click install from the official store.
          </p>
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-lg bg-primary text-white text-[14px] font-medium hover:bg-primary-deep transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add to Chrome
          </a>
        </div>

        {/* Firefox */}
        <div
          className={`relative rounded-xl border-2 p-6 flex flex-col ${
            isRecommended('firefox')
              ? 'border-primary bg-primary/5'
              : 'border-hairline-soft bg-canvas'
          }`}
        >
          {isRecommended('firefox') && (
            <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-md bg-primary text-on-primary text-[11px] font-bold uppercase tracking-wider">
              Recommended
            </span>
          )}
          <div className="flex items-center gap-3 mb-4">
            <FirefoxIcon />
            <div>
              <p className="text-[15px] font-semibold text-ink">Firefox Add-ons</p>
              <p className="text-[12px] text-steel">Version {EXT_VERSION}</p>
            </div>
          </div>
          <p className="text-[13px] text-steel leading-relaxed mb-5 flex-1">
            Native Firefox extension available on the Mozilla Add-ons store.
            Same features, same one-click install.
          </p>
          <a
            href={FIREFOX_ADDON_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-lg text-[14px] font-medium transition-colors"
            style={{
              backgroundColor: '#20123a',
              color: 'white',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2b1a4a')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#20123a')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add to Firefox
          </a>
        </div>
      </div>

      {/* How to use */}
      <div className="rounded-xl border border-hairline-soft bg-surface p-6 md:p-8 mb-8">
        <h2 className="text-[18px] font-semibold text-ink mb-5">How to use</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-ink mb-0.5">Click the icon</p>
              <p className="text-[13px] text-steel leading-relaxed">
                Click the JobFoocus icon in your toolbar and press &quot;Add Job&quot;.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 11a9 9 0 0 1 9 9" />
                <path d="M4 4a16 16 0 0 1 16 16" />
                <circle cx="5" cy="19" r="1" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-ink mb-0.5">Right-click</p>
              <p className="text-[13px] text-steel leading-relaxed">
                Right-click anywhere on a job page and select &quot;Send page to JobFoocus&quot;.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6" />
                <path d="M9 21H3v-6" />
                <path d="M21 3l-7 7" />
                <path d="M3 21l7-7" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-ink mb-0.5">Keyboard shortcut</p>
              <p className="text-[13px] text-steel leading-relaxed">
                Press <kbd className="px-1 py-0.5 bg-canvas rounded text-[12px] border border-hairline">Ctrl+Shift+J</kbd> (Windows/Linux) or <kbd className="px-1 py-0.5 bg-canvas rounded text-[12px] border border-hairline">Cmd+Shift+J</kbd> (macOS).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy note */}
      <div className="rounded-xl border border-hairline-soft bg-canvas p-5 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-ink mb-1">Privacy-first by design</p>
            <p className="text-[13px] text-steel leading-relaxed">
              The extension only reads the current page when you click its icon, use
              the right-click menu, or press the keyboard shortcut. It never runs in
              the background, never tracks your browsing history, and never collects
              data passively. No page content is ever transmitted without your
              explicit action.
            </p>
          </div>
        </div>
      </div>

      {/* Details strip */}
      <div className="rounded-xl border border-hairline-soft bg-canvas p-5 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px]">
          <div>
            <p className="font-medium text-ink mb-0.5">Permissions</p>
            <p className="text-steel leading-relaxed">
              Only <code className="px-1 py-0.5 bg-surface rounded text-[12px]">activeTab</code>,{' '}
              <code className="px-1 py-0.5 bg-surface rounded text-[12px]">scripting</code>, and{' '}
              <code className="px-1 py-0.5 bg-surface rounded text-[12px]">contextMenus</code>.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink mb-0.5">Version</p>
            <p className="text-steel">{EXT_VERSION}</p>
          </div>
          <div>
            <p className="font-medium text-ink mb-0.5">Open source</p>
            <p className="text-steel leading-relaxed">
              <a href="https://github.com/NiranjananPrajith/JobFoocus" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                View on GitHub
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Manual install (collapsible) */}
      <div className="mb-8">
        <button
          onClick={() => setShowManual(!showManual)}
          className="flex items-center justify-between w-full px-5 py-3 rounded-xl border border-hairline-soft bg-canvas text-[14px] font-medium text-ink hover:bg-surface transition-colors"
        >
          <span>For developers: manual install</span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform ${showManual ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {showManual && (
          <ol className="mt-4 space-y-4">
            {STEPS.map((step, idx) => (
              <li
                key={idx}
                className="rounded-xl border border-hairline-soft bg-canvas p-5 flex gap-4"
              >
                <div
                  className="shrink-0 w-8 h-8 rounded-full bg-primary text-white text-[14px] font-semibold flex items-center justify-center"
                  aria-hidden
                >
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-ink mb-1">{step.title(browser)}</h3>
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
        )}
      </div>

      {/* Back link */}
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
