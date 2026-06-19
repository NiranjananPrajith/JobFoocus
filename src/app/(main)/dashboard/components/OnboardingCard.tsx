'use client';

import Card from '@/components/design/Card';
import Button from '@/components/design/Button';

interface OnboardingCardProps {
  hasMasterResume: boolean;
  hasFirstJob: boolean;
  onStartResume: () => void;
  onAddJob: () => void;
}

interface StepProps {
  number: number;
  title: string;
  done: boolean;
  current: boolean;
  action?: React.ReactNode;
}

function Step({ number, title, done, current, action }: StepProps) {
  return (
    <div className={`flex items-start gap-3 py-3 ${current ? '' : 'opacity-60'}`}>
      <div
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold"
        style={{
          backgroundColor: done ? 'var(--primary)' : current ? 'var(--surface)' : 'var(--surface)',
          color: done ? 'var(--on-primary)' : current ? 'var(--primary)' : 'var(--steel)',
          border: current ? '2px solid var(--primary)' : done ? 'none' : '1px solid var(--hairline)',
        }}
      >
        {done ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-ink">{title}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export default function OnboardingCard({ hasMasterResume, hasFirstJob, onStartResume, onAddJob }: OnboardingCardProps) {
  if (hasFirstJob) return null;

  const step1Done = hasMasterResume;

  return (
    <Card variant="elevated" className="p-5 border-l-4 border-l-primary">
      <h3 className="text-[14px] font-semibold text-ink mb-2">
        Get started
      </h3>
      <p className="text-[13px] text-steel mb-3">
        Set up your workspace to start tracking applications.
      </p>
      <div>
        <Step
          number={1}
          title="Upload your master resume"
          done={step1Done}
          current={!step1Done}
          action={
            !step1Done ? (
              <Button variant="outline" onClick={onStartResume} className="text-[12px] px-3 py-1.5">
                Start →
              </Button>
            ) : undefined
          }
        />
        <Step
          number={2}
          title="Add your first job"
          done={false}
          current={step1Done}
          action={
            step1Done ? (
              <Button variant="primary" onClick={onAddJob} className="text-[12px] px-3 py-1.5">
                Add Job →
              </Button>
            ) : undefined
          }
        />
        <Step
          number={3}
          title="Install the browser extension"
          done={false}
          current={false}
        />
      </div>
    </Card>
  );
}
