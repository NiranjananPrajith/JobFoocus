'use client';

import { useState } from 'react';

interface InsiderRequestFormProps {
  defaultEmail: string;
}

export default function InsiderRequestForm({ defaultEmail }: InsiderRequestFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [referrerName, setReferrerName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim() &&
    email.trim() &&
    referrerName.trim() &&
    referralCode.trim() &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/insider/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          referrer_name: referrerName.trim(),
          referral_code: referralCode.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit request.');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--success-bg, #e8f5e9)' }}>
          <svg className="w-8 h-8" fill="none" stroke="#4caf50" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-[20px] font-semibold text-ink mb-2">Request Submitted</h2>
        <p className="text-[14px] text-steel leading-relaxed max-w-[360px] mx-auto">
          Your insider testing account request has been submitted successfully.
          It will be reviewed within 24–48 hours. You will be notified once a decision is made.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border px-4 py-3 text-[13px]" style={{ borderColor: 'var(--danger-border, #fca5a5)', backgroundColor: 'var(--danger-bg, #fef2f2)', color: 'var(--danger-text, #dc2626)' }}>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="insider-name" className="block text-[13px] font-medium text-ink mb-1.5">
          Your name
        </label>
        <input
          id="insider-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          disabled={submitting}
          className="w-full px-3 py-2.5 rounded-lg border text-[14px] text-ink bg-canvas focus:outline-none disabled:opacity-50"
          style={{ borderColor: 'var(--hairline-strong, #d4d4d4)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--primary, #fa520f)'; e.target.style.boxShadow = '0 0 0 1px var(--primary, #fa520f)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--hairline-strong, #d4d4d4)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      <div>
        <label htmlFor="insider-email" className="block text-[13px] font-medium text-ink mb-1.5">
          JobFoocus account email
        </label>
        <input
          id="insider-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="account@example.com"
          disabled={submitting}
          className="w-full px-3 py-2.5 rounded-lg border text-[14px] text-ink bg-canvas focus:outline-none disabled:opacity-50"
          style={{ borderColor: 'var(--hairline-strong, #d4d4d4)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--primary, #fa520f)'; e.target.style.boxShadow = '0 0 0 1px var(--primary, #fa520f)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--hairline-strong, #d4d4d4)'; e.target.style.boxShadow = 'none'; }}
        />
        <p className="text-[11px] text-steel mt-1">Pre-filled from your account. Edit if requesting for a different account.</p>
      </div>

      <div>
        <label htmlFor="insider-referrer" className="block text-[13px] font-medium text-ink mb-1.5">
          Name of the person who referred you
        </label>
        <input
          id="insider-referrer"
          type="text"
          value={referrerName}
          onChange={(e) => setReferrerName(e.target.value)}
          placeholder="Referrer's full name"
          disabled={submitting}
          className="w-full px-3 py-2.5 rounded-lg border text-[14px] text-ink bg-canvas focus:outline-none disabled:opacity-50"
          style={{ borderColor: 'var(--hairline-strong, #d4d4d4)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--primary, #fa520f)'; e.target.style.boxShadow = '0 0 0 1px var(--primary, #fa520f)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--hairline-strong, #d4d4d4)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      <div>
        <label htmlFor="insider-code" className="block text-[13px] font-medium text-ink mb-1.5">
          Referral code
        </label>
        <input
          id="insider-code"
          type="text"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
          placeholder="Enter the referral code"
          disabled={submitting}
          className="w-full px-3 py-2.5 rounded-lg border text-[14px] text-ink bg-canvas focus:outline-none disabled:opacity-50"
          style={{ borderColor: 'var(--hairline-strong, #d4d4d4)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--primary, #fa520f)'; e.target.style.boxShadow = '0 0 0 1px var(--primary, #fa520f)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--hairline-strong, #d4d4d4)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full px-5 py-2.5 rounded-lg text-[14px] font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
        style={{ backgroundColor: 'var(--primary, #fa520f)', color: 'var(--on-primary, #ffffff)' }}
      >
        {submitting ? 'Submitting…' : 'Submit Request'}
      </button>
    </form>
  );
}
