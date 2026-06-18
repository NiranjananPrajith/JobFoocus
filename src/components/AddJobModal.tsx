'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Card from '@/components/design/Card';
import Button from '@/components/design/Button';
import CategorySelector from '@/components/CategorySelector';
import ManageCategoriesModal from '@/components/ManageCategoriesModal';
import AddJobStepper, { type AddJobStep } from '@/components/AddJobStepper';
import { isMasterResumeBlank, formatJobDescription, conversationalParseJD, generateMaskedJobEntryAndDocuments } from '@/lib/ai-generation';
import { ensureUncategorizedCategory, getUserCategories, saveCategory, type UserCategory } from '@/lib/storage-adapter';
import UpgradePromptModal from '@/components/UpgradePromptModal';
import type { FormattedJD, ClarifyResult } from '@/lib/ai-generation';

type ModalState = 'two_column' | 'paste_jd' | 'blank_resume' | 'processing' | 'manual_fill' | 'clarify_jd';

const MAX_CLARIFY_ROUNDS = 3;

// Values treated as "the AI couldn't figure this out"
const UNKNOWN_VALUES = new Set([
  '', 'unknown', 'unknown company', 'n/a', 'na', 'null', 'none',
  'not specified', 'not found', '[unknown]', 'undefined',
]);
function isUnknownValue(v: string | undefined | null): boolean {
  if (v == null) return true;
  return UNKNOWN_VALUES.has(String(v).trim().toLowerCase());
}

const INSTALL_GUIDE_URL = '/extension-install';

// Match the extension pipeline's 700ms pause so the user gets a
// beat to see the "All done" state before the view swaps.
const AUTO_REDIRECT_DELAY_MS = 700;

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobAdded?: () => void;
}

export default function AddJobModal({ isOpen, onClose, onJobAdded }: AddJobModalProps) {
  const router = useRouter();
  const [state, setState] = useState<ModalState>('two_column');
  const [jdText, setJdText] = useState('');
  // Shown above the textarea in paste_jd when the AI pipeline failed
  // to extract a proper job description. Cleared as soon as the user
  // starts editing the text, so they see a clean field on retry.
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<AddJobStep>('analyzing');
  const [selectedCategory, setSelectedCategory] = useState('Uncategorized');
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showNewCatPopup, setShowNewCatPopup] = useState(false);

  // Daily-limit state. Pre-checked at submit time and on bail. We
  // capture the snapshot the server returned so the upgrade modal can
  // show the user the exact numbers they were blocked at.
  const [limitBlock, setLimitBlock] = useState<{
    tier: 'free' | 'pro' | 'max';
    used: number;
    limit: number;
    editsUsed: number;
    editsLimit: number;
  } | null>(null);

  // Set when the AI pipeline finishes — points at the saved-app view
  // for the new job. The processing state shows the "View job" button
  // and auto-redirects to this URL after AUTO_REDIRECT_DELAY_MS.
  const [destination, setDestination] = useState<string | null>(null);

  // Header copy for the processing state. We surface the company /
  // job title that the AI extracted (or the user-typed header from
  // paste_jd) so the user can verify the AI pulled the right posting.
  const [resultHeader, setResultHeader] = useState<{ company: string; jobTitle: string } | null>(null);

  // Manual-fill state: the AI partially parsed the JD but couldn't
  // identify company name and/or job title. We hold the parsed JD
  // so we don't re-call the AI when the user fills in the gaps.
  const [manualFillJD, setManualFillJD] = useState<FormattedJD | null>(null);
  const [manualCompany, setManualCompany] = useState('');
  const [manualTitle, setManualTitle] = useState('');

  // Clarify state: the AI couldn't parse the JD or fields are missing.
  // We ask the user short natural questions up to MAX_CLARIFY_ROUNDS.
  const [clarifyQuestion, setClarifyQuestion] = useState<string | null>(null);
  const [clarifyAnswer, setClarifyAnswer] = useState('');
  const [clarifyHistory, setClarifyHistory] = useState<{ question: string; answer: string }[]>([]);
  const [clarifyRound, setClarifyRound] = useState(0);
  const [clarifyPartialJD, setClarifyPartialJD] = useState<FormattedJD | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      getUserCategories().then(setUserCategories);
    }
  }, [mounted]);

  useEffect(() => {
    if (isOpen) {
      setState('two_column');
      setJdText('');
      setPasteError(null);
      setSelectedCategory('Uncategorized');
      setDestination(null);
      setResultHeader(null);
      setManualFillJD(null);
      setManualCompany('');
      setManualTitle('');
      setClarifyQuestion(null);
      setClarifyAnswer('');
      setClarifyHistory([]);
      setClarifyRound(0);
      setClarifyPartialJD(null);
    }
  }, [isOpen]);

  // When processingStep transitions to 'done', wait the celebration
  // pause then auto-close the modal AND navigate to the saved-app
  // view. Same UX as the extension pipeline.
  useEffect(() => {
    if (state !== 'processing' || processingStep !== 'done' || !destination) return;
    const t = setTimeout(() => {
      onClose();
      router.push(destination);
    }, AUTO_REDIRECT_DELAY_MS);
    return () => clearTimeout(t);
  }, [state, processingStep, destination, onClose, router]);

  // Prevent scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleAddManually = async () => {
    const blank = await isMasterResumeBlank();
    if (blank) {
      setState('blank_resume');
    } else {
      setState('paste_jd');
    }
  };

  const handleSubmitJD = async () => {
    if (!jdText.trim()) return;
    setPasteError(null);

    // Pre-flight usage check. Defense-in-depth: the server also gates
    // the save path, but checking client-side lets us bail with a
    // friendly modal *before* spending AI tokens on a pipeline that
    // will be rejected. If /api/usage/check fails for any reason
    // (network, 500), we let the request through — the server gate
    // will catch the real cap, and we don't want a transient error
    // to lock the user out.
    try {
      const checkRes = await fetch('/api/usage/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_job' }),
      });
      if (checkRes.ok) {
        const check = await checkRes.json();
        if (!check.allowed) {
          setLimitBlock({
            tier: check.tier,
            used: check.jobsUsed,
            limit: check.jobsLimit,
            editsUsed: check.editsUsed,
            editsLimit: check.editsLimit,
          });
          return;
        }
      }
    } catch (err) {
      // Soft fail — the server gate will catch real abuse.
      console.warn('[AddJobModal] usage pre-check failed, continuing:', err);
    }

    // Step 1: Try to parse the JD. If the AI throws, it's a
    // complete parse failure — start the conversational loop.
    let formattedJD;
    try {
      formattedJD = await formatJobDescription(jdText);
    } catch {
      // Complete parse failure — ask a generic starter question.
      // conversationalParseJD will be called once the user answers.
      setClarifyQuestion("We couldn't understand this job description. What job are you applying for?");
      setClarifyAnswer('');
      setClarifyHistory([]);
      setClarifyRound(0);
      setClarifyPartialJD(null);
      setState('clarify_jd');
      return;
    }

    // Step 2: Check for missing required fields.
    const missingCompany = isUnknownValue(formattedJD.company);
    const missingTitle = isUnknownValue(formattedJD.job_title);
    if (missingCompany || missingTitle) {
      const question = missingCompany && missingTitle
        ? "We couldn't find a company name or job title in the job description. Can you tell us both?"
        : missingCompany
          ? "We couldn't find a company name in the job description. What company is this job for?"
          : "We couldn't find a job title in the job description. Can you enter it below?";
      setClarifyQuestion(question);
      setClarifyAnswer('');
      setClarifyHistory([]);
      setClarifyRound(0);
      setClarifyPartialJD(formattedJD);
      setState('clarify_jd');
      return;
    }

    // Step 3: All fields present — proceed with the full pipeline.
    await runFullPipeline(formattedJD);
  };

  const handleClarifySubmit = async () => {
    const answer = clarifyAnswer.trim();
    if (!answer) return;

    const newHistory = [
      ...clarifyHistory,
      { question: clarifyQuestion!, answer },
    ];
    const nextRound = clarifyRound + 1;

    if (nextRound >= MAX_CLARIFY_ROUNDS) {
      // Exhausted retries — fall back to manual-fill.
      if (clarifyPartialJD) {
        setManualFillJD(clarifyPartialJD);
        setManualCompany(isUnknownValue(clarifyPartialJD.company) ? '' : clarifyPartialJD.company);
        setManualTitle(isUnknownValue(clarifyPartialJD.job_title) ? '' : clarifyPartialJD.job_title);
        setState('manual_fill');
      } else {
        setPasteError("I couldn't identify this as a job description. Make sure you've pasted the full posting — including the job title, company name, responsibilities, and requirements — then try again.");
        setState('paste_jd');
      }
      return;
    }

    try {
      const result = await conversationalParseJD(jdText, newHistory);

      switch (result.kind) {
        case 'success':
          await runFullPipeline(result.formattedJD);
          break;
        case 'question':
          setClarifyQuestion(result.question);
          setClarifyHistory(newHistory);
          setClarifyRound(nextRound);
          setClarifyAnswer('');
          break;
        case 'failed':
          // AI explicitly gave up — fall back to manual-fill.
          if (clarifyPartialJD) {
            setManualFillJD(clarifyPartialJD);
            setManualCompany(isUnknownValue(clarifyPartialJD.company) ? '' : clarifyPartialJD.company);
            setManualTitle(isUnknownValue(clarifyPartialJD.job_title) ? '' : clarifyPartialJD.job_title);
            setState('manual_fill');
          } else {
            setPasteError(result.message);
            setState('paste_jd');
          }
          break;
      }
    } catch {
      setPasteError('Something went wrong. Try pasting the full job description again.');
      setState('paste_jd');
    }
  };

  // Shared pipeline runner used by handleSubmitJD, handleManualFillSave,
  // Accepts a pre-formatted JD to avoid a second AI call.
  async function runFullPipeline(alreadyFormatted: FormattedJD) {
    setProcessingStep('analyzing');
    setState('processing');
    setPasteError(null);

    try {
      // If the user kept the default Uncategorized selection, make sure
      // the system row exists BEFORE the pipeline runs.
      if (selectedCategory === 'Uncategorized') {
        const uncategorized = await ensureUncategorizedCategory();
        if (!uncategorized) {
          throw new Error("Couldn't set up the Uncategorized category. Please refresh and try again.");
        }
      }

      const result = await generateMaskedJobEntryAndDocuments(jdText, selectedCategory, (step) => {
        setProcessingStep(step);
      }, alreadyFormatted);

      // Surface the AI-extracted header on the processing view so the
      // user can verify the right posting was pulled.
      setResultHeader({
        company: result.company || 'This job',
        jobTitle: result.job_title || '',
      });

      // Build the saved-app URL and let the useEffect above handle
      // the auto-redirect after the celebration pause.
      const appUrl = `/application?app=${encodeURIComponent(result.category)}/${encodeURIComponent(result.folder)}`;
      setDestination(appUrl);
      setProcessingStep('done');
      onJobAdded?.();

      // Bump the daily counter. Fire-and-forget — the user is about
      // to be redirected to the new app, so we don't need to wait
      // for the round-trip or surface an error if it fails.
      void fetch('/api/usage/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_job' }),
      }).catch((err) => console.warn('[AddJobModal] usage increment failed:', err));
    } catch (err) {
      console.error('[AddJobModal] Failed to process job:', err);
      const raw = err instanceof Error ? err.message : '';
      const isParseFailure =
        /json|parse|format/i.test(raw) ||
        raw.toLowerCase().includes('malformed') ||
        raw.toLowerCase().includes('did not return');
      setPasteError(
        isParseFailure
          ? "We couldn't find a proper job description in your text. Make sure you've pasted the full posting — including the job title, company name, responsibilities, and requirements — then try again."
          : `Something went wrong while processing this job. ${raw ? `(${raw})` : ''} You can edit the text below and try again.`
      );
      setState('paste_jd');
      setProcessingStep('analyzing');
    }
  }

  const handleManualFillSave = async () => {
    if (!manualFillJD) return;
    const company = manualCompany.trim();
    const title = manualTitle.trim();
    if (!company && isUnknownValue(manualFillJD.company)) {
      setPasteError('Please enter the company name.');
      return;
    }
    if (!title && isUnknownValue(manualFillJD.job_title)) {
      setPasteError('Please enter the job title.');
      return;
    }

    const filledJD: FormattedJD = {
      ...manualFillJD,
      company: company || manualFillJD.company,
      job_title: title || manualFillJD.job_title,
    };

    await runFullPipeline(filledJD);
  };

  const handleViewJob = () => {
    if (!destination) return;
    onClose();
    router.push(destination);
  };

  const handleCreateNewCategory = async (newCat: UserCategory) => {
    const result = await saveCategory(newCat);
    if (result.success) {
      const cats = await getUserCategories();
      setUserCategories(cats);
      setSelectedCategory(newCat.name);
    }
    setShowNewCatPopup(false);
  };

  const handleCategoriesChanged = async () => {
    const cats = await getUserCategories();
    setUserCategories(cats);
  };

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 px-4 bg-scrim backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && state !== 'processing') onClose(); }}
    >
      <div
        className="bg-canvas rounded-2xl shadow-2xl w-full max-w-2xl relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {state !== 'processing' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center text-steel hover:bg-surface-elevated hover:text-ink transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* ─── State: Two Column ─── */}
        {state === 'two_column' && (
          <div className="p-8">
            <h2 className="text-[22px] font-semibold text-ink mb-1">Add a Job</h2>
            <p className="text-[14px] text-steel mb-8">Choose how you want to add a new job application.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left: Extension */}
              <Card variant="cream" className="p-6 flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-ink mb-1">Use the Browser Extension</p>
                  <p className="text-[13px] text-steel leading-relaxed">
                    The easiest way — browse any job posting and click the extension to import it automatically.
                  </p>
                </div>
                <Link
                  href={INSTALL_GUIDE_URL}
                  className="w-full"
                >
                  <Button variant="primary" className="w-full justify-center">
                    How to Install
                  </Button>
                </Link>
                <p className="text-[11px] text-muted">Open the install guide</p>
              </Card>

              {/* Right: Manual */}
              <Card variant="outlined" className="p-6 flex flex-col items-center text-center gap-4 border-dashed">
                <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-ink mb-1">Paste a Job Description</p>
                  <p className="text-[13px] text-steel leading-relaxed">
                    Copy a job posting text and paste it here. We&apos;ll classify it and generate your tailored resume.
                  </p>
                </div>
                <Button variant="dark" onClick={handleAddManually} className="w-full justify-center">
                  Add Manually
                </Button>
              </Card>
            </div>
          </div>
        )}

        {/* ─── State: Blank Resume Warning ─── */}
        {state === 'blank_resume' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 className="text-[22px] font-semibold text-ink mb-3">Fill Your Master Resume First</h2>
            <p className="text-[14px] text-steel leading-relaxed max-w-sm mx-auto mb-8">
              Before adding jobs, we need your background information so we can generate tailored resumes and cover letters. Please fill in your Master Resume first.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="/master-resume" onClick={onClose}>
                <Button variant="primary" className="w-full sm:w-auto justify-center">
                  Go to Master Resume
                </Button>
              </a>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ─── State: Paste JD ─── */}
        {state === 'paste_jd' && (
          <div className="p-8">
            <h2 className="text-[22px] font-semibold text-ink mb-1">Paste Job Description</h2>
            <p className="text-[14px] text-steel mb-6">
              Paste the full job posting text. Our AI will generate your tailored resume and cover letter.
            </p>

            <div className="mb-4">
              <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">
                Category
              </label>
              <CategorySelector
                value={selectedCategory}
                onChange={setSelectedCategory}
                onManageClick={() => setShowManageCategories(true)}
              />
            </div>

            {pasteError && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-900 leading-relaxed">
                {pasteError}
              </div>
            )}

            <div className="mb-2">
              <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">
                Job Description
              </label>
              <textarea
                value={jdText}
                onChange={(e) => {
                  setJdText(e.target.value);
                  // Clear the error as soon as the user starts editing
                  // so they see a clean field on retry.
                  if (pasteError) setPasteError(null);
                }}
                placeholder="Paste the full job posting here — include the job title, company name, responsibilities, and requirements..."
                rows={12}
                className="w-full px-4 py-3 rounded-xl border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none placeholder:text-muted"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-[12px] text-steel">{jdText.length} characters</p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setState('two_column')}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmitJD}
                  disabled={!jdText.trim()}
                >
                  Add Job
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── State: Manual Fill ─── */}
        {state === 'manual_fill' && manualFillJD && (
          <div className="p-8">
            <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-primary">
              One more step
            </div>
            <h2 className="text-[22px] font-semibold text-ink mb-2">
              We couldn&apos;t find the{' '}
              {(() => {
                const missing: string[] = [];
                if (isUnknownValue(manualFillJD.company)) missing.push('company name');
                if (isUnknownValue(manualFillJD.job_title)) missing.push('job title');
                return missing.join(' and ');
              })()}
            </h2>
            <p className="text-[14px] text-steel leading-relaxed mb-6">
              The job description is a bit sparse, so our AI couldn&apos;t pick up the missing
              detail{isUnknownValue(manualFillJD.company) && isUnknownValue(manualFillJD.job_title) ? 's' : ''}.
              Fill in the highlighted field{isUnknownValue(manualFillJD.company) && isUnknownValue(manualFillJD.job_title) ? 's' : ''} below
              and we&apos;ll save the application and generate your resume and cover letter.
            </p>

            {pasteError && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-900 leading-relaxed">
                {pasteError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] uppercase tracking-wide text-steel mb-2">
                  Company
                  {isUnknownValue(manualFillJD.company) && <span className="ml-1 text-red-600 normal-case">*</span>}
                </label>
                <input
                  type="text"
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value)}
                  placeholder="e.g. Concentrix"
                  disabled={!isUnknownValue(manualFillJD.company)}
                  className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11 disabled:bg-canvas disabled:text-steel disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-wide text-steel mb-2">
                  Job title
                  {isUnknownValue(manualFillJD.job_title) && <span className="ml-1 text-red-600 normal-case">*</span>}
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Customer Service / Technical Support Rep"
                  disabled={!isUnknownValue(manualFillJD.job_title)}
                  className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11 disabled:bg-canvas disabled:text-steel disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => { setState('paste_jd'); setManualFillJD(null); }}>
                Back
              </Button>
              <Button variant="primary" onClick={handleManualFillSave}>
                Save &amp; Continue
              </Button>
            </div>
          </div>
        )}

        {/* ─── State: Clarify JD ─── */}
        {state === 'clarify_jd' && clarifyQuestion && (
          <div className="p-8">
            <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-primary">
              One more detail needed
            </div>
            <h2 className="text-[22px] font-semibold text-ink mb-4">
              {clarifyQuestion}
            </h2>

            {pasteError && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-900 leading-relaxed">
                {pasteError}
              </div>
            )}

            <input
              type="text"
              value={clarifyAnswer}
              onChange={(e) => setClarifyAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleClarifySubmit(); }}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 rounded-xl border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted"
              autoFocus
            />

            {/* Reference text */}
            <details className="mt-4 group">
              <summary className="text-[12px] text-steel cursor-pointer select-none hover:text-ink transition-colors">
                View original job description
              </summary>
              <div className="mt-2 p-3 rounded-lg bg-canvas border border-hairline text-[12px] text-steel leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                {jdText}
              </div>
            </details>

            <div className="flex items-center justify-between mt-6">
              <p className="text-[12px] text-steel">
                {MAX_CLARIFY_ROUNDS - clarifyRound} attempt{MAX_CLARIFY_ROUNDS - clarifyRound !== 1 ? 's' : ''} remaining
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => { setState('paste_jd'); }}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleClarifySubmit}
                  disabled={!clarifyAnswer.trim()}
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── State: Processing ─── */}
        {state === 'processing' && (
          <div className="p-8">
            <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-primary">
              Adding to your dashboard
            </div>
            <h2 className="text-[22px] md:text-[24px] font-semibold text-ink mb-1">
              {resultHeader?.company || 'This job'}
            </h2>
            {resultHeader?.jobTitle && resultHeader.jobTitle !== resultHeader?.company && (
              <p className="text-[14px] text-steel mb-4">{resultHeader.jobTitle}</p>
            )}
            {(!resultHeader?.jobTitle || resultHeader.jobTitle === resultHeader?.company) && (
              <div className="mb-4" />
            )}
            <p className="text-[14px] text-steel mb-6 leading-relaxed">
              We&apos;re generating a tailored resume and cover letter from your pasted posting. This usually takes 20–60 seconds.
            </p>
            <AddJobStepper
              currentStep={processingStep}
              onViewJob={destination ? handleViewJob : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );

  const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;

  return (
    <>
      {modalRoot && createPortal(content, modalRoot)}
      {!modalRoot && content}
      <ManageCategoriesModal
        isOpen={showManageCategories}
        onClose={() => setShowManageCategories(false)}
        onCategoriesChanged={handleCategoriesChanged}
      />
      <UpgradePromptModal
        isOpen={!!limitBlock}
        onClose={() => setLimitBlock(null)}
        blockedAction="add_job"
        tier={limitBlock?.tier ?? 'free'}
        used={limitBlock?.used ?? 0}
        limit={limitBlock?.limit ?? 0}
        otherUsed={limitBlock?.editsUsed ?? 0}
        otherLimit={limitBlock?.editsLimit ?? 0}
        otherLabel="Edits today"
      />
    </>
  );
}
