'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Card from '@/components/design/Card';
import Button from '@/components/design/Button';
import CategorySelector from '@/components/CategorySelector';
import ManageCategoriesModal from '@/components/ManageCategoriesModal';
import { isMasterResumeBlank, generateMaskedJobEntryAndDocuments } from '@/lib/ai-generation';
import { getUserCategories, saveCategory, type UserCategory } from '@/lib/storage-adapter';

type ModalState = 'two_column' | 'paste_jd' | 'blank_resume' | 'processing' | 'category_prompt' | 'done';
type ProcessingStep = 'analyzing' | 'resume' | 'cover_letter' | 'saving' | 'done';

const CHROME_STORE_URL = 'https://chrome.google.com/webstore';
const FIREFOX_ADDONS_URL = 'https://addons.mozilla.org';

function detectBrowser(): 'chrome' | 'firefox' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Chrome')) return 'chrome';
  return 'other';
}

function SpinnerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobAdded?: () => void;
}

export default function AddJobModal({ isOpen, onClose, onJobAdded }: AddJobModalProps) {
  const [state, setState] = useState<ModalState>('two_column');
  const [jdText, setJdText] = useState('');
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('analyzing');
  const [selectedCategory, setSelectedCategory] = useState('Uncategorized');
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showNewCatPopup, setShowNewCatPopup] = useState(false);

  // For tracking AI-assigned category after processing
  const [assignedCategory, setAssignedCategory] = useState('Uncategorized');
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);

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
      setSelectedCategory('Uncategorized');
    }
  }, [isOpen]);

  // Auto-close after done (only if skipping category prompt)
  useEffect(() => {
    if (state === 'done' && !pendingCategory) {
      const t = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [state, onClose, pendingCategory]);

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

  const browser = detectBrowser();

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
    setState('processing');
    setProcessingStep('analyzing');
    setPendingCategory(null);

    try {
      const result = await generateMaskedJobEntryAndDocuments(jdText, selectedCategory, (step) => {
        setProcessingStep(step);
      });

      // AI has auto-assigned a category - this comes back in result.category_name
      const aiAssigned = result.category_name || 'Uncategorized';
      setAssignedCategory(aiAssigned);

      // If AI assigned "Uncategorized", prompt user to set/confirm category
      // Otherwise, just go to done
      if (aiAssigned === 'Uncategorized') {
        setState('category_prompt');
      } else {
        // Auto-accepted the AI assignment, go to done
        setState('done');
        console.log('[AddJobModal] Job created successfully, AI assigned:', aiAssigned);
        onJobAdded?.();
      }
    } catch (err) {
      console.error('[AddJobModal] Failed to process job:', err);
      setState('done'); // Still go to done to let user retry
    }
  };

  const handleCategoryPromptSkip = () => {
    setPendingCategory(null);
    setState('done');
    console.log('[AddJobModal] Job created with Uncategorized');
    onJobAdded?.();
  };

  const handleCategoryPromptSave = async (category: string) => {
    setPendingCategory(category);
    setState('done');
    console.log('[AddJobModal] Job created with user category:', category);
    onJobAdded?.();
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

  const extensionUrl = browser === 'firefox' ? FIREFOX_ADDONS_URL : CHROME_STORE_URL;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 px-4"
      style={{ backgroundColor: 'rgba(30, 25, 20, 0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && state !== 'processing' && state !== 'done' && state !== 'category_prompt') onClose(); }}
    >
      <div
        className="bg-canvas rounded-2xl shadow-2xl w-full max-w-2xl relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {state !== 'processing' && state !== 'done' && state !== 'category_prompt' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center text-steel hover:bg-stone-100 hover:text-ink transition-colors"
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
                <a
                  href={extensionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button variant="primary" className="w-full justify-center">
                    Add Extension
                  </Button>
                </a>
                <p className="text-[11px] text-stone-400">Opens Chrome Web Store or Firefox Add-ons</p>
              </Card>

              {/* Right: Manual */}
              <Card variant="outlined" className="p-6 flex flex-col items-center text-center gap-4 border-dashed">
                <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center">
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

            <div className="mb-2">
              <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">
                Job Description
              </label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the full job posting here — include the job title, company name, responsibilities, and requirements..."
                rows={12}
                className="w-full px-4 py-3 rounded-xl border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none placeholder:text-stone-400"
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

        {/* ─── State: Processing ─── */}
        {state === 'processing' && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6 text-primary">
              <SpinnerIcon />
            </div>
            <h2 className="text-[22px] font-semibold text-ink mb-2">
              {processingStep === 'analyzing' && 'Analyzing Job Description'}
              {processingStep === 'resume' && 'Generating Resume'}
              {processingStep === 'cover_letter' && 'Writing Cover Letter'}
              {processingStep === 'saving' && 'Saving Your Job Entry'}
            </h2>
            <p className="text-[14px] text-steel mb-4">
              {processingStep === 'analyzing' && 'Parsing the job posting to extract company, title, and requirements...'}
              {processingStep === 'resume' && 'Tailoring your resume to match the job requirements...'}
              {processingStep === 'cover_letter' && 'Writing a personalized cover letter...'}
              {processingStep === 'saving' && 'Almost done...'}
            </p>
            <div className="flex items-center justify-center gap-2 text-[12px] text-muted">
              <span className="flex items-center gap-1">
                <span className={processingStep === 'analyzing' ? 'text-primary' : 'text-chart-gray-300'}>●</span>
                Analyzing
              </span>
              <span className="text-muted">→</span>
              <span className="flex items-center gap-1">
                <span className={processingStep === 'resume' ? 'text-primary' : 'text-chart-gray-300'}>●</span>
                Resume
              </span>
              <span className="text-muted">→</span>
              <span className="flex items-center gap-1">
                <span className={processingStep === 'cover_letter' ? 'text-primary' : 'text-chart-gray-300'}>●</span>
                Cover Letter
              </span>
            </div>
          </div>
        )}

        {/* ─── State: Category Prompt ─── */}
        {state === 'category_prompt' && (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
              </div>
              <h2 className="text-[20px] font-semibold text-ink">Set a Category for This Job</h2>
            </div>

            <p className="text-[14px] text-steel mb-6">
              This job was auto-assigned to &quot;Uncategorized&quot;. Select an existing category or create a new one.
            </p>

            <div className="mb-6">
              <CategorySelector
                value={selectedCategory}
                onChange={setSelectedCategory}
                onManageClick={() => setShowManageCategories(true)}
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={handleCategoryPromptSkip}>
                Skip for Now
              </Button>
              <Button
                variant="primary"
                onClick={() => handleCategoryPromptSave(selectedCategory)}
              >
                Save & Finish
              </Button>
            </div>
          </div>
        )}

        {/* ─── State: Done ─── */}
        {state === 'done' && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <CheckIcon />
            </div>
            <h2 className="text-[22px] font-semibold text-ink mb-3">Job Added Successfully!</h2>
            <p className="text-[14px] text-steel">
              Your resume and cover letter are being generated. Check the Jobs page to view and print them.
            </p>
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
    </>
  );
}
