'use client'

import { useInView } from '@/lib/use-in-view'
import Button from '@/components/design/Button'

export default function ClosingCTA() {
  const [ref, inView] = useInView(0.15)

  return (
    <section className="w-full px-6 pb-24">
      <div className="max-w-[980px] mx-auto">
        <div
          ref={ref}
          className="rounded-xl p-10 md:p-14 text-center relative overflow-hidden"
          style={{
            backgroundColor: 'var(--cream)',
            border: '1px solid var(--beige-deep)',
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          {/* Decorative gradient corner */}
          <div
            className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full opacity-20 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
              transform: 'translate(40%, -40%)',
            }}
          />

          {/* Decorative corner bottom left */}
          <div
            className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full opacity-10 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, var(--yellow-saturated) 0%, transparent 70%)',
              transform: 'translate(-30%, 30%)',
            }}
          />

          <div className="relative z-10">
            <h2
              className="text-[36px] md:text-[44px] font-normal leading-tight mb-4"
              style={{
                fontFamily: 'PP Editorial Old, Times New Roman, serif',
                letterSpacing: '-0.5px',
                color: 'var(--ink)',
              }}
            >
              Ready to experience a better job search?
            </h2>
            <p
              className="text-[16px] max-w-[460px] mx-auto leading-relaxed mb-8"
              style={{ color: 'var(--steel)' }}
            >
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
      </div>
    </section>
  )
}
