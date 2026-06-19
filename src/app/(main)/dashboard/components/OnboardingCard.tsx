'use client';

import React from 'react';
import Link from 'next/link';

interface Step {
  label: string;
  description: string;
  done: boolean;
  action: { type: 'link'; href: string; label: string } | { type: 'button'; label: string; onClick: () => void };
}

interface OnboardingCardProps {
  hasMasterResume: boolean;
  onAddJob: () => void;
}

export default function OnboardingCard({ hasMasterResume, onAddJob }: OnboardingCardProps) {
  const steps: Step[] = [
    {
      label: 'Add your master resume',
      description: 'Paste your base resume once. Every tailored resume will be generated from it.',
      done: hasMasterResume,
      action: { type: 'link', href: '/master-resume', label: 'Add resume' },
    },
    {
      label: 'Add your first job',
      description: 'Paste a job description and JobFoocus will generate a tailored resume + cover letter.',
      done: false,
      action: { type: 'button', label: 'Add job', onClick: onAddJob },
    },
    {
      label: 'Install the browser extension',
      description: 'Save jobs from any job board with one click. Works on LinkedIn, Indeed, and more.',
      done: false,
      action: { type: 'link', href: '/extension-install', label: 'Install' },
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="bg-card rounded-lg border border-hairline p-6">
      <div className="mb-5">
        <h2 className="text-[18px] font-semibold text-ink">
          Welcome to JobFoocus
        </h2>
        <p className="text-[13px] text-steel mt-1">
          {completedCount === 3
            ? "You're all set! Start tracking your job applications."
            : `${completedCount} of ${steps.length} steps complete — you're almost there.`}
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-md border border-hairline"
          >
            {/* Step number / checkmark */}
            <div
              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold mt-0.5 ${
                step.done
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface text-steel'
              }`}
            >
              {step.done ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                i + 1
              )}
            </div>

            {/* Text + CTA */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-[14px] font-medium ${step.done ? 'text-steel line-through' : 'text-ink'}`}>
                    {step.label}
                  </p>
                  <p className="text-[12px] text-muted mt-0.5">{step.description}</p>
                </div>
                {!step.done && (
                  step.action.type === 'link' ? (
                    <Link
                      href={step.action.href}
                      className="shrink-0 px-3 py-1.5 text-[12px] font-medium rounded-md text-white transition-colors duration-150"
                      style={{ backgroundColor: 'var(--primary)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-deep)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
                    >
                      {step.action.label}
                    </Link>
                  ) : (
                    <button
                      onClick={step.action.onClick}
                      className="shrink-0 px-3 py-1.5 text-[12px] font-medium rounded-md text-white transition-colors duration-150"
                      style={{ backgroundColor: 'var(--primary)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-deep)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
                    >
                      {step.action.label}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
