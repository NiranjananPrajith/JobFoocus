'use client';

// CurrencyToggle — small segmented control for switching between
// USD, EUR, and INR on the pricing page. Writes the selected currency
// to a `jf-currency` cookie so the server can render the right prices
// on the next visit.

import type { Currency } from '@/lib/region';

interface CurrencyToggleProps {
  value: Currency;
  onChange: (currency: Currency) => void;
}

const OPTIONS: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'INR', label: 'INR' },
];

export default function CurrencyToggle({ value, onChange }: CurrencyToggleProps) {
  return (
    <div className="flex items-center justify-center mb-10">
      <div
        className="inline-flex items-center rounded-lg border border-hairline-soft dark:border-hairline bg-cream dark:bg-surface p-1"
        role="radiogroup"
        aria-label="Currency"
      >
        {OPTIONS.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={[
                'px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all duration-150',
                active
                  ? 'bg-ink text-white dark:bg-surface-elevated/40 dark:text-ink shadow-sm'
                  : 'text-steel hover:text-ink',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Write the currency preference cookie. Called from the client after
 * a toggle change.
 */
export function setCurrencyCookie(currency: Currency) {
  document.cookie = `jf-currency=${currency};path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`;
}

/**
 * Read the currency cookie on the client. Returns null if not set.
 */
export function getCurrencyCookie(): Currency | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)jf-currency=([^;]*)/);
  const v = match?.[1];
  if (v === 'USD' || v === 'EUR' || v === 'INR') return v;
  return null;
}
