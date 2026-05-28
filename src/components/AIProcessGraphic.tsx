'use client';

interface StepProps {
  number: number;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  isAi?: boolean;
}

function ProcessStep({ number, label, sublabel, icon, isAi }: StepProps) {
  return (
    <div className="flex flex-col items-center gap-2 relative">
      {/* Icon circle */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
        style={{
          backgroundColor: isAi ? '#fff8e0' : '#ffffff',
          border: isAi ? '2px solid #e6d5a8' : '1px solid #e5e5e5',
          boxShadow: isAi
            ? '0 4px 16px rgba(250, 82, 15, 0.12)'
            : '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div className="ai-pulse-glow">{icon}</div>
        {isAi && (
          <div
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#fa520f' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="text-center">
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        <p className="text-[11px] text-steel mt-0.5 max-w-[120px]">{sublabel}</p>
      </div>
    </div>
  );
}

export default function AIProcessGraphic() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden px-4 md:px-8 py-8"
      style={{
        backgroundColor: '#fafaf8',
        border: '1px solid #ededed',
      }}
    >
      {/* Row 1 — left to right */}
      <div className="flex flex-row items-start justify-center md:justify-between gap-2 mb-4 md:mb-8">
        <ProcessStep
          number={1}
          label="Paste Job"
          sublabel="Drop any posting into the app"
          isAi={false}
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          }
        />

        {/* Arrow 1→2 */}
        <div className="flex items-center md:hidden">
          <svg width="24" height="12" viewBox="0 0 40 12" fill="none" className="rotate-90 md:rotate-0">
            <path d="M0 6h30M28 2l8 4-8 4" stroke="#e6d5a8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <ProcessStep
          number={2}
          label="Mask PII"
          sublabel="Personal info hidden before AI"
          isAi={false}
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          }
        />
      </div>

      {/* Row 2 — right to left: wrapper reverses on mobile, inner flex keeps steps + arrow together */}
      <div className="flex flex-row items-start justify-center md:justify-between gap-2 mb-4 md:mb-8">
        {/* Inner wrapper reverses direction on mobile to create RTL row */}
        <div className="flex flex-row-reverse items-start md:items-center justify-center gap-2">
          {/* Arrow between steps 3 and 4 — points left (step 4 → step 3) */}
          <div className="flex items-center md:hidden rotate-180">
            <svg width="24" height="12" viewBox="0 0 40 12" fill="none">
              <path d="M0 6h30M28 2l8 4-8 4" stroke="#e6d5a8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <ProcessStep
            number={3}
            label="AI Analyzes"
            sublabel="Keywords matched to your resume"
            isAi={true}
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
                <path d="M8 12a4 4 0 0 1 8 0" />
              </svg>
            }
          />

          <ProcessStep
            number={4}
            label="Replace PII"
            sublabel="Your info restored to documents"
            isAi={false}
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Row 3 — left to right */}
      <div className="flex flex-row items-start justify-center md:justify-between gap-2 mb-4 md:mb-8">
        <ProcessStep
          number={5}
          label="Resume Ready"
          sublabel="ATS-optimized, keyword-matched"
          isAi={false}
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M9 15l2 2 4-4" />
            </svg>
          }
        />

        {/* Arrow 5→6 */}
        <div className="flex items-center md:hidden">
          <svg width="24" height="12" viewBox="0 0 40 12" fill="none" className="rotate-90 md:rotate-0">
            <path d="M0 6h30M28 2l8 4-8 4" stroke="#e6d5a8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <ProcessStep
          number={6}
          label="Cover Letter"
          sublabel="Written to the specific company"
          isAi={false}
          icon={
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          }
        />
      </div>

      {/* Result banner */}
      <div
        className="flex items-center justify-center gap-3 px-5 py-3 rounded-xl"
        style={{
          backgroundColor: '#fff8e0',
          border: '1px solid #e6d5a8',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-[13px] font-semibold text-ink">
          Application package ready to print or export as PDF
        </span>
      </div>
    </div>
  );
}