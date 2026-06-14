'use client'

import { useState } from 'react'
import Link from 'next/link'
import Card from '@/components/design/Card'
import SunsetStripeBand from '@/components/design/sunset-stripe-band'

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
      {/* Header */}
      {/* ------------------------------------------------------------------ */}
      <header
        className="sticky top-0 z-50 w-full no-print bg-canvas"
        style={{
          borderBottom: '1px solid var(--hairline-soft)',
          height: '64px',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/icon_wide.webp"
              alt="Job Foocus"
              className="h-8 object-contain"
            />
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/features"
              className="px-3 py-2 text-[14px] font-medium text-steel hover:text-ink transition-colors"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Features
            </Link>
            <Link
              href="/privacy-policy"
              className="px-3 py-2 text-[14px] font-medium text-steel hover:text-ink transition-colors"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Privacy
            </Link>
            <a
              href="#faq"
              className="px-3 py-2 text-[14px] font-medium text-steel hover:text-ink transition-colors"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              FAQ
            </a>
          </div>

          {/* Desktop CTA + mobile hamburger */}
          <div className="flex items-center gap-3">
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
              Add to Chrome
            </a>

            {/* Hamburger */}
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
                    <Link
                      href="/features"
                      onClick={() => setNavOpen(false)}
                      className="block px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors"
                    >
                      Features
                    </Link>
                    <Link
                      href="/privacy-policy"
                      onClick={() => setNavOpen(false)}
                      className="block px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors"
                    >
                      Privacy
                    </Link>
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
                      Add to Chrome →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative bg-ink overflow-hidden">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute top-[-150px] right-[-80px] w-[500px] h-[500px] rounded-full bg-primary opacity-40 mix-blend-screen blur-[80px]" />
          <div className="absolute bottom-[-150px] left-[-80px] w-[450px] h-[450px] rounded-full bg-sunshine-500 opacity-30 mix-blend-screen blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-primary via-sunshine-500 to-yellow-saturated opacity-20 mix-blend-screen blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-[1280px] mx-auto px-4 md:px-6 py-24 md:py-32 lg:py-40">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-white text-[44px] md:text-[64px] lg:text-[84px] leading-[1.1] tracking-[-0.02em] mb-6">
              Your Career Frontier.
              <br />
              <span style={{ color: 'var(--primary)' }}>In your hands.</span>
            </h1>
            <p
              className="text-on-dark-muted text-[16px] md:text-[18px] leading-relaxed max-w-2xl mx-auto mb-10"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              A browser extension that clips job descriptions, writes tailored
              cover letters, and tracks your pipeline — all without sending your
              data to a server.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={CHROME_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 text-[16px] font-medium rounded-md text-white transition-colors duration-150"
                style={{
                  backgroundColor: 'var(--primary)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    'var(--primary-deep)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = 'var(--primary)')
                }
              >
                Install Extension
              </a>
              <Link
                href="/features"
                className="inline-flex items-center justify-center px-8 py-4 text-[16px] font-medium rounded-md transition-colors duration-150"
                style={{
                  color: 'var(--on-dark)',
                  border: '1px solid var(--stone)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                Read Documentation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Logo Wall */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-12 md:py-16 border-b border-hairline-soft">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
            <span
              className="text-[13px] text-steel font-medium tracking-wide uppercase"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Seamlessly extracts from
            </span>
            {['LinkedIn', 'Indeed', 'Greenhouse', 'Workday'].map((name) => (
              <span
                key={name}
                className="text-[14px] text-ink font-semibold"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Features Grid — 3-up */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-16 md:py-24" id="features">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-ink text-[32px] md:text-[40px] leading-[1.15] tracking-[-0.01em] mb-4">
              Everything you need, nothing you don&apos;t.
            </h2>
            <p
              className="text-steel text-[15px] md:text-[16px] max-w-lg mx-auto"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Three tools that turn job hunting from a spreadsheet chore into a
              streamlined workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <Card variant="elevated" className="flex flex-col items-start">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center mb-4"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <h3
                className="text-[18px] font-semibold text-ink mb-2"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                One-Click Clipping
              </h3>
              <p
                className="text-[14px] text-steel leading-relaxed"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Click the extension icon on any job posting to instantly
                capture the title, company, description, and requirements —
                no copy-pasting, no manual entry.
              </p>
            </Card>

            {/* Card 2 */}
            <Card variant="elevated" className="flex flex-col items-start">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center mb-4"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z" />
                  <path d="M20 12a8 8 0 1 1-16 0" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h3
                className="text-[18px] font-semibold text-ink mb-2"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Local LLM Generation
              </h3>
              <p
                className="text-[14px] text-steel leading-relaxed"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Generate ATS-optimized cover letters and tailored resumes
                powered by a local-aware AI model. Your data is never sent to
                a third-party API.
              </p>
            </Card>

            {/* Card 3 */}
            <Card variant="elevated" className="flex flex-col items-start">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center mb-4"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h3
                className="text-[18px] font-semibold text-ink mb-2"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Pipeline Analytics
              </h3>
              <p
                className="text-[14px] text-steel leading-relaxed"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Track your applications through status stages, monitor your
                response rate, and get daily follow-up reminders so no
                opportunity falls through the cracks.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* IDE Mockup */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-16 md:py-24 bg-surface">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-ink text-[32px] md:text-[40px] leading-[1.15] tracking-[-0.01em] mb-4">
                Structured data, every time.
              </h2>
              <p
                className="text-steel text-[15px] md:text-[16px] leading-relaxed mb-6"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                No more parsing messy job boards. The extension extracts clean,
                structured fields from any supported site and stores them
                locally — ready for your dashboard.
              </p>
              <Link
                href="/features"
                className="text-[14px] font-medium transition-colors"
                style={{
                  color: 'var(--primary)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                See how it works →
              </Link>
            </div>

            <div
              className="rounded-lg overflow-hidden border"
              style={{
                backgroundColor: 'var(--surface-code)',
                borderColor: 'var(--hairline-strong)',
              }}
            >
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{
                  borderBottom: '1px solid var(--hairline-strong)',
                }}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: 'var(--stone)' }}
                />
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: 'var(--stone)' }}
                />
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: 'var(--stone)' }}
                />
                <span
                  className="ml-3 text-[12px]"
                  style={{
                    color: 'var(--muted)',
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                  }}
                >
                  job-data.json
                </span>
              </div>
              <pre
                className="px-4 py-5 text-[13px] leading-relaxed overflow-x-auto"
                style={{
                  color: 'var(--on-dark-muted)',
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                }}
              >
{`{
  "title":        "Senior Frontend Engineer",
  "company":      "Acme Corp",
  "location":     "San Francisco, CA",
  "salary":       "$160k – $210k",
  "description":  "We are looking for...",
  "requirements": [
    "React, TypeScript, Next.js",
    "8+ years experience"
  ],
  "status":       "saved"
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Privacy Banner */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-16 md:py-24" id="privacy">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6">
          <Card
            variant="cream"
            className="max-w-3xl mx-auto text-center p-8 md:p-12"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="font-display text-ink text-[28px] md:text-[34px] leading-[1.15] tracking-[-0.01em] mb-4">
              Your data never leaves your machine.
            </h2>
            <p
              className="text-steel text-[15px] md:text-[16px] leading-relaxed max-w-lg mx-auto mb-6"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Every job description, resume, and cover letter stays in your
              browser&apos;s local storage. No cloud upload, no data mining,
              no third-party access. <strong>Privacy isn&apos;t a feature —
              it&apos;s the foundation.</strong>
            </p>
            <Link
              href="/privacy-policy"
              className="inline-flex items-center justify-center px-6 py-3 text-[14px] font-medium rounded-md transition-colors duration-150"
              style={{
                color: 'var(--on-cream)',
                border: '1px solid var(--beige-deep)',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--cream-deeper)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              Read our Privacy Promise
            </Link>
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FAQ */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-16 md:py-24 bg-surface-cream-soft border-y border-hairline-soft" id="faq">
        <div className="max-w-[800px] mx-auto px-4 md:px-6">
          <h2 className="font-display text-ink text-[28px] md:text-[34px] leading-[1.15] tracking-[-0.01em] text-center mb-10">
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
                    className="shrink-0 ml-4 transition-transform duration-200"
                    style={{
                      transform:
                        faqOpen[i] ? 'rotate(180deg)' : 'rotate(0deg)',
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
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <img
                  src="/icon_wide.webp"
                  alt="Job Foocus"
                  className="h-8 object-contain"
                />
              </Link>
              <p
                className="text-[14px] text-steel leading-relaxed max-w-[220px]"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Track your job applications with confidence.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4
                className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink mb-4"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Product
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/features"
                    className="text-[14px] text-primary hover:underline"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <a
                    href={CHROME_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] text-primary hover:underline"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Extension
                  </a>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-[14px] text-primary hover:underline"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4
                className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink mb-4"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Legal
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy-policy"
                    className="text-[14px] text-primary hover:underline"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-of-service"
                    className="text-[14px] text-primary hover:underline"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4
                className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink mb-4"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Connect
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] text-primary hover:underline"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] text-primary hover:underline"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    X
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] text-primary hover:underline"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div
            className="pt-6 flex items-center justify-between border-t"
            style={{ borderColor: 'var(--beige-deep)' }}
          >
            <span
              className="text-[12px] text-steel"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              © 2026 Job Foocus. All rights reserved.
            </span>
            <span
              className="text-[12px] text-steel"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              v1.0.0
            </span>
          </div>
        </div>
      </footer>
    </>
  )
}
