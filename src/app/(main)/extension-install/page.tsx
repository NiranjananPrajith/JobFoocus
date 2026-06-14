'use client'

import Link from 'next/link';

const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/dddmilicbgjmfidicpahglaflfjfcnjl';
const FIREFOX_ADDON_URL = 'https://addons.mozilla.org/en-CA/firefox/addon/jobfoocus/';
const EXT_VERSION = '1.2.0';

interface BrowserEntry {
  id: string;
  name: string;
  logo: string;
  store: 'chrome' | 'firefox';
}

const BROWSER_GROUPS: { group: string; browsers: BrowserEntry[] }[] = [
  {
    group: 'Chromium-based',
    browsers: [
      { id: 'chrome', name: 'Chrome', logo: '/extensions/browser-logos/chrome-logo.svg', store: 'chrome' },
      { id: 'edge', name: 'Edge', logo: '/extensions/browser-logos/edge-logo.svg', store: 'chrome' },
      { id: 'brave', name: 'Brave', logo: '/extensions/browser-logos/brave-logo.svg', store: 'chrome' },
      { id: 'opera', name: 'Opera', logo: '/extensions/browser-logos/opera-logo.svg', store: 'chrome' },
      { id: 'vivaldi', name: 'Vivaldi', logo: '/extensions/browser-logos/vivaldi-logo.svg', store: 'chrome' },
      { id: 'arc', name: 'Arc', logo: '/extensions/browser-logos/arc-logo.svg', store: 'chrome' },
    ],
  },
  {
    group: 'Firefox-based',
    browsers: [
      { id: 'firefox', name: 'Firefox', logo: '/extensions/browser-logos/firefox-logo.svg', store: 'firefox' },
      { id: 'zen', name: 'Zen', logo: '/extensions/browser-logos/zen-logo.svg', store: 'firefox' },
    ],
  },
];

export default function ExtensionInstallPage() {
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

      {/* Browser grid */}
      {BROWSER_GROUPS.map((group) => (
        <div key={group.group} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[18px] font-semibold text-ink">{group.group}</h2>
            <div className="flex-1 border-t border-hairline-soft" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {group.browsers.map((b) => (
              <a
                key={b.id}
                href={b.store === 'chrome' ? CHROME_STORE_URL : FIREFOX_ADDON_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-2 rounded-xl border border-hairline-soft bg-canvas p-5 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
              >
                <img
                    src={b.logo}
                    alt={`${b.name} logo`}
                    className="w-12 h-12 object-contain"
                  />
                <p className="text-[14px] font-medium text-ink">{b.name}</p>
                <span className="text-[11px] text-steel group-hover:text-primary transition-colors">
                  Install{b.store === 'chrome' ? ' from Chrome Web Store' : ' from Firefox Add-ons'}
                </span>
              </a>
            ))}
          </div>
        </div>
      ))}

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
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
        </div>
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
