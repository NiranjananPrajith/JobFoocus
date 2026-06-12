'use client';

import { useState } from 'react';

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: '1px solid #ededed',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left transition-colors"
        style={{ backgroundColor: open ? '#fafafa' : '#ffffff' }}
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
    category: 'General',
    items: [
      {
        question: 'Is Job Foocus free?',
        answer: 'Yes. The free tier includes 5 job additions and 25 AI document edits per day. No credit card required to sign up.',
      },
      {
        question: 'What browsers does the extension work on?',
        answer: 'Chrome, Edge, Brave (version 88+), and Firefox (version 109+).',
      },
      {
        question: 'Does the extension work on all job boards?',
        answer: 'The extension works on any publicly visible job posting page — LinkedIn, Indeed, Glassdoor, company career pages, and more. If the page shows a job description, Job Foocus can capture it. The extension cannot read pages that require login to view the job description (e.g., some LinkedIn pages when not logged in).',
      },
      {
        question: 'Can I use Job Foocus on my phone?',
        answer: 'The website is responsive and works on mobile browsers. The browser extension is desktop-only (Chrome, Edge, Brave, Firefox).',
      },
    ],
  },
  {
    category: 'Documents',
    items: [
      {
        question: 'How does Job Foocus tailor my resume?',
        answer: 'Job Foocus uses AI to analyze your master resume and the job description, then creates a version of your resume that emphasizes the skills, experience, and keywords most relevant to that specific job. Your contact information, work history, and education stay the same — the AI adjusts emphasis, wording, and formatting to match the job.',
      },
      {
        question: 'Are the generated documents ATS-friendly?',
        answer: 'Yes. Job Foocus generates clean HTML that prints to PDF with ATS-safe formatting — no floats, no multi-column layouts, no text-in-images. Your resume will pass through applicant tracking systems cleanly.',
      },
      {
        question: 'Can I edit the generated documents?',
        answer: 'Yes. Open any document and use the AI editor (click "Edit with AI") or edit the HTML directly. You can also regenerate documents at any time.',
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
        answer: 'Click the credit card icon in the top-right navigation, then click "Upgrade." You\'ll be taken to Stripe Checkout to complete the payment.',
      },
      {
        question: 'How do I cancel my subscription?',
        answer: 'Click the credit card icon → "Manage Subscription" → cancel from the Stripe Customer Portal. Your access continues until the end of your current billing period.',
      },
      {
        question: 'Is there a refund policy?',
        answer: 'Contact us at support@jobfoocus.com if you have billing concerns. We handle refunds on a case-by-case basis.',
      },
      {
        question: 'Is my payment information secure?',
        answer: 'All payments are processed through Stripe, a PCI Level 1 certified payment processor. Job Foocus never stores your credit card information — it\'s handled entirely by Stripe.',
      },
    ],
  },
  {
    category: 'Privacy & Security',
    items: [
      {
        question: 'What data does the extension collect?',
        answer: 'The extension only reads page content when you click "Add Job" or use the right-click shortcut. It extracts publicly visible job posting details (title, company, description, location, salary) and sends them to your Job Foocus dashboard. No data is collected passively.',
      },
      {
        question: 'Where is my data stored?',
        answer: 'Your account data, resumes, and application records are stored securely in the cloud. We implement industry-standard security measures to protect your information.',
      },
      {
        question: 'Can I export or delete my data?',
        answer: 'Yes. Go to Account → Export Data to download all your data, or Account → Delete Account to permanently remove everything.',
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
