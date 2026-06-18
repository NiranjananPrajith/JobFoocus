'use client';

import { useState } from 'react';

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: '1px solid var(--hairline-soft)',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left transition-colors"
        style={{ backgroundColor: open ? 'var(--surface)' : 'var(--canvas)' }}
      >
        <span className="text-[15px] font-medium text-ink">{question}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-steel transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: open ? '500px' : '0' }}
      >
        <div className="px-6 pb-5 text-[15px] text-steel leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  );
}

const faqData = [
  {
    category: 'Getting Started',
    items: [
      {
        question: 'What is Job Foocus?',
        answer: 'Job Foocus is a job application platform that turns a job description into a tailored resume and cover letter in one click. You upload your master resume once, then use the browser extension to capture any job posting — the AI generates ATS-optimized documents matched to that role and files everything in your dashboard.',
      },
      {
        question: 'Is it free?',
        answer: 'Yes — free forever with 5 job captures and 25 AI document edits per day. No credit card required. Paid plans start at $5/month (Pro) or $12/month (Max) for higher limits.',
      },
      {
        question: 'Which browsers does the extension work on?',
        answer: 'Chrome, Firefox, Edge, Brave, Opera, Vivaldi, Arc, and Zen. Install from the Chrome Web Store or Firefox Add-ons — it works on any Chromium-based browser (version 88+) and Firefox (version 140+).',
      },
      {
        question: 'Can I use Job Foocus on my phone?',
        answer: 'The website is fully responsive and works on mobile browsers. The browser extension is desktop-only, but once jobs are captured they sync to your dashboard and are accessible from any device.',
      },
    ],
  },
  {
    category: 'Documents & AI',
    items: [
      {
        question: 'How does the AI tailoring work?',
        answer: 'Upload your master resume — the complete version with all your experience and skills. When you capture a job, the AI analyzes both your resume and the job description, then generates a version that emphasizes the skills, experience, and keywords most relevant to that specific role. Your work history and education stay the same; the AI adjusts emphasis and wording to match.',
      },
      {
        question: 'Are the generated documents ATS-friendly?',
        answer: 'Yes. Job Foocus generates clean HTML that prints to PDF with ATS-safe formatting — no floats, no multi-column layouts, no text baked into images. Your resume passes through applicant tracking systems cleanly.',
      },
      {
        question: 'Can I edit the generated documents?',
        answer: 'Yes. Open any document and use the AI editor (click "Edit with AI") to make changes with natural language, or edit the HTML directly. You can also regenerate documents at any time from the job workspace.',
      },
      {
        question: 'What is the master resume?',
        answer: 'Your master resume is the complete, unfiltered version of your resume — all your experience, skills, and education. Job Foocus uses this as the source material when generating tailored versions. Keep it comprehensive; the AI will select and emphasize what\'s relevant for each job.',
      },
    ],
  },
  {
    category: 'Account & Billing',
    items: [
      {
        question: 'How do I upgrade my plan?',
        answer: 'Click the credit card icon in the top-right navigation, then click "Upgrade." You\'ll be taken to Checkout to complete the payment. No credit card is required for the free plan.',
      },
      {
        question: 'How do I cancel my subscription?',
        answer: 'Click the credit card icon → "Manage Subscription" and use the auto-renew toggle, or open the billing portal. Your access continues until the end of your current billing period.',
      },
      {
        question: 'Is my payment information secure?',
        answer: 'All payments are processed through Stripe (USD) or Razorpay (INR), both PCI Level 1 certified payment processors. Job Foocus never stores your credit card information — it\'s handled entirely by the payment provider.',
      },
    ],
  },
  {
    category: 'Privacy & Data',
    items: [
      {
        question: 'What data does the extension collect?',
        answer: 'The extension only reads page content when you click "Add Job" or use the right-click shortcut. It extracts publicly visible job posting details (title, company, description, location) and sends them to your dashboard. No data is collected passively.',
      },
      {
        question: 'Where is my data stored?',
        answer: 'Your account data, resumes, and application records are stored securely in the cloud and synced across your devices. AI processing happens on-demand and nothing is retained after document generation. Your personal information is never sent to third parties.',
      },
      {
        question: 'Can I export or delete my data?',
        answer: 'Yes. Go to Account → Export Data to download everything, or Account → Delete Account to permanently remove all your data. You\'re always in control.',
      },
    ],
  },
];

export default function FaqSection() {
  return (
    <div className="space-y-10">
      {faqData.map((group) => (
        <div key={group.category}>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-primary mb-4">
            {group.category}
          </h3>
          <div className="space-y-3">
            {group.items.map((item) => (
              <FaqItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
