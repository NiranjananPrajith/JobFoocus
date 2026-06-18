'use client'

import { useState } from 'react'
import Card from '@/components/design/Card'
import Badge from '@/components/design/Badge'
import Button from '@/components/design/Button'

const faqItems = [
  {
    q: 'What does Job Foocus actually do?',
    a: 'Job Foocus turns a job description into a tailored resume and cover letter in one click. Upload your master resume once, then browse any job posting — click the extension, and it captures the job, generates ATS-optimized documents matched to that role, and files everything in your dashboard. No more copy-pasting or rewriting from scratch.',
  },
  {
    q: 'Is it free?',
    a: 'Yes — free forever with 5 job captures and 25 AI document edits per day. No credit card required. Paid plans start at $5/month for higher limits if you need more.',
  },
  {
    q: 'How does the browser extension work?',
    a: 'Install it once from the Chrome Web Store or Firefox Add-ons. When you\'re on any job posting — LinkedIn, Indeed, Glassdoor, a company career page — click the Job Foocus icon or use the right-click menu. It extracts the title, company, description, and location, then files it into your dashboard with one click. Works on Chrome, Firefox, Edge, Brave, Opera, Vivaldi, Arc, and Zen.',
  },
  {
    q: 'How does the AI tailoring work?',
    a: 'You upload your master resume — the full, unfiltered version with all your experience. When you capture a job, the AI analyzes both your resume and the job description, then generates a version that emphasizes the skills, experience, and keywords most relevant to that specific role. Your work history and education stay the same; the AI adjusts emphasis and wording to match. Cover letters follow the same process.',
  },
  {
    q: 'Are the generated documents ATS-friendly?',
    a: 'Yes. Job Foocus generates clean HTML that prints to PDF with ATS-safe formatting — no floats, no multi-column layouts, no text baked into images. Your resume passes through applicant tracking systems cleanly.',
  },
  {
    q: 'Is my data private?',
    a: 'Your resumes and job data are stored securely in your account and synced across your devices. Your personal information is never sent to AI models or third parties — AI processing happens on-demand and nothing is retained after document generation. You can export all your data or permanently delete your account at any time from Account settings.',
  },
]

export default function MarketingLandingPage() {
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({})

  const toggleFaq = (index: number) => {
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* 2. Responsive Light/Dark Hero Section */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative w-full overflow-hidden bg-canvas dark:bg-canvas pt-16 pb-24 lg:pt-24 lg:pb-36 px-6 border-b border-hairline dark:border-hairline transition-colors duration-200">
        
        {/* Light Mode Glow - Warm golden aura behind mockup */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-40 mix-blend-multiply pointer-events-none hidden lg:block dark:hidden"
          style={{
            background: 'radial-gradient(circle, rgba(250,82,15,0.12) 0%, rgba(255,208,106,0.18) 40%, rgba(255,240,210,0.08) 65%, rgba(0,0,0,0) 80%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Dark Mode Glow - Deep sunset gradient behind mockup */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-25 mix-blend-screen pointer-events-none hidden dark:lg:block"
          style={{
            background: 'radial-gradient(circle, rgba(250,82,15,0.6) 0%, rgba(255,161,16,0.25) 45%, rgba(0,0,0,0) 70%)',
            filter: 'blur(80px)',
          }}
        />
        
        <div className="relative z-10 max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Adaptive High-Legibility Typography */}
          <div className="lg:col-span-6 xl:col-span-5 max-w-xl">
            {/* Eyebrow - Dynamic color switch */}
            <span className="inline-block text-[11px] font-bold uppercase tracking-[1.5px] text-primary dark:text-sunshine-300 mb-4">
              Now Live &bull; Explore Your Free Workspace
            </span>
            
            <h1
              className="text-[52px] sm:text-[64px] lg:text-[76px] text-ink dark:text-ink leading-[1.05] tracking-[-1.5px] mb-6"
              style={{ fontFamily: '"PP Editorial Old", "Times New Roman", Georgia, serif' }}
            >
              Your job hunt.<br />Beautifully organized.
            </h1>
            
            <p className="text-[17px] sm:text-[18px] text-slate dark:text-slate leading-[1.50] mb-8 font-sans">
              Spreadsheets belong in finance, not your career. Create your private dashboard in 30 seconds to instantly track applications, sync across devices, and draft custom cover letters.
            </p>
            
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Primary CTA */}
                <a href="/signup">
                  <Button variant="primary" className="text-[15px] px-8 py-3.5 flex items-center justify-center gap-2">
                    <span>Get Started</span>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Button>
                </a>
                {/* Secondary Outline Button - Styled dynamically for light & dark boundaries */}
                <a href="#features">
                  <Button
                    variant="secondary"
                    className="text-[15px] px-8 py-3.5 border-hairline-strong text-ink hover:bg-black/5 dark:text-ink dark:border-hairline-strong dark:hover:bg-surface flex items-center justify-center transition-all"
                  >
                    See how it works
                  </Button>
                </a>
              </div>
              {/* Friction-reducing micro-copy */}
              <span className="text-[12px] text-steel dark:text-steel font-sans pl-1">
                ⚡ Sets up your custom dashboard instantly. No credit card required.
              </span>
            </div>
          </div>

          {/* Right Column: Simulated Browser Mockup (Adapts dynamically to theme) */}
          <div className="lg:col-span-6 xl:col-span-7 relative w-full flex justify-center">
            
            {/* Outer Browser Shell: Swaps colors based on system theme */}
            <div className="relative w-full max-w-[580px] aspect-[1.4] bg-canvas border border-hairline dark:border-hairline rounded-xl overflow-hidden shadow-xl dark:shadow-2xl transition-colors duration-200">
              
              {/* Browser Controls */}
              <div className="flex items-center px-4 py-3 border-b border-hairline dark:border-hairline bg-surface dark:bg-canvas justify-between">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="bg-canvas dark:bg-canvas rounded px-6 py-0.5 text-[10px] text-steel dark:text-steel font-mono select-none border border-hairline-soft dark:border-hairline">
                  naukri.com/job/google-ux-designer
                </div>
                <div className="w-12" />
              </div>

              {/* Simulated Content inside Browser */}
              <div className="p-6 h-full flex flex-col justify-between">
                
                {/* Fake Job Board Post Background Wireframe */}
                <div className="opacity-45" style={{ filter: 'blur(0.3px)' }}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="h-6 w-32 bg-hairline dark:bg-hairline-strong rounded mb-2" />
                      <div className="h-4 w-48 bg-hairline-soft dark:bg-hairline rounded" />
                    </div>
                    <div className="h-10 w-24 bg-hairline-soft dark:bg-hairline rounded-md" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 w-full bg-hairline-soft dark:bg-hairline rounded" />
                    <div className="h-3 w-[90%] bg-hairline-soft dark:bg-hairline rounded" />
                    <div className="h-3 w-[95%] bg-hairline-soft dark:bg-hairline rounded" />
                  </div>
                </div>

                {/* Overlapping Extension UI Panel — Fully theme-aware */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[90%] sm:w-[380px] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 bg-cream dark:bg-cream border border-beige-deep dark:border-hairline-strong"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <img
                        src="/icon.webp"
                        alt="JobFoocus"
                        className="w-5 h-5 rounded-sm object-cover"
                      />
                      <span className="text-[12px] font-bold uppercase tracking-[1px] font-sans text-on-cream">
                        Job Foocus
                      </span>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-cream-deeper text-on-cream"
                    >
                      Prospect
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Extraction Status Row */}
                    <div className="p-3 rounded-lg flex items-center justify-between bg-surface border border-beige-deep dark:border-hairline">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-green-600 bg-info-bg">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-on-cream">Senior UX Designer</p>
                          <div className="flex items-center gap-1.5">
                            <img src="/company-logos/google-logo.svg" alt="Google" className="w-3.5 h-3.5" />
                            <p className="text-[11px] text-steel">Google &bull; Bengaluru, IN</p>
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-primary">Clipped</span>
                    </div>

                    {/* Tailored Cover Letter Generation Box */}
                    <div className="rounded-lg p-3 bg-surface border border-beige-deep dark:border-hairline">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[12px] font-semibold text-steel">Custom Cover Letter</p>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase bg-primary/10 text-primary"
                        >
                          Draft Ready
                        </span>
                      </div>
                      <div className="space-y-1.5 opacity-70">
                        <div className="h-1.5 w-full rounded bg-steel/20" />
                        <div className="h-1.5 w-[90%] rounded bg-steel/20" />
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
      {/* Core Workflow (Pivoted to "Setup Account, then add utility") */}
      {/* ------------------------------------------------------------------ */}
      <section id="features" className="py-24 px-6 max-w-[1280px] mx-auto">
        <div className="mb-16">
          <h2
            className="text-[42px] md:text-[52px] text-ink leading-[1.15] tracking-[-0.5px]"
            style={{ fontFamily: '"PP Editorial Old", "Times New Roman", Georgia, serif' }}
          >
            Get set up in three simple steps.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card variant="elevated" className="p-8 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-md bg-cream border border-beige-deep flex items-center justify-center mb-6 text-primary">
              <span className="font-bold text-[18px]">1</span>
            </div>
            <h3 className="text-[22px] font-medium text-ink mb-3">Create Your Account</h3>
            <p className="text-[16px] text-steel leading-[1.55]">
              Instantly generate a private workspace. Fill in your baseline profile to lock in your job hunting headquarters.
            </p>
          </Card>

          <Card variant="elevated" className="p-8 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-md bg-cream border border-beige-deep flex items-center justify-center mb-6 text-primary">
              <span className="font-bold text-[18px]">2</span>
            </div>
            <h3 className="text-[22px] font-medium text-ink mb-3">Install Companion Tool</h3>
            <p className="text-[16px] text-steel leading-[1.55]">
              Download our lightweight, free browser extension to clip any job post and sync it directly to your dashboard in one click.
            </p>
          </Card>

          <Card variant="elevated" className="p-8 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-md bg-cream border border-beige-deep flex items-center justify-center mb-6 text-primary">
              <span className="font-bold text-[18px]">3</span>
            </div>
            <h3 className="text-[22px] font-medium text-ink mb-3">Track &amp; Target</h3>
            <p className="text-[16px] text-steel leading-[1.55]">
              Let our platform automatically map requirements to your resume, generate optimized cover letters, and track interview loops.
            </p>
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Product UI Proof */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 px-6 bg-surface">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                className="text-[42px] md:text-[52px] text-ink leading-[1.15] tracking-[-0.5px] mb-6"
                style={{ fontFamily: '"PP Editorial Old", "Times New Roman", Georgia, serif' }}
              >
                Clarity at a glance.
              </h2>
              <p className="text-[18px] text-steel leading-[1.50] mb-6">
                Say goodbye to chaotic spreadsheets. Your custom dashboard automatically tracks response rates, flags applications that need follow-ups, and keeps your entire career journey in focus.
              </p>
            </div>

            {/* Consumer-Friendly App UI Mockup */}
            <div className="relative w-full h-[400px] flex items-center justify-center">

              {/* Background decorative card */}
              <div className="absolute right-0 top-4 w-3/4 bg-surface border border-hairline-strong rounded-xl shadow-lg p-6 opacity-60 scale-95 origin-top-right">
                <div className="h-4 w-1/3 bg-hairline-soft rounded mb-4" />
                <div className="h-3 w-1/4 bg-hairline-soft rounded" />
              </div>

              {/* Foreground active card */}
              <div className="relative z-10 w-[85%] bg-canvas border border-hairline-soft rounded-xl shadow-xl p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-[18px] font-semibold text-ink">Senior UX Designer</h4>
                    <p className="text-[15px] text-steel mt-1">Google &bull; Bengaluru, IN</p>
                  </div>
                  <Badge status="interview" />
                </div>

                <div className="flex gap-2 mb-6">
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[12px] font-medium">Tech Support</span>
                  <span className="bg-surface text-steel px-3 py-1 rounded-full text-[12px] font-medium">Applied 2d ago</span>
                </div>

                <div className="flex gap-3 pt-4 border-t border-hairline-soft">
                  <Button variant="secondary" className="flex-1 py-2 text-[13px]">View Cover Letter</Button>
                  <Button variant="primary" className="flex-1 py-2 text-[13px]">Update Status</Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Privacy First Cream Banner - Adjusted to Support Dynamic Sync */}
      {/* ------------------------------------------------------------------ */}
      <section id="privacy" className="py-24 px-6 max-w-[1280px] mx-auto">
        <Card variant="cream" className="p-12 md:p-16 text-center border-2 border-beige-deep shadow-sm">
          <div className="w-16 h-16 mx-auto bg-canvas rounded-full flex items-center justify-center mb-6 shadow-sm border border-beige-deep">
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <h2
            className="text-[42px] md:text-[52px] text-ink leading-[1.15] tracking-[-0.5px] mb-6"
            style={{ fontFamily: '"PP Editorial Old", "Times New Roman", Georgia, serif' }}
          >
            Private account structure. Secure storage.
          </h2>
          <p className="text-[18px] text-charcoal leading-[1.50] max-w-2xl mx-auto mb-8">
            We believe your career data is yours. Job Foocus operates using private authentication and secure, custom-linked cloud sync options (including Google Drive, OneDrive, or Dropbox). No third-party data tracking, ever.
          </p>
        </Card>
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
    </>
  )
}
