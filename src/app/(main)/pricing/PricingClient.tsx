'use client';

// PricingClient — client component that owns the currency toggle and
// the three pricing cards. The server page passes the default currency
// (resolved from the cookie or the user's geo region), and this
// component manages the interactive state.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/design/Card';
import CurrencyToggle, { setCurrencyCookie } from './CurrencyToggle';
import PricingCTAButtons from './PricingCTAButtons';
import { formatTierPriceCurrency, type Tier } from '@/lib/limits';
import type { Currency } from '@/lib/region';

// Plan limits (mirrors src/lib/limits.ts). Declared here so the
// client component can render feature lists without importing a
// server-only module.
const PLAN_LIMITS = {
  free: { jobs: 5,   edits: 25 },
  pro:  { jobs: 25,  edits: 150 },
  max:  { jobs: 250, edits: 500 },
};

interface PlanDef {
  name: string;
  tier?: Tier;
  description: string;
  highlight: boolean;
  features: string[];
  cta: string;
  ctaVariant: 'primary' | 'outline' | 'dark';
  ctaMode: 'signup' | 'checkout';
}

const BASE_PLANS: PlanDef[] = [
  {
    name: 'Free',
    tier: undefined,
    description: 'Get started with basic job tracking at no cost.',
    highlight: false,
    features: [
      `Add up to ${PLAN_LIMITS.free.jobs} jobs per day`,
      `Up to ${PLAN_LIMITS.free.edits} document edits per day`,
      'Track unlimited total applications',
      'Generate tailored resumes & cover letters',
      'Basic job categorization',
      'Browser extension for easy importing',
    ],
    cta: 'Get Started',
    ctaVariant: 'outline',
    ctaMode: 'signup',
  },
  {
    name: 'Pro',
    tier: 'pro',
    description: 'More jobs and edits for an active job search.',
    highlight: true,
    features: [
      `Add up to ${PLAN_LIMITS.pro.jobs} jobs per day`,
      `Up to ${PLAN_LIMITS.pro.edits} document edits per day`,
      'Everything in Free',
      'Smart follow-up reminders when employers go quiet',
      'Priority AI document generation',
      'Extended application history',
    ],
    cta: 'Upgrade to Pro',
    ctaVariant: 'primary',
    ctaMode: 'checkout',
  },
  {
    name: 'Max',
    tier: 'max',
    description: 'Highest caps for power users and active searchers.',
    highlight: false,
    features: [
      `Add up to ${PLAN_LIMITS.max.jobs} jobs per day`,
      `Up to ${PLAN_LIMITS.max.edits} document edits per day`,
      'Everything in Pro',
      'Job Foocus Assistant writes follow-up responses for you',
      'Pre-written, ready-to-send follow-up messages',
      'Dedicated priority support',
    ],
    cta: 'Get Max',
    ctaVariant: 'dark',
    ctaMode: 'checkout',
  },
];

interface PricingClientProps {
  defaultCurrency: Currency;
}

export default function PricingClient({ defaultCurrency }: PricingClientProps) {
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const router = useRouter();

  const handleChange = (c: Currency) => {
    setCurrency(c);
    setCurrencyCookie(c);
    router.refresh();
  };

  const isIN = currency === 'INR';
  const isEUR = currency === 'EUR';

  return (
    <>
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-primary mb-4">
          Pricing
        </p>
        <h1 className="text-[36px] font-semibold text-ink mb-4 leading-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-[16px] text-steel max-w-[480px] mx-auto leading-relaxed">
          Start free and scale up as your job search grows. No hidden fees, no surprises — just the tools you need to land your next role.
        </p>
      </div>

      {/* Currency toggle */}
      <CurrencyToggle value={currency} onChange={handleChange} />

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {BASE_PLANS.map((plan) => {
          const price = plan.tier
            ? formatTierPriceCurrency(plan.tier, currency)
            : formatTierPriceCurrency('free', currency);

          return (
            <Card
              key={plan.name}
              variant={plan.highlight ? 'elevated' : 'cream'}
              className={`relative flex flex-col ${
                plan.highlight ? 'border-2 border-primary' : ''
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold text-white"
                    style={{ backgroundColor: '#fa520f' }}
                  >
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-steel mb-2">
                  {plan.name}
                </p>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-[40px] font-semibold text-ink leading-none">
                    {price}
                  </span>
                  <span className="text-[14px] text-steel mb-1">
                    /per month
                  </span>
                </div>
                <p className="text-[14px] text-steel leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <div className="flex-1">
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={plan.highlight ? '#fa520f' : '#4caf50'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 mt-[2px]"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-[14px] text-ink leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <PricingCTAButtons
                cta={plan.cta}
                ctaVariant={plan.ctaVariant}
                mode={plan.ctaMode}
                tier={plan.tier === 'pro' || plan.tier === 'max' ? plan.tier : undefined}
                currency={currency}
              />
            </Card>
          );
        })}
      </div>

      {/* FAQ / Trust Bar */}
      <div className="bg-cream rounded-xl p-8 md:p-10 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-[28px] font-semibold text-ink mb-1">No contracts</p>
            <p className="text-[14px] text-steel">Cancel or change plans anytime, no penalties.</p>
          </div>
          <div>
            <p className="text-[28px] font-semibold text-ink mb-1">Secure payments</p>
            <p className="text-[14px] text-steel">
              All transactions are encrypted and handled securely by{' '}
              {isIN ? 'Razorpay' : 'Stripe'}.
            </p>
          </div>
          <div>
            <p className="text-[28px] font-semibold text-ink mb-1">Money-back guarantee</p>
            <p className="text-[14px] text-steel">Not satisfied? Full refund within 30 days.</p>
          </div>
        </div>
      </div>

      {/* Still Have Questions */}
      <div className="text-center mb-12">
        <p className="text-[16px] text-steel">
          Still have questions?{' '}
          <a
            href="mailto:hello@jobfoocus.com"
            className="text-primary hover:underline font-medium"
          >
            Get in touch
          </a>
        </p>
      </div>
    </>
  );
}
