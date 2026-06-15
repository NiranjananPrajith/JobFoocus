import FaqSection from './FaqSection';

export const metadata = {
  title: 'Support — Job Foocus',
};

/* ── Icon helpers ─────────────────────────────────────────────── */

function IconGettingStarted() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconWebsite() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconExtension() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function IconAccount() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-[2px]">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function SupportPage() {
  return (
    <div className="w-full">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="max-w-[768px] mx-auto">
          <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-primary mb-5">
            Support
          </p>
          <h1
            className="text-[40px] md:text-[52px] font-normal text-ink leading-[1.12] mb-5"
            style={{ fontFamily: 'PP Editorial Old, Times New Roman, serif', letterSpacing: '-0.5px' }}
          >
            How can we help?
          </h1>
          <p className="text-[18px] text-steel leading-[1.60] max-w-[540px]">
            Everything you need to get started with Job Foocus — from installing the extension to landing your next interview.
          </p>
        </div>
      </section>

      {/* ── Topic Grid ────────────────────────────────────────── */}
      <section className="px-6 pb-16">
        <div className="max-w-[768px] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="#getting-started" className="group flex items-start gap-4 p-5 rounded-xl transition-colors" style={{ backgroundColor: 'var(--cream)', border: '1px solid var(--beige-deep)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--cream-deeper)', border: '1px solid var(--beige-deep)' }}>
              <IconGettingStarted />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Getting Started</p>
              <p className="text-[13px] text-steel leading-relaxed">Create an account, upload your resume, and add your first job</p>
            </div>
          </a>
          <a href="#using-the-website" className="group flex items-start gap-4 p-5 rounded-xl transition-colors" style={{ backgroundColor: 'var(--cream)', border: '1px solid var(--beige-deep)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--cream-deeper)', border: '1px solid var(--beige-deep)' }}>
              <IconWebsite />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Using the Website</p>
              <p className="text-[13px] text-steel leading-relaxed">Add jobs, generate resumes, and track your applications</p>
            </div>
          </a>
          <a href="#browser-extension" className="group flex items-start gap-4 p-5 rounded-xl transition-colors" style={{ backgroundColor: 'var(--cream)', border: '1px solid var(--beige-deep)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--cream-deeper)', border: '1px solid var(--beige-deep)' }}>
              <IconExtension />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Browser Extension</p>
              <p className="text-[13px] text-steel leading-relaxed">Capture jobs from LinkedIn, Indeed, and any job board</p>
            </div>
          </a>
          <a href="#your-account" className="group flex items-start gap-4 p-5 rounded-xl transition-colors" style={{ backgroundColor: 'var(--cream)', border: '1px solid var(--beige-deep)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--cream-deeper)', border: '1px solid var(--beige-deep)' }}>
              <IconAccount />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Your Account</p>
              <p className="text-[13px] text-steel leading-relaxed">Manage subscription, usage limits, and data</p>
            </div>
          </a>
        </div>
      </section>

      {/* ── Quick Start ───────────────────────────────────────── */}
      <section id="getting-started" className="px-6 pb-16 scroll-mt-20">
        <div className="max-w-[768px] mx-auto">
          <div className="mb-8">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-primary mb-3">
              Quick Start
            </span>
            <h2 className="text-[28px] font-semibold text-ink leading-tight">
              Get up and running in 3 steps
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                step: '1',
                title: 'Create a free account',
                body: (
                  <>
                    Sign up at{' '}
                    <a href="https://jobfoocus.com" className="text-primary hover:underline font-medium">
                      jobfoocus.com
                    </a>{' '}
                    — no credit card required.
                  </>
                ),
              },
              {
                step: '2',
                title: 'Upload your master resume',
                body: 'This is the base resume Job Foocus tailors from. Add your work experience, education, and skills.',
              },
              {
                step: '3',
                title: 'Add your first job',
                body: 'Paste a job description or use the browser extension to capture it from any job board. Job Foocus generates a tailored resume and cover letter automatically.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-5 p-5 rounded-xl"
                style={{ backgroundColor: 'var(--canvas)', border: '1px solid var(--hairline-soft)' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[14px] font-semibold"
                  style={{ backgroundColor: '#fa520f', color: '#ffffff' }}
                >
                  {item.step}
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-ink mb-1">{item.title}</p>
                  <p className="text-[14px] text-steel leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[14px] text-steel mt-4">That&apos;s it. Job Foocus handles the rest.</p>
        </div>
      </section>

      {/* ── Using the Website (cream section) ─────────────────── */}
      <section id="using-the-website" className="scroll-mt-20" style={{ backgroundColor: 'var(--cream)' }}>
        <div className="px-6 py-16">
          <div className="max-w-[768px] mx-auto">
            <div className="mb-8">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-primary mb-3">
                Using the Website
              </span>
              <h2 className="text-[28px] font-semibold text-ink leading-tight">
                Everything you can do from the dashboard
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: 'Add a job manually',
                  items: [
                    'Go to your Dashboard',
                    'Click "Add Job"',
                    'Paste the job description, company, and title',
                    'Job Foocus files it under YYYY-MM-DD_Company_Title',
                  ],
                },
                {
                  title: 'Generate tailored documents',
                  items: [
                    'Open a job from your dashboard',
                    'Click "Save and generate resume & cover letter"',
                    'AI creates a tailored resume and cover letter',
                    'Review, edit, and download as PDF',
                  ],
                },
                {
                  title: 'Use the AI document editor',
                  items: [
                    'Open any generated document',
                    'Click "Edit with AI"',
                    'Type what you want changed',
                    'Job Foocus applies the edit instantly',
                  ],
                },
                {
                  title: 'Organize with categories',
                  items: [
                    'Go to Dashboard → Categories',
                    'Create custom categories (e.g., "Remote Roles")',
                    'Assign jobs to categories',
                    'Filter your dashboard by category',
                  ],
                },
                {
                  title: 'Track application status',
                  items: [
                    'Prospect — not yet applied',
                    'Applied — submitted',
                    'Phone Screen — scheduled',
                    'Interview / Offer / Rejected',
                  ],
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl p-5"
                  style={{ backgroundColor: 'var(--canvas)', border: '1px solid var(--beige-deep)' }}
                >
                  <p className="text-[14px] font-semibold text-ink mb-3">{card.title}</p>
                  <ul className="space-y-2">
                    {card.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[13px] text-steel leading-relaxed">
                        <CheckIcon />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Browser Extension ─────────────────────────────────── */}
      <section id="browser-extension" className="px-6 py-16 scroll-mt-20">
        <div className="max-w-[768px] mx-auto">
          <div className="mb-10">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-primary mb-3">
              Browser Extension
            </span>
            <h2 className="text-[28px] font-semibold text-ink leading-tight mb-4">
              Capture jobs directly from any job board
            </h2>
            <p className="text-[16px] text-steel leading-[1.65] max-w-[540px]">
              The Job Foocus extension sits in your browser toolbar. When you&apos;re on a job posting, click the icon and the job is captured — title, company, description — in seconds.
            </p>
          </div>

          {/* Supported browsers */}
          <div className="flex flex-wrap gap-2 mb-10">
            {['Chrome 88+', 'Edge 88+', 'Brave', 'Firefox 109+'].map((browser) => (
              <span
                key={browser}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-semibold text-ink"
                style={{ backgroundColor: 'var(--cream-deeper)', border: '1px solid var(--beige-deep)' }}
              >
                {browser}
              </span>
            ))}
          </div>

          {/* Capture methods — 2-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div>
              <h3 className="text-[18px] font-semibold text-ink mb-4">Three ways to capture</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-semibold" style={{ backgroundColor: '#fa520f', color: '#ffffff' }}>1</div>
                  <div>
                    <p className="text-[14px] font-semibold text-ink mb-1">Click the extension icon</p>
                    <p className="text-[13px] text-steel leading-relaxed">Navigate to any job posting, click the icon, and click &quot;Add Job&quot;.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-semibold" style={{ backgroundColor: '#fa520f', color: '#ffffff' }}>2</div>
                  <div>
                    <p className="text-[14px] font-semibold text-ink mb-1">Right-click shortcut</p>
                    <p className="text-[13px] text-steel leading-relaxed">Right-click anywhere on the page, select &quot;Send page to Job Foocus&quot;.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-semibold" style={{ backgroundColor: '#fa520f', color: '#ffffff' }}>3</div>
                  <div>
                    <p className="text-[14px] font-semibold text-ink mb-1">Keyboard shortcut</p>
                    <p className="text-[13px] text-steel leading-relaxed">
                      <kbd className="text-[12px] bg-surface px-1.5 py-0.5 rounded font-mono" style={{ border: '1px solid var(--hairline-soft)' }}>Ctrl+Shift+J</kbd>
                      <span className="mx-1.5">/</span>
                      <kbd className="text-[12px] bg-surface px-1.5 py-0.5 rounded font-mono" style={{ border: '1px solid var(--hairline-soft)' }}>Cmd+Shift+J</kbd>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Browser mockup */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hairline-soft)', boxShadow: 'rgba(0,0,0,0.06) 0px 8px 24px' }}>
              <div className="bg-surface px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--hairline)' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--hairline)' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--hairline)' }} />
                </div>
                <div className="flex-1 flex justify-center">
                  <span className="text-[11px] text-steel font-medium">linkedin.com/jobs</span>
                </div>
              </div>
              <div className="p-5 bg-canvas">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--cream)', border: '1px solid var(--beige-deep)' }}>
                    <img src="/icon.webp" alt="Job Foocus" className="w-8 h-8 rounded object-contain" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">Senior Frontend Engineer</p>
                    <p className="text-[11px] text-steel">Acme Corp · San Francisco, CA</p>
                  </div>
                </div>
                <p className="text-[11px] text-steel leading-relaxed mb-3">
                  We are looking for a Senior Frontend Engineer to join our team and help build the next generation of our product...
                </p>
                <button
                  className="w-full py-2 rounded-md text-[12px] font-medium text-white"
                  style={{ backgroundColor: '#fa520f' }}
                >
                  Add Job
                </button>
              </div>
            </div>
          </div>

          {/* Privacy note */}
          <div
            className="flex items-start gap-4 p-5 rounded-xl"
            style={{ backgroundColor: 'var(--canvas)', border: '1px solid var(--hairline-soft)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div>
              <p className="text-[14px] font-semibold text-ink mb-1">Your privacy is protected</p>
              <p className="text-[13px] text-steel leading-relaxed">
                The extension <span className="text-ink font-medium">only reads page content when you click &quot;Add Job&quot; or use the right-click shortcut.</span> It never tracks your browsing, reads cookies, or collects data passively. See our{' '}
                <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Your Account (cream section) ──────────────────────── */}
      <section id="your-account" className="scroll-mt-20" style={{ backgroundColor: 'var(--cream)' }}>
        <div className="px-6 py-16">
          <div className="max-w-[768px] mx-auto">
            <div className="mb-8">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-primary mb-3">
                Your Account
              </span>
              <h2 className="text-[28px] font-semibold text-ink leading-tight">
                Usage limits and account management
              </h2>
            </div>

            {/* Tier cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { name: 'Free', price: '$0', jobs: '5', edits: '25', featured: false },
                { name: 'Pro', price: '$5/mo', jobs: '25', edits: '150', featured: true },
                { name: 'Max', price: '$12/mo', jobs: '250', edits: '500', featured: false },
              ].map((tier) => (
                <div
                  key={tier.name}
                  className="rounded-xl p-5 relative"
                  style={{
                    backgroundColor: 'var(--canvas)',
                    border: tier.featured ? '2px solid #fa520f' : '1px solid var(--beige-deep)',
                  }}
                >
                  {tier.featured && (
                    <span
                      className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-semibold text-white"
                      style={{ backgroundColor: '#fa520f' }}
                    >
                      Most Popular
                    </span>
                  )}
                  <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-steel mb-2">{tier.name}</p>
                  <p className="text-[28px] font-semibold text-ink leading-none mb-1">{tier.price}</p>
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[13px] text-steel">
                      <span className="text-ink font-medium">{tier.jobs}</span> jobs/day
                    </p>
                    <p className="text-[13px] text-steel">
                      <span className="text-ink font-medium">{tier.edits}</span> edits/day
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[13px] text-steel mb-8">Limits reset daily at midnight UTC. Manage your subscription from the credit card icon in the navigation bar.</p>

            {/* Data management */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--canvas)', border: '1px solid var(--beige-deep)' }}>
                <p className="text-[14px] font-semibold text-ink mb-2">Export your data</p>
                <p className="text-[13px] text-steel leading-relaxed">
                  Go to <span className="text-ink font-medium">Account → Export Data</span> to download all your job applications, documents, master resume, and settings as a single JSON file.
                </p>
              </div>
              <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--canvas)', border: '1px solid var(--beige-deep)' }}>
                <p className="text-[14px] font-semibold text-ink mb-2">Delete your account</p>
                <p className="text-[13px] text-steel leading-relaxed">
                  Go to <span className="text-ink font-medium">Account → Delete Account</span> and type <code className="text-[12px] bg-surface px-1 py-0.5 rounded" style={{ border: '1px solid var(--hairline-soft)' }}>DELETE</code> to confirm. This permanently removes all data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="px-6 py-16">
        <div className="max-w-[768px] mx-auto">
          <div className="mb-8">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-primary mb-3">
              FAQ
            </span>
            <h2 className="text-[28px] font-semibold text-ink leading-tight">
              Frequently asked questions
            </h2>
          </div>
          <FaqSection />
        </div>
      </section>

      {/* ── Contact ────────────────────────────────────────────── */}
      <section className="px-6 pb-16">
        <div className="max-w-[768px] mx-auto">
          <div
            className="rounded-xl p-8 md:p-10 text-center relative overflow-hidden"
            style={{ backgroundColor: 'var(--cream)', border: '1px solid var(--beige-deep)' }}
          >
            {/* Decorative gradient corner */}
            <div
              className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full opacity-20 pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #fa520f 0%, transparent 70%)',
                transform: 'translate(40%, -40%)',
              }}
            />

            <div className="relative z-10">
              <h2
                className="text-[32px] md:text-[36px] font-normal text-ink leading-tight mb-3"
                style={{ fontFamily: 'PP Editorial Old, Times New Roman, serif', letterSpacing: '-0.5px' }}
              >
                Still need help?
              </h2>
              <p className="text-[16px] text-steel max-w-[400px] mx-auto leading-relaxed mb-6">
                If you have questions, run into issues, or just want to say hello — reach out to us.
              </p>
              <a
                href="mailto:support@jobfoocus.com"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[14px] font-medium text-white transition-colors"
                style={{ backgroundColor: '#fa520f' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-10 6L2 7" />
                </svg>
                support@jobfoocus.com
              </a>
              <p className="text-[12px] text-steel mt-3">We typically respond within 24 hours on business days.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
