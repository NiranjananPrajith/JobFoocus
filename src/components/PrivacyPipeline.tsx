'use client'

import { useState } from 'react'
import { useInView } from '@/lib/use-in-view'

interface StepProps {
  number: number
  label: string
  sublabel: string
  icon: React.ReactNode
  isAi?: boolean
}

function PipelineStep({ label, sublabel, icon, isAi }: Omit<StepProps, 'number'>) {
  const [ref, inView] = useInView(0.3)
  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-3"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
        style={{
          backgroundColor: isAi ? 'rgba(255,248,224,0.12)' : 'rgba(255,255,255,0.06)',
          border: isAi ? '2px solid var(--beige-deep)' : '1px solid rgba(255,255,255,0.12)',
          boxShadow: isAi ? '0 4px 24px rgba(250, 82, 15, 0.20)' : 'none',
        }}
      >
        <div className={isAi ? 'ai-pulse-glow' : ''}>{icon}</div>
        {isAi && (
          <div
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold" style={{ color: 'var(--on-dark)' }}>{label}</p>
        <p className="text-[12px] mt-0.5 max-w-[120px]" style={{ color: 'var(--on-dark-muted)' }}>{sublabel}</p>
      </div>
    </div>
  )
}

function Arrow() {
  return (
    <div className="hidden md:flex items-center shrink-0">
      <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
        <path d="M0 6h30M28 2l8 4-8 4" stroke="var(--beige-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function MobileArrow() {
  return (
    <div className="flex md:hidden items-center justify-center py-1">
      <svg width="12" height="24" viewBox="0 0 12 24" fill="none">
        <path d="M6 0v18M2 14l4 6 4-6" stroke="var(--beige-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

const PII_FIELDS = [
  { label: 'Name', original: 'John Doe', masked: '[MASKED_NAME]' },
  { label: 'Email', original: 'john.doe@email.com', masked: '[MASKED_EMAIL]' },
  { label: 'Phone', original: '(555) 0199', masked: '[MASKED_PHONE]' },
  { label: 'Address', original: '123 Main St, NY', masked: '[MASKED_ADDRESS]' },
]

export default function PrivacyPipeline() {
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const [sectionRef, sectionInView] = useInView(0.1)

  return (
    <section
      className="w-full px-6 py-20"
      style={{ backgroundColor: 'var(--surface-code)' }}
    >
      <div
        ref={sectionRef}
        className="max-w-[1280px] mx-auto"
        style={{
          opacity: sectionInView ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}
      >
        {/* Section header */}
        <div className="text-center mb-12">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3"
            style={{ color: 'var(--on-dark-muted)' }}
          >
            Privacy-first by design
          </p>
          <h2
            className="text-[32px] md:text-[36px] font-medium leading-tight mb-4"
            style={{
              fontFamily: 'PP Editorial Old, Times New Roman, serif',
              letterSpacing: '-0.5px',
              color: 'var(--on-dark)',
            }}
          >
            Your data never touches the AI
          </h2>
          <p
            className="text-[16px] max-w-[540px] mx-auto leading-relaxed"
            style={{ color: 'var(--on-dark-muted)' }}
          >
            Before your resume reaches any AI model, we strip out every personal identifier.
            Only your skills and experience are used for matching.
          </p>
        </div>

        {/* Pipeline steps */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-0 mb-12">
          <PipelineStep
            label="Upload"
            sublabel="Drop your resume or paste a job"
            isAi={false}
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--on-dark-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            }
          />
          <MobileArrow />
          <Arrow />

          <PipelineStep
            label="Mask PII"
            sublabel="Personal info hidden before AI"
            isAi={false}
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--on-dark-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            }
          />
          <MobileArrow />
          <Arrow />

          <PipelineStep
            label="AI Analyzes"
            sublabel="Skills matched to job keywords"
            isAi={true}
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
                <path d="M8 12a4 4 0 0 1 8 0" />
              </svg>
            }
          />
          <MobileArrow />
          <Arrow />

          <PipelineStep
            label="Deliver"
            sublabel="Your info restored, resume ready"
            isAi={false}
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--on-dark-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            }
          />
        </div>

        {/* Interactive mock resume */}
        <div
          className="max-w-[520px] mx-auto rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--canvas)',
            border: '1px solid var(--hairline-soft)',
            boxShadow: 'rgba(0,0,0,0.08) 0px 12px 24px -4px',
          }}
        >
          {/* Card header */}
          <div
            className="px-5 py-3 border-b flex items-center gap-2"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--hairline-soft)' }}
          >
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#eab308' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
            </div>
            <span className="text-[11px] ml-1" style={{ color: 'var(--steel)' }}>
              resume_john_doe.pdf
            </span>
          </div>

          {/* Resume body */}
          <div className="p-5 space-y-4">
            {/* PII fields */}
            <div className="space-y-3">
              {PII_FIELDS.map((field) => {
                const isHovered = hoveredField === field.label
                return (
                  <div
                    key={field.label}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-300"
                    style={{
                      backgroundColor: isHovered ? 'rgba(250,82,15,0.06)' : 'transparent',
                      border: isHovered
                        ? '1px solid var(--primary)'
                        : '1px solid transparent',
                    }}
                    onMouseEnter={() => setHoveredField(field.label)}
                    onMouseLeave={() => setHoveredField(null)}
                  >
                    <span className="text-[11px] font-medium w-16 shrink-0" style={{ color: 'var(--steel)' }}>
                      {field.label}
                    </span>
                    <span
                      className="text-[14px] font-medium transition-all duration-300"
                      style={{
                        color: isHovered ? 'var(--primary)' : 'var(--ink)',
                        filter: isHovered ? 'blur(3px)' : 'blur(0)',
                      }}
                    >
                      {field.original}
                    </span>
                    {isHovered && (
                      <span
                        className="text-[12px] font-mono ml-auto animate-in"
                        style={{ color: 'var(--primary)' }}
                      >
                        {field.masked}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Skills section — always visible */}
            <div className="border-t pt-4" style={{ borderColor: 'var(--hairline-soft)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--steel)' }}>
                Skills sent to AI
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['React', 'TypeScript', 'Node.js', 'AWS', 'PostgreSQL'].map((skill) => (
                  <span
                    key={skill}
                    className="text-[12px] px-2.5 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: 'var(--cream-deeper)',
                      color: 'var(--ink)',
                      border: '1px solid var(--beige-deep)',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Result banner */}
        <div
          className="flex items-center justify-center gap-3 px-5 py-3 rounded-xl mt-8 max-w-[520px] mx-auto"
          style={{
            backgroundColor: 'rgba(255,248,224,0.08)',
            border: '1px solid rgba(255,248,224,0.15)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--on-dark)' }}>
            Your data never leaves your control
          </span>
        </div>
      </div>
    </section>
  )
}
