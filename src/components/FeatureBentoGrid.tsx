'use client'

import { useInView } from '@/lib/use-in-view'

function CardWrapper({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const [ref, inView] = useInView(0.1)
  return (
    <div
      ref={ref}
      className={`rounded-xl overflow-hidden ${className}`}
      style={{
        backgroundColor: 'var(--canvas)',
        border: '1px solid var(--hairline-soft)',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

export default function FeatureBentoGrid() {
  const [headingRef, headingInView] = useInView(0.1)

  return (
    <section className="w-full px-6 py-20" style={{ backgroundColor: 'var(--canvas)' }}>
      <div className="max-w-[1280px] mx-auto">
        {/* Section header */}
        <div
          ref={headingRef}
          className="text-center mb-12"
          style={{
            opacity: headingInView ? 1 : 0,
            transform: headingInView ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: 'var(--primary)' }}>
            Everything you need
          </p>
          <h2
            className="text-[32px] md:text-[36px] font-medium leading-tight mb-4"
            style={{
              fontFamily: 'PP Editorial Old, Times New Roman, serif',
              letterSpacing: '-0.5px',
              color: 'var(--ink)',
            }}
          >
            Built for the way real job searches work
          </h2>
          <p className="text-[16px] max-w-[500px] mx-auto leading-relaxed" style={{ color: 'var(--steel)' }}>
            Every feature is designed to remove friction — from first application to signed offer.
          </p>
        </div>

        {/* Bento grid — 2 columns on md+, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 — Extension (large, spans 2 cols) */}
          <CardWrapper className="md:col-span-2 p-6 md:p-8" delay={0}>
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Mock job board card */}
              <div className="flex-1 w-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--cream)', border: '1px solid var(--beige-deep)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>Senior Frontend Engineer</p>
                    <p className="text-[12px]" style={{ color: 'var(--steel)' }}>Stripe • Remote</p>
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--steel)' }}>
                  We&apos;re looking for an experienced frontend engineer to join our design systems team…
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {['React', 'TypeScript', 'CSS'].map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--slate)', border: '1px solid var(--hairline)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {/* Extension badge */}
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                  style={{ backgroundColor: 'var(--cream)', border: '1px solid var(--beige-deep)', color: 'var(--ink)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  Captured by Job Foocus
                </div>
              </div>
              {/* Description */}
              <div className="flex-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--primary)' }}>
                  Browser Extension
                </span>
                <h3 className="text-[20px] font-semibold mt-1 mb-3" style={{ color: 'var(--ink)' }}>
                  One-click job capture
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--steel)' }}>
                  Browse any job posting online, click the Job Foocus extension, and the job is captured — title, company, description — and filed in the right category. No copy-pasting.
                </p>
              </div>
            </div>
          </CardWrapper>

          {/* Card 2 — Follow-ups (top right) */}
          <CardWrapper className="p-6 md:p-8 flex flex-col" delay={0.1}>
            <div className="flex-1 flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--primary)' }}>
                Smart Follow-Ups
              </span>
              <h3 className="text-[20px] font-semibold mt-1 mb-3" style={{ color: 'var(--ink)' }}>
                Follow up at the right moment
              </h3>
              <p className="text-[14px] leading-relaxed mb-5 flex-1" style={{ color: 'var(--steel)' }}>
                Job Foocus tracks your application timeline and reminds you when it&apos;s time to follow up — with a pre-written message ready to review and send.
              </p>

              {/* Notification card slide-in */}
              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: 'var(--cream)',
                  border: '1px solid var(--beige-deep)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>Time to follow up</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--steel)' }}>
                      It&apos;s been 12 days since you applied to Stripe.
                    </p>
                    <button
                      className="text-[11px] font-medium mt-2"
                      style={{ color: 'var(--primary)' }}
                    >
                      Send follow-up →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </CardWrapper>

          {/* Card 3 — Tracker (bottom right) */}
          <CardWrapper className="md:col-start-3 p-6 md:p-8" delay={0.2}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--primary)' }}>
              Job Tracker
            </span>
            <h3 className="text-[20px] font-semibold mt-1 mb-4" style={{ color: 'var(--ink)' }}>
              Your pipeline at a glance
            </h3>
            <p className="text-[14px] leading-relaxed mb-5" style={{ color: 'var(--steel)' }}>
              Know exactly where every application stands — from prospect to offer. No more spreadsheets.
            </p>

            {/* Mini Kanban */}
            <div className="space-y-2">
              {[
                { label: 'Applied', count: 4, active: true },
                { label: 'Interview', count: 2, active: true },
                { label: 'Offer', count: 1, active: false },
              ].map((stage) => (
                <div
                  key={stage.label}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{
                    backgroundColor: stage.active ? 'var(--surface)' : 'rgba(0,0,0,0.03)',
                    border: stage.active ? '1px solid var(--hairline-soft)' : '1px dashed var(--hairline)',
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stage.active ? 'var(--primary)' : 'var(--hairline-strong)' }}
                  />
                  <span className="text-[13px] flex-1" style={{ color: stage.active ? 'var(--ink)' : 'var(--muted)' }}>
                    {stage.label}
                  </span>
                  <span
                    className="text-[13px] font-semibold"
                    style={{ color: stage.active ? 'var(--ink)' : 'var(--muted)' }}
                  >
                    {stage.count}
                  </span>
                </div>
              ))}
            </div>
          </CardWrapper>
        </div>
      </div>
    </section>
  )
}
