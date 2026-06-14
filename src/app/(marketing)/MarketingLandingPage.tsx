'use client'

import { useState } from 'react'
import Link from 'next/link'
import Card from '@/components/design/Card'
import Badge from '@/components/design/Badge'
import SunsetStripeBand from '@/components/design/sunset-stripe-band'
import ThemeToggle from '@/components/ThemeToggle'
import Button from '@/components/design/Button'

const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/dddmilcbgjmfidicpahglaflfjfcnjl'

const faqItems = [
  {
    q: 'Is my data stored on your servers?',
    a: 'No. All job postings, resumes, and cover letters stay in your browser\'s local storage. We never upload your data anywhere — the AI processing happens on-demand and nothing is retained after the document is generated.',
  },
  {
    q: 'How much does it cost?',
    a: 'Job Foocus is free to start with daily usage caps. Paid tiers unlock higher limits for power users. There is no credit card required to begin.',
  },
  {
    q: 'Which browsers are supported?',
    a: 'Chrome, Firefox, and all Chromium-based browsers (Edge, Brave, Opera, Vivaldi, Arc, Zen). Install the extension from the Chrome Web Store or Firefox Add-ons.',
  },
]

export default function MarketingLandingPage() {
  const [navOpen, setNavOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({})

  const toggleFaq = (index: number) => {
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Header — glassmorphism nav */}
      {/* ------------------------------------------------------------------ */}
      <header
        className="sticky top-0 z-50 w-full no-print bg-canvas/80 backdrop-blur-md border-b border-hairline-soft"
        style={{ height: '64px' }}
      >
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img
              src="/icon_wide.webp"
              alt="Job Foocus"
              className="h-7 object-contain"
            />
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-[14px] text-steel hover:text-ink font-medium transition-colors"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              How it Works
            </a>
            <a
              href="#privacy"
              className="text-[14px] text-steel hover:text-ink font-medium transition-colors"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Privacy
            </a>
            <a
              href="#faq"
              className="text-[14px] text-steel hover:text-ink font-medium transition-colors"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              FAQ
            </a>
          </nav>

          {/* Desktop right: toggle + CTA + hamburger */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex px-4 py-2 text-[14px] rounded-md font-medium text-white transition-colors duration-150"
              style={{
                backgroundColor: 'var(--primary)',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--primary-deep)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--primary)')
              }
            >
              Add Extension — It&apos;s Free
            </a>

            {/* Hamburger — mobile only */}
            <div className="relative md:hidden">
              <button
                onClick={() => setNavOpen(!navOpen)}
                className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors"
                style={{
                  borderColor: navOpen
                    ? 'var(--primary-deep)'
                    : 'var(--primary)',
                  backgroundColor: navOpen ? 'var(--cream)' : 'transparent',
                }}
                aria-label="Menu"
              >
                {navOpen ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>

              {navOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-canvas rounded-xl border border-hairline-soft shadow-lg z-50 overflow-hidden">
                  <div className="py-2">
                    <a
                      href="#features"
                      onClick={() => setNavOpen(false)}
                      className="block px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors"
                    >
                      How it Works
                    </a>
                    <a
                      href="#privacy"
                      onClick={() => setNavOpen(false)}
                      className="block px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors"
                    >
                      Privacy
                    </a>
                    <a
                      href="#faq"
                      onClick={() => setNavOpen(false)}
                      className="block px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors"
                    >
                      FAQ
                    </a>
                    <div className="border-t border-hairline-soft my-1" />
                    <a
                      href={CHROME_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setNavOpen(false)}
                      className="block px-4 py-2.5 text-[13px] text-primary font-medium hover:bg-surface transition-colors"
                    >
                      Add Extension →
                    </a>
                    <div className="border-t border-hairline-soft my-1" />
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-[13px] text-ink" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        Theme
                      </span>
                      <ThemeToggle />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Optimized Hero Section with Static Vector Contrasts */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative w-full overflow-hidden bg-[#0c0d0b] pt-16 pb-24 lg:pt-24 lg:pb-36 px-6 border-b border-white/5">

        {/* Localized Sunset Glow - Positioned exclusively behind the right-side mockup */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-30 mix-blend-screen pointer-events-none hidden lg:block"
          style={{
            background: 'radial-gradient(circle, rgba(250,82,15,0.7) 0%, rgba(255,161,16,0.3) 50%, rgba(0,0,0,0) 70%)',
            filter: 'blur(80px)',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left Column: Scannable Copy Column (6 Cols) */}
          <div className="lg:col-span-6 xl:col-span-5 max-w-xl">
            {/* Eyebrow - Changed from orange to high-contrast sunset gold */}
            <span className="inline-block text-[11px] font-bold uppercase tracking-[1.5px] text-[#ffd06a] mb-4">
              Now Available on Chrome &amp; Firefox
            </span>

            <h1
              className="text-[52px] sm:text-[64px] lg:text-[76px] text-white leading-[1.05] tracking-[-1.5px] mb-6"
              style={{ fontFamily: '"PP Editorial Old", "Times New Roman", Georgia, serif' }}
            >
              Your job hunt.<br />Beautifully organized.
            </h1>

            {/* Body Text - Swapped stone for high-contrast light zinc */}
            <p className="text-[17px] sm:text-[18px] text-zinc-300 leading-[1.50] mb-8 font-sans">
              Spreadsheets belong in finance, not your career. Job Foocus is the elegant browser extension that clips listings, drafts cover letters, and tracks your trajectory in one click.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="primary" className="text-[15px] px-8 py-3.5 flex items-center justify-center gap-2">
                  <span>Add Extension</span>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Button>
              </a>
              <a href="#features">
                <Button
                  variant="secondary"
                  className="text-[15px] px-8 py-3.5 !text-white !border-white/20 hover:!border-white/40 hover:!bg-white/5 flex items-center justify-center transition-all"
                >
                  See how it works
                </Button>
              </a>
            </div>
          </div>

          {/* Right Column: Dynamic Mockup with hardcoded styles to prevent Dark Mode bleeding (6 Cols) */}
          <div className="lg:col-span-6 xl:col-span-7 relative w-full flex justify-center">

            {/* Outer Simulated Browser Window */}
            <div className="relative w-full max-w-[580px] aspect-[1.4] bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">

              {/* Browser Controls */}
              <div className="flex items-center px-4 py-3 border-b border-white/10 bg-white/5 justify-between">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                {/* Address bar optimized for Naukri.com reference */}
                <div className="bg-white/5 rounded px-6 py-0.5 text-[10px] text-zinc-400 font-mono select-none">
                  naukri.com/job/google-ux-designer
                </div>
                <div className="w-12" />
              </div>

              {/* Simulated Content inside Browser */}
              <div className="p-6 h-full flex flex-col justify-between">

                {/* Fake Job Board Post Background */}
                <div className="opacity-45" style={{ filter: 'blur(0.3px)' }}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="h-6 w-32 bg-white/20 rounded mb-2" />
                      <div className="h-4 w-48 bg-white/10 rounded" />
                    </div>
                    <div className="h-10 w-24 bg-white/10 rounded-md" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 w-full bg-white/10 rounded" />
                    <div className="h-3 w-[90%] bg-white/10 rounded" />
                    <div className="h-3 w-[95%] bg-white/10 rounded" />
                  </div>
                </div>

                {/* Overlapping Extension UI Panel - Styles hardcoded to ignore theme toggles */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[90%] sm:w-[380px] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-6"
                  style={{ background: '#fff8e0', color: '#1f1f1f', border: '1px solid #e6d5a8' }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-sm flex items-center justify-center font-bold text-[10px]"
                        style={{ backgroundColor: '#fa520f', color: '#ffffff' }}
                      >
                        F
                      </div>
                      <span className="text-[12px] font-bold uppercase tracking-[1px] font-sans" style={{ color: '#1f1f1f' }}>
                        Job Foocus
                      </span>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ backgroundColor: '#fff0c2', color: '#1f1f1f' }}
                    >
                      Prospect
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Extraction Status Row with Google Reference */}
                    <div className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#ffffff', border: '1px solid #e6d5a8' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-green-600" style={{ backgroundColor: '#f0fdf4' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold" style={{ color: '#1f1f1f' }}>Senior UX Designer</p>
                          <p className="text-[11px]" style={{ color: '#6a6a6a' }}>Google &bull; Bengaluru, IN</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: '#fa520f' }}>Clipped</span>
                    </div>

                    {/* Tailored Cover Letter Generation Box */}
                    <div className="rounded-lg p-3" style={{ backgroundColor: '#ffffff', border: '1px solid #e6d5a8' }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[12px] font-semibold" style={{ color: '#6a6a6a' }}>Custom Cover Letter</p>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase"
                          style={{ backgroundColor: 'rgba(250,82,15,0.1)', color: '#fa520f' }}
                        >
                          Draft Ready
                        </span>
                      </div>
                      <div className="space-y-1.5 opacity-70">
                        <div className="h-1.5 w-full rounded" style={{ backgroundColor: 'rgba(106,106,106,0.2)' }} />
                        <div className="h-1.5 w-[90%] rounded" style={{ backgroundColor: 'rgba(106,106,106,0.2)' }} />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Logo Wall (Optimized for Global & Indian Job Portals) */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-12 border-b border-hairline-soft bg-canvas px-6">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8 opacity-60 grayscale">
          <p className="text-[14px] text-steel font-semibold uppercase tracking-[1px]">
            Works seamlessly with
          </p>
          <div className="flex flex-wrap items-center gap-8 md:gap-12 font-bold text-[20px] md:text-[24px] text-stone">
            <span>Naukri.com</span>
            <span>LinkedIn</span>
            <span>Indeed</span>
            <span>Google Careers</span>
            <span>Workday</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Features Grid — 3-up */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-20 md:py-24 px-4 md:px-6" id="features">
        <div className="max-w-[1280px] mx-auto">
          <div className="mb-14">
            <h2
              className="text-[36px] md:text-[48px] lg:text-[52px] text-ink leading-[1.15] tracking-[-0.5px]"
              style={{
                fontFamily:
                  '"PP Editorial Old", "Times New Roman", Georgia, serif',
              }}
            >
              Everything you need in one tab.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <Card
              variant="elevated"
              className="p-8 hover:-translate-y-1 transition-transform duration-300 flex flex-col items-start"
            >
              <div
                className="w-12 h-12 rounded-md flex items-center justify-center mb-6"
                style={{
                  backgroundColor: 'var(--cream)',
                  border: '1px solid var(--beige-deep)',
                  color: 'var(--primary)',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3
                className="text-[20px] md:text-[22px] font-medium text-ink mb-3"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Save Jobs Instantly
              </h3>
              <p
                className="text-[15px] md:text-[16px] text-steel leading-[1.55]"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Click the extension while viewing any job post. We automatically
                pull the title, company, and details into your tracker.
              </p>
            </Card>

            {/* Card 2 */}
            <Card
              variant="elevated"
              className="p-8 hover:-translate-y-1 transition-transform duration-300 flex flex-col items-start"
            >
              <div
                className="w-12 h-12 rounded-md flex items-center justify-center mb-6"
                style={{
                  backgroundColor: 'var(--cream)',
                  border: '1px solid var(--beige-deep)',
                  color: 'var(--primary)',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3
                className="text-[20px] md:text-[22px] font-medium text-ink mb-3"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Tailored Cover Letters
              </h3>
              <p
                className="text-[15px] md:text-[16px] text-steel leading-[1.55]"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Stop writing from scratch. The extension uses your master resume
                to instantly draft a cover letter matching the job&apos;s exact
                needs.
              </p>
            </Card>

            {/* Card 3 */}
            <Card
              variant="elevated"
              className="p-8 hover:-translate-y-1 transition-transform duration-300 flex flex-col items-start"
            >
              <div
                className="w-12 h-12 rounded-md flex items-center justify-center mb-6"
                style={{
                  backgroundColor: 'var(--cream)',
                  border: '1px solid var(--beige-deep)',
                  color: 'var(--primary)',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    ry="2"
                  />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <h3
                className="text-[20px] md:text-[22px] font-medium text-ink mb-3"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Visual Pipeline
              </h3>
              <p
                className="text-[15px] md:text-[16px] text-steel leading-[1.55]"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Never lose track of a follow-up. View your entire application
                history on a beautiful, distraction-free dashboard.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* UI Dashboard Mockup — replaces IDE code block */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-20 md:py-24 px-4 md:px-6 bg-surface">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                className="text-[36px] md:text-[48px] lg:text-[52px] text-ink leading-[1.15] tracking-[-0.5px] mb-6"
                style={{
                  fontFamily:
                    '"PP Editorial Old", "Times New Roman", Georgia, serif',
                }}
              >
                Clarity at a glance.
              </h2>
              <p
                className="text-[16px] md:text-[18px] text-steel leading-[1.50] mb-6"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Say goodbye to chaotic spreadsheets. Your dashboard automatically
                tracks response rates, flags applications that need follow-ups,
                and keeps your entire career journey in focus.
              </p>
            </div>

            {/* App UI Mockup */}
            <div className="relative w-full h-[400px] flex items-center justify-center">
              {/* Background decorative card */}
              <div
                className="absolute right-0 top-4 w-3/4 rounded-xl shadow-lg p-6 scale-95 origin-top-right"
                style={{
                  backgroundColor: 'var(--canvas)',
                  border: '1px solid var(--hairline-strong)',
                  opacity: 0.6,
                }}
              >
                <div
                  className="h-4 w-1/3 rounded mb-4"
                  style={{ backgroundColor: 'var(--hairline-soft)' }}
                />
                <div
                  className="h-3 w-1/4 rounded"
                  style={{ backgroundColor: 'var(--hairline-soft)' }}
                />
              </div>

              {/* Foreground active card */}
              <div
                className="relative z-10 w-[85%] rounded-xl shadow-xl p-6"
                style={{
                  backgroundColor: 'var(--canvas)',
                  border: '1px solid var(--hairline-soft)',
                }}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4
                      className="text-[18px] font-semibold text-ink"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      Frontend Engineer
                    </h4>
                    <p
                      className="text-[15px] mt-1"
                      style={{
                        color: 'var(--steel)',
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }}
                    >
                      Mistral AI &bull; Paris, France
                    </p>
                  </div>
                  <Badge status="interview" />
                </div>

                <div className="flex gap-2 mb-6">
                  <span
                    className="px-3 py-1 rounded-full text-[12px] font-medium"
                    style={{
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    Tech Support
                  </span>
                  <span
                    className="px-3 py-1 rounded-full text-[12px] font-medium"
                    style={{
                      backgroundColor: 'var(--surface)',
                      color: 'var(--steel)',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    Applied 2d ago
                  </span>
                </div>

                <div
                  className="flex gap-3 pt-4"
                  style={{ borderTop: '1px solid var(--hairline-soft)' }}
                >
                  <a
                    href={CHROME_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center py-2 text-[13px] font-medium rounded-md transition-colors duration-150"
                    style={{
                      color: 'var(--ink)',
                      border: '1px solid var(--hairline-strong)',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        'var(--surface)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    View Cover Letter
                  </a>
                  <a
                    href={CHROME_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center py-2 text-[13px] font-medium rounded-md text-white transition-colors duration-150"
                    style={{
                      backgroundColor: 'var(--primary)',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        'var(--primary-deep)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        'var(--primary)')
                    }
                  >
                    Update Status
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Privacy Banner */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-20 md:py-24 px-4 md:px-6" id="privacy">
        <div className="max-w-[1280px] mx-auto">
          <Card
            variant="cream"
            className="p-10 md:p-16 text-center border-2 border-beige-deep shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'var(--canvas)',
                border: '1px solid var(--beige-deep)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--primary)' }}
              >
                <rect
                  x="3"
                  y="11"
                  width="18"
                  height="11"
                  rx="2"
                  ry="2"
                />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2
              className="text-[34px] md:text-[44px] lg:text-[52px] text-ink leading-[1.15] tracking-[-0.5px] mb-6"
              style={{
                fontFamily:
                  '"PP Editorial Old", "Times New Roman", Georgia, serif',
              }}
            >
              Your data stays on your machine.
            </h2>
            <p
              className="text-[16px] md:text-[18px] leading-[1.50] max-w-2xl mx-auto mb-8"
              style={{
                color: 'var(--charcoal)',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              We believe your career data is private. Job Foocus operates
              entirely within your browser. No required accounts, no hidden
              cloud databases, and zero tracking.
            </p>
            <Link
              href="/privacy-policy"
              className="inline-flex items-center justify-center px-6 py-3 text-[14px] font-medium rounded-md transition-colors duration-150"
              style={{
                color: 'var(--on-cream)',
                border: '1px solid var(--beige-deep)',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  'var(--cream-deeper)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = 'transparent')
              }
            >
              Read our Privacy Promise
            </Link>
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FAQ */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="py-20 md:py-24 px-4 md:px-6 border-y border-hairline-soft"
        id="faq"
        style={{ backgroundColor: 'var(--surface-cream-soft)' }}
      >
        <div className="max-w-[800px] mx-auto">
          <h2
            className="text-[28px] md:text-[34px] text-ink leading-[1.15] tracking-[-0.01em] text-center mb-10"
            style={{
              fontFamily:
                '"PP Editorial Old", "Times New Roman", Georgia, serif',
            }}
          >
            Frequently Asked Questions
          </h2>

          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className="rounded-lg border overflow-hidden transition-colors"
                style={{
                  backgroundColor: 'var(--cream-light)',
                  borderColor: 'var(--beige-deep)',
                }}
              >
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  aria-expanded={faqOpen[i] || false}
                >
                  <span className="text-[15px] font-medium text-ink">
                    {item.q}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 ml-4"
                    style={{
                      transform: faqOpen[i]
                        ? 'rotate(180deg)'
                        : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {faqOpen[i] && (
                  <div className="px-5 pb-4">
                    <p
                      className="text-[14px] text-steel leading-relaxed"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Sunset Stripe */}
      {/* ------------------------------------------------------------------ */}
      <SunsetStripeBand />

      {/* ------------------------------------------------------------------ */}
      {/* Footer */}
      {/* ------------------------------------------------------------------ */}
      <footer
        className="w-full py-14 px-6 no-print"
        style={{
          backgroundColor: 'var(--footer-cream)',
          borderTop: '1px solid var(--beige-deep)',
        }}
      >
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <a href="/" className="flex items-center gap-2 mb-4">
              <img
                src="/icon_wide.webp"
                alt="Job Foocus"
                className="h-8 object-contain grayscale opacity-80"
              />
            </a>
            <p
              className="text-[14px] text-steel leading-relaxed max-w-xs"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              The elegant, private extension for professionals who want to own
              their job search.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4
              className="text-[11px] font-bold uppercase tracking-[1px] mb-4"
              style={{
                color: 'var(--ink)',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Product
            </h4>
            <ul className="space-y-2 text-[14px]">
              <li>
                <a
                  href={CHROME_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:underline"
                  style={{
                    color: 'var(--steel)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = 'var(--primary)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = 'var(--steel)')
                  }
                >
                  Add Extension
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="transition-colors hover:underline"
                  style={{
                    color: 'var(--steel)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = 'var(--primary)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = 'var(--steel)')
                  }
                >
                  How it works
                </a>
              </li>
              <li>
                <Link
                  href="/support"
                  className="transition-colors hover:underline"
                  style={{
                    color: 'var(--steel)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = 'var(--primary)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = 'var(--steel)')
                  }
                >
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4
              className="text-[11px] font-bold uppercase tracking-[1px] mb-4"
              style={{
                color: 'var(--ink)',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Legal
            </h4>
            <ul className="space-y-2 text-[14px]">
              <li>
                <Link
                  href="/privacy-policy"
                  className="transition-colors hover:underline"
                  style={{
                    color: 'var(--steel)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = 'var(--primary)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = 'var(--steel)')
                  }
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-service"
                  className="transition-colors hover:underline"
                  style={{
                    color: 'var(--steel)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = 'var(--primary)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = 'var(--steel)')
                  }
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-[1280px] mx-auto">
          <div
            className="pt-6 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--beige-deep)' }}
          >
            <span
              className="text-[12px] text-steel"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              &copy; 2026 Job Foocus. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </>
  )
}
