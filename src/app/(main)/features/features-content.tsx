import Button from '@/components/design/Button';
import Card from '@/components/design/Card';
import HeroBubbleBackground from '@/components/HeroBubbleBackground';
import AIProcessGraphic from '@/components/AIProcessGraphic';
import Link from 'next/link';
const coreFeatures = [
  {
    eyebrow: 'AI Document Generation',
    headline: 'Tailored resumes that speak to every job',
    body: "Most申请人 use the same resume everywhere. Job Foocus reads the job description and rewrites your experience to match exactly what employers are looking for — keyword-matched, structure-optimized, ATS-ready.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    eyebrow: 'Smart Follow-Up Reminders',
    headline: 'Never let a silent employer slip through the net',
    body: "You've applied. You're waiting. Most people wait two weeks, give up, and never follow up. Job Foocus watches your applications and reminds you to follow up when there's been no response — so you stay top of mind without thinking about it.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    eyebrow: 'One-Click Import',
    headline: 'Add jobs in under 10 seconds',
    body: 'Browse any job posting online, click the Job Foocus extension, and the job is captured — title, company, description — and filed in the right category. No copy-pasting. No manual entry. Your job search moves as fast as you do.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
];

const extraFeatures = [
  {
    title: 'Organized Application Tracking',
    description: 'Know exactly where every application stands. Categorize by role type, track status from prospect to offer, and see your entire pipeline at a glance — no more spreadsheets.',
  },
  {
    title: 'Cover Letters That Actually Get Read',
    description: "Generic cover letters get trashed. Job Foocus generates a sharp, job-specific letter tied to your exact experience and the role's actual requirements — automated without sounding like it.",
  },
  {
    title: 'Job Foocus Assistant',
    description: 'When employers ask follow-up questions, Job Foocus Assistant writes the response for you — ready to review and send. It knows your background, knows the job, and drafts a reply that sounds like you.',
  },
  {
    title: 'Print-Ready Documents',
    description: "Every resume and cover letter is formatted for clean printing or PDF export. Clean layouts, proper margins, no weird fonts. What you see is what the employer sees.",
  },
  {
    title: 'Your PII Never Goes to the AI',
    description: 'Your name, phone number, email, and social links are never sent to any AI model. When generating tailored resumes and cover letters, only your work experience and skills are used — all personal identifiers are masked before any AI processing happens.',
  },
];

export default function FeaturesPageContent() {
  return (
    <div className="w-full">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-8 py-20 md:py-28 w-full">
        <div className="max-w-[1280px] mx-auto">
          {/* Interactive bubble background */}
          <HeroBubbleBackground className="absolute inset-0 z-0 rounded-2xl" />

          <div className="relative z-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-primary mb-5">
            Features
          </p>
          <h1 className="text-[48px] md:text-[64px] font-normal text-ink leading-[1.08] mb-6"
            style={{ fontFamily: 'PP Editorial Old, Times New Roman, serif', letterSpacing: '-0.5px' }}>
            Every tool your job search needs, in one place
          </h1>
          <p className="text-[18px] text-steel leading-[1.60] max-w-[580px] mb-8">
            Stop juggling spreadsheets, generic templates, and missed follow-ups. Job Foocus brings AI power, smart tracking, and organized workflow together so you can focus on what actually gets you hired.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" className="px-6 py-3">
              Start for Free
            </Button>
            <Button variant="secondary" className="px-6 py-3">
              See Pricing
            </Button>
          </div>
        </div>
        </div>
      </section>

      {/* ── Core Feature 1 — AI Resume Generation ────────────── */}
      {/* pt-20 (md+) / pt-12 (mobile) creates a clear gap below the
          hero's bottom padding — without an explicit top margin the
          process graphic reads as flush against the hero on tall
          canvases. */}
      <section className="px-6 pt-12 md:pt-20 pb-20 w-full">
        {/* Wide static process graphic — full width */}
        <AIProcessGraphic />

        <div className="max-w-[1280px] mx-auto mt-10">
          <div className="mb-8">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-primary mb-3">
              AI Document Generation
            </span>
            <h2 className="text-[32px] font-semibold text-ink leading-tight">
              Your resume, rewritten for every job — automatically
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <p className="text-[16px] text-steel leading-[1.65]">
                Drop in a job description and Job Foocus generates a fully tailored resume and cover letter in minutes. The AI pulls from your master resume, matches your experience to the role's keywords, and outputs clean HTML ready to print or PDF. No prompting, no drafts to edit — just your personalized application package, ready to send.
              </p>
            </div>
            <div className="flex items-center">
              <ul className="space-y-3">
                {['Tailored resume generated in under 3 minutes', 'Keyword-matched to the job posting', 'ATS-optimized structure and formatting', 'Cover letter written to the specific company'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[14px] text-ink">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Core Feature 2 — Follow-Up Reminders (dark bg band) ── */}
      <section
        className="px-6 py-20 w-full rounded-xl"
        style={{ backgroundColor: '#fff8e0' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Notification mockup */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-xl border border-beige-deep p-5 max-w-[360px] mx-auto shadow-[rgba(0,0,0,0.06)_0px_6px_20px]">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#fa520f' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-ink mb-1">Follow-up Reminder</p>
                  <p className="text-[12px] text-steel">It's been 12 days since you applied to <strong>Cara Co.</strong> — Customer Support Associate. tap to send a follow-up message.</p>
                </div>
              </div>
              <div className="bg-cream rounded-lg p-3 text-[12px] text-steel leading-relaxed border border-beige-deep">
                <p className="font-semibold text-ink mb-1">Subject: Application Follow-Up — Customer Support Associate</p>
                <p>Dear Hiring Team, I wanted to follow up on my application for the Customer Support Associate role...</p>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 text-[12px] font-medium text-white py-2 rounded-md" style={{ backgroundColor: '#fa520f' }}>Edit & Send</button>
                <button className="flex-1 text-[12px] font-medium text-steel py-2 rounded-md border border-hairline-soft bg-white">Remind Later</button>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-primary mb-3">
              Smart Follow-Up Reminders
            </span>
            <h2 className="text-[32px] font-semibold text-ink leading-tight mb-5">
              Follow up at the right moment — every time
            </h2>
            <p className="text-[16px] text-steel leading-[1.65] mb-6">
              The biggest mistake job seekers make isn't a bad resume — it's going silent after applying. Job Foocus tracks your application timeline and sends a reminder when the window for a follow-up opens. With the Assistant plan, your follow-up message is already written.
            </p>
            <ul className="space-y-3">
              {['Automatic reminder triggered after 10 days with no response', 'Pre-written follow-up message ready to review and send', 'Tracks applied, interview, offer, and rejected states', 'Never miss a window to stay top of mind'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[14px] text-ink">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Core Feature 3 — Browser Extension ───────────────── */}
      <section className="px-6 py-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-primary mb-3">
              Browser Extension
            </span>
            <h2 className="text-[32px] font-semibold text-ink leading-tight mb-5">
              Add jobs directly from any job posting — in seconds
            </h2>
            <p className="text-[16px] text-steel leading-[1.65] mb-6">
              The Job Foocus browser extension sits in your toolbar. When you're on a job posting page, click the icon and Job Foocus captures the job title, company, description, and URL — categorizes it, files it, and queues your AI documents for generation. No more copypasting into forms.
            </p>
            <ul className="space-y-3">
              {['Works on LinkedIn, Indeed, Glassdoor, and any posting page', 'Captures full job description with one click', 'Works on Chrome and Firefox'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[14px] text-ink">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Extension mockup */}
          <div className="bg-white rounded-xl border border-hairline-soft shadow-[rgba(0,0,0,0.06)_0px_8px_24px] overflow-hidden">
            <div className="bg-surface px-4 py-3 border-b border-hairline-soft flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span className="text-[12px] text-steel font-medium">chrome.google.com/webstore</span>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fff8e0', border: '1px solid #e6d5a8' }}>
                  <img src="/icon.webp" alt="Job Foocus" className="w-10 h-10 rounded-lg object-contain" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-ink">Job Foocus Assistant</p>
                  <p className="text-[12px] text-steel">Productivity • Early access</p>
                </div>
              </div>
              <p className="text-[13px] text-steel leading-relaxed mb-4">
                Import any job posting directly into your Job Foocus dashboard with one click. Automatically captures job title, company, and full description.
              </p>
              <div className="flex gap-2">
                <Link
                  href="/extension-install"
                  className="px-4 py-2 text-[13px] font-medium text-white rounded-md inline-flex items-center"
                  style={{ backgroundColor: '#fa520f' }}
                >
                  Add Extension
                </Link>
                <button className="px-4 py-2 text-[13px] font-medium text-steel rounded-md border border-hairline-soft bg-white">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Grid ──────────────────────────────────────── */}
      <section className="px-6 pb-20 w-full">
        <div className="text-center mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary mb-3">Everything Included</p>
          <h2
            className="text-[36px] font-medium text-ink leading-tight mb-4"
            style={{ fontFamily: 'PP Editorial Old, Times New Roman, serif', letterSpacing: '-0.5px' }}
          >
            Built for the way real job searches work
          </h2>
          <p className="text-[16px] text-steel max-w-[480px] mx-auto leading-relaxed">
            Every feature is designed to remove friction from your job search — from first application to signed offer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {extraFeatures.map((feature) => (
            <Card key={feature.title} variant="cream" className="p-6">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center mb-4"
                style={{ backgroundColor: '#fff0c2', border: '1px solid #e6d5a8' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-[16px] font-semibold text-ink mb-2 leading-snug">
                {feature.title}
              </h3>
              <p className="text-[14px] text-steel leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────────── */}
      <section className="px-6 pb-24 w-full">
        <div
          className="rounded-xl p-10 md:p-14 text-center relative overflow-hidden"
          style={{ backgroundColor: '#fff8e0', border: '1px solid #e6d5a8' }}
        >
          {/* Decorative gradient corner */}
          <div
            className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full opacity-20 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, #fa520f 0%, transparent 70%)',
              transform: 'translate(40%, -40%)',
            }}
          />

          <div className="relative z-10">
            <h2
              className="text-[36px] md:text-[44px] font-normal text-ink leading-tight mb-4"
              style={{ fontFamily: 'PP Editorial Old, Times New Roman, serif', letterSpacing: '-0.5px' }}
            >
              Your next job starts here
            </h2>
            <p className="text-[16px] text-steel max-w-[460px] mx-auto leading-relaxed mb-8">
              Job Foocus is in early alpha. Create job-specific resumes, cover letters, and track applications — all in one place. Free to start — no credit card required.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="primary" className="px-7 py-3 text-[15px]">
                Get Started Free
              </Button>
              <Button variant="on-cream" className="px-7 py-3 text-[15px]">
                View Pricing
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
