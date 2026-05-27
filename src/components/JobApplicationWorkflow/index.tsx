'use client';

import './styles.css';

const STEPS = [
  {
    number: 1,
    label: 'Job Description',
    sublabel: 'Paste any posting',
    headerColor: '#e8e8e8',
    headerText: '#6a6a6a',
    windowLabel: 'Job Description',
  },
  {
    number: 2,
    label: 'Your Resume',
    sublabel: 'ATS-optimized, ready to print',
    headerColor: '#2d2d2d',
    headerText: '#ffffff',
    windowLabel: 'Priya Nair — Resume.pdf',
  },
  {
    number: 3,
    label: 'Cover Letter',
    sublabel: 'Written to the company',
    headerColor: '#1a1a1a',
    headerText: '#ffffff',
    windowLabel: 'Cover Letter_TechSmith.pdf',
  },
];

function Bar({ width, mb, extraStyle }: { width: string; mb?: string; extraStyle?: React.CSSProperties }) {
  return (
    <div
      className="rounded-full"
      style={{
        width,
        height: '6px',
        backgroundColor: '#e5e5e5',
        marginBottom: mb ?? '5px',
        ...extraStyle,
      }}
    />
  );
}

function DocumentCard({
  step,
  className,
}: {
  step: (typeof STEPS)[0];
  className?: string;
}) {
  return (
    <div
      className={`absolute inset-0 rounded-xl flex flex-col scale-100 ${className ?? ''}`}
      style={{
        opacity: 1,
        backgroundColor: '#fff',
        border: '1px solid #e6d5a8',
      }}
    >
      {/* Window chrome header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-xl shrink-0"
        style={{
          backgroundColor: step.headerColor,
          borderBottom: `1px solid ${
            step.number === 1 ? '#d0d0d0' : '#111'
          }`,
        }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: '#ff5f57',
              border: '1px solid #e0443e',
            }}
          />
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: '#febc2e',
              border: '1px solid #e09a1c',
            }}
          />
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: '#28c840',
              border: '1px solid #1aab29',
            }}
          />
        </div>
        <div className="flex-1 text-center">
          <span
            className="text-[10px] font-medium"
            style={{ color: step.headerText }}
          >
            {step.windowLabel}
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* Document body */}
      <div className="flex-1 p-4 flex flex-col gap-1 overflow-hidden">
        {step.number === 1 && (
          <>
            <div className="flex items-start gap-2 mb-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fa520f"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 shrink-0"
              >
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-ink mb-1">Customer Service Representative</p>
                <p className="text-[10px] text-steel mb-2">TechSmith Solutions · Toronto, ON</p>
              </div>
            </div>
            <Bar width="95%" />
            <Bar width="88%" />
            <Bar width="70%" mb="8px" />
            <Bar width="50%" />
          </>
        )}

        {step.number === 2 && (
          <>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[13px] font-bold" style={{ color: '#1f1f1f' }}>Priya Nair</p>
                <p className="text-[9px] text-steel">Customer Service Representative</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-steel">Toronto, ON</p>
                <p className="text-[8px] text-steel">priya.nair@email.com</p>
              </div>
            </div>
            <Bar width="32%" mb="10px" extraStyle={{ backgroundColor: '#333', height: '8px' }} />
            <div className="grid grid-cols-2 gap-y-1 gap-x-2 mb-3">
              <Bar width="100%" mb="0" />
              <Bar width="100%" mb="0" />
              <Bar width="85%" mb="0" />
              <Bar width="70%" mb="0" />
            </div>
            <Bar width="28%" mb="10px" extraStyle={{ backgroundColor: '#333', height: '8px' }} />
            <Bar width="92%" mb="4px" />
            <Bar width="78%" mb="4px" />
            <Bar width="85%" />
          </>
        )}

        {step.number === 3 && (
          <>
            <div className="mb-2">
              <p className="text-[10px] text-steel mb-1">May 26, 2026</p>
              <p className="text-[9px] text-steel">Hiring Selection Team</p>
              <p className="text-[9px] text-steel">TechSmith Solutions</p>
            </div>
            <div
              className="rounded px-2 py-1 mb-2 inline-block"
              style={{ backgroundColor: '#fff8e0', border: '1px solid #e6d5a8' }}
            >
              <p className="text-[9px] font-semibold text-ink">RE: Customer Service Representative</p>
            </div>
            <Bar width="40%" mb="6px" />
            <Bar width="95%" mb="4px" />
            <Bar width="88%" mb="4px" />
            <Bar width="92%" mb="4px" />
            <Bar width="75%" mb="8px" />
            <div className="mt-auto">
              <Bar width="25%" mb="3px" extraStyle={{ backgroundColor: '#333', height: '10px' }} />
              <Bar width="18%" mb="0" extraStyle={{ backgroundColor: '#333', height: '8px' }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProgressDots() {
  return (
    <div className="flex items-center justify-center gap-0 relative">
      <div
        className="absolute h-0.5 w-full"
        style={{
          backgroundColor: '#e5e5e5',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
      <div
        className="absolute h-0.5"
        style={{
          backgroundColor: '#fa520f',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '100%',
        }}
      />

      {STEPS.map((step) => (
        <div
          key={step.number}
          className="relative z-10 flex flex-col items-center gap-1"
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: '#fa520f',
              border: '2px solid #fa520f',
              boxShadow: '0 0 0 3px rgba(250,82,15,0.15)',
            }}
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span
            className="text-[9px] font-medium whitespace-nowrap"
            style={{ color: '#fa520f' }}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function ResultBadge() {
  return (
    <div
      className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full"
      style={{
        backgroundColor: '#fff8e0',
        border: '1px solid #e6d5a8',
        opacity: 1,
        transform: 'translateY(0)',
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fa520f"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span className="text-[11px] font-semibold text-ink">
        Application package ready
      </span>
    </div>
  );
}

export default function JobApplicationWorkflow() {
  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col items-center px-6 py-6"
      style={{
        backgroundColor: '#fafaf8',
        border: '1px solid #ededed',
        minHeight: '340px',
      }}
    >
      {/* Staggered card stack */}
      <div className="relative w-full mb-8" style={{ height: '220px' }}>
        {/* Card 1 — Job Description (back, offset left) */}
        <div
          className="absolute inset-0 job-card"
          style={{
            transform: 'translateX(-28px)',
            zIndex: 1,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <DocumentCard step={STEPS[0]} />
        </div>

        {/* Card 2 — Resume (middle, elevated, floating) */}
        <div
          className="absolute inset-0 job-card"
          style={{
            transform: 'translateY(-12px)',
            zIndex: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            animation: 'float-subtle 4s ease-in-out infinite',
          }}
        >
          <DocumentCard step={STEPS[1]} />
        </div>

        {/* Card 3 — Cover Letter (front, offset right, shimmer) */}
        <div
          className="absolute inset-0 job-card job-card-shimmer"
          style={{
            transform: 'translateX(28px)',
            zIndex: 3,
            boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
          }}
        >
          <DocumentCard step={STEPS[2]} />
        </div>
      </div>

      <ProgressDots />
      <ResultBadge />
    </div>
  );
}
