'use client';

// Shared stepper UI used by both the browser-extension pipeline
// (rendered inline on /application) and the manual AddJobModal.
// Renders the three steps (analyzing → resume → cover_letter) with
// green-check / spinner / pending visual states, and — when
// currentStep === 'done' — the "All done" footer with a
// "View job" button. The parent supplies its own card / modal
// wrapper and its own header (so this component is just the body).

import Button from '@/components/design/Button';

export type AddJobStep = 'analyzing' | 'resume' | 'cover_letter' | 'done';

const STEPS: { id: AddJobStep; label: string; sub: string }[] = [
  {
    id: 'analyzing',
    label: 'Analyzing job description',
    sub: 'Extracting company, role, and key requirements',
  },
  {
    id: 'resume',
    label: 'Creating your resume',
    sub: 'Tailoring your master resume to this role',
  },
  {
    id: 'cover_letter',
    label: 'Writing your cover letter',
    sub: 'Drafting a personalized cover letter',
  },
];

interface AddJobStepperProps {
  currentStep: AddJobStep;
  /**
   * Called when the user clicks "View job" in the done footer.
   * If omitted, the "View job" button is hidden (parent will rely
   * on the auto-redirect path).
   */
  onViewJob?: () => void;
  /** Override the default "View job" label. */
  viewJobLabel?: string;
}

export default function AddJobStepper({
  currentStep,
  onViewJob,
  viewJobLabel = 'View job',
}: AddJobStepperProps) {
  const currentIdx = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <>
      <ol className="space-y-4">
        {STEPS.map((step, idx) => {
          const isDone = currentIdx > idx || currentStep === 'done';
          const isActive = !isDone && currentIdx === idx;
          return (
            <li key={step.id} className="flex items-start gap-3">
              <div
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-primary text-white'
                    : 'bg-stone-200 text-steel'
                }`}
                aria-hidden
              >
                {isDone ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isActive ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-spin"
                  >
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                  </svg>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div className="flex-1 pt-0.5">
                <p
                  className={`text-[14px] font-medium ${
                    isActive || isDone ? 'text-ink' : 'text-steel'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[12px] text-steel mt-0.5">{step.sub}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {currentStep === 'done' && onViewJob && (
        <div className="mt-6 pt-4 border-t border-hairline-soft flex items-center justify-between gap-3">
          <p className="text-[13px] text-steel">All done. Taking you to your new job…</p>
          <Button variant="primary" onClick={onViewJob}>
            {viewJobLabel}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-1.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      )}
    </>
  );
}
