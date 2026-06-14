'use client';

interface StepProps {
  number: number;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  isAi?: boolean;
}

function ProcessStep({ label, sublabel, icon, isAi }: Omit<StepProps, 'number'>) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
        style={{
          backgroundColor: isAi ? 'var(--cream)' : 'var(--canvas)',
          border: isAi ? '2px solid var(--beige-deep)' : '1px solid var(--hairline)',
          boxShadow: isAi
            ? '0 4px 16px rgba(250, 82, 15, 0.12)'
            : '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div className="ai-pulse-glow">{icon}</div>
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
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        <p className="text-[11px] text-steel mt-0.5 max-w-[120px]">{sublabel}</p>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden md:flex items-center shrink-0">
      <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
        <path d="M0 6h30M28 2l8 4-8 4" stroke="var(--beige-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function MobileArrow() {
  return (
    <div className="flex md:hidden items-center justify-center py-2">
      <svg width="12" height="24" viewBox="0 0 12 24" fill="none">
        <path d="M6 0v18M2 14l4 6 4-6" stroke="var(--beige-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function AIProcessGraphic() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden px-4 md:px-8 py-8"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--hairline-soft)' }}
    >
      {/* Steps — vertical column on mobile, horizontal row on desktop */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-0">
        <ProcessStep
          label="Paste Job"
          sublabel="Drop any posting into the app"
          isAi={false}
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
        />
        <MobileArrow />
        <Arrow />

        <ProcessStep
          label="Mask PII"
          sublabel="Personal info hidden before AI"
          isAi={false}
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          }
        />
        <MobileArrow />
        <Arrow />

        <ProcessStep
          label="AI Analyzes"
          sublabel="Keywords matched to your resume"
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

        <ProcessStep
          label="Replace PII"
          sublabel="Your info restored to documents"
          isAi={false}
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          }
        />
        <MobileArrow />
        <Arrow />

        <ProcessStep
          label="Application Package"
          sublabel="Resume and cover letter ready"
          isAi={false}
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          }
        />
      </div>

      {/* Result banner */}
      <div
        className="flex items-center justify-center gap-3 px-5 py-3 rounded-xl mt-8"
        style={{ backgroundColor: 'var(--cream)', border: '1px solid var(--beige-deep)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-[13px] font-semibold text-ink">
          Print-ready documents — clean layouts, proper margins
        </span>
      </div>
    </div>
  );
}