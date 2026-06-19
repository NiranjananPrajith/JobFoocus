'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/design/Card';
import Button from '@/components/design/Button';
import Badge from '@/components/design/Badge';
import CategorySelector from '@/components/CategorySelector';
import ManageCategoriesModal from '@/components/ManageCategoriesModal';
import LoadingScreen from '@/components/LoadingScreen';
import {
  getDocumentHTML,
  getAllApplications,
  getMasterResume,
  assignJobToCategory,
  ensureUncategorizedCategory,
  saveApplication,
  saveDocumentHTML,
  updateApplicationDocFlags,
} from '@/lib/storage-adapter';
import { createClient } from '@/lib/supabase/client';
import { StatusType } from '@/lib/design-system';
import {
  generateMaskedDocumentsForExistingJob,
  formatJobDescription,
  conversationalParseJD,
  buildJobDescriptionHTML,
} from '@/lib/ai-generation';
import type { FormattedJD } from '@/lib/ai-generation';
import AddJobStepper from '@/components/AddJobStepper';
import UpgradePromptModal from '@/components/UpgradePromptModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Extract a bare hostname from a URL string for use as the application
// `source` field. Examples:
//   "https://www.linkedin.com/jobs/view/..."  -> "linkedin.com"
//   "https://boards.greenhouse.io/acme/jobs/.." -> "greenhouse.io"
//   "" / "not a url"                            -> ""
// We strip a leading "www." so www.linkedin.com and linkedin.com collapse
// to the same value.
function extractDomain(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Values that should be treated as "the AI couldn't figure this out" and
// therefore trigger the manual-fill form. We compare lowercased + trimmed
// to keep the set small and predictable. The system prompt for
// formatJobDescription explicitly says company may be "Unknown Company" if
// not found, so that string is the canonical signal; everything else is
// defensive.
const UNKNOWN_VALUES = new Set([
  '',
  'unknown',
  'unknown company',
  'n/a',
  'na',
  'null',
  'none',
  'not specified',
  'not found',
  '[unknown]',
  'undefined',
]);
function isUnknownValue(v: string | undefined | null): boolean {
  if (v == null) return true;
  return UNKNOWN_VALUES.has(String(v).trim().toLowerCase());
}
import { maskPII, demaskPII, extractPIIProfile } from '@/lib/pii-utils';

interface Application {
  company: string;
  job_title: string;
  date_applied: string;
  status: string;
  source: string;
  contact_name: string;
  contact_email: string;
  notes: string;
  response_date: string;
  needs_followup: boolean;
  category: string;
  category_name: string;
  category_color: string;
  folder: string;
  has_resume: boolean;
  has_cover_letter: boolean;
  has_job_description: boolean;
  job_url?: string | null;
  files: { name: string; size: number; type: string }[];
}

const STATUS_OPTIONS: StatusType[] = ['prospect', 'applied', 'interview', 'offer', 'rejected'];

function ApplicationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get('app');

  // Extension query parameters
  const extTitle = searchParams.get('title');
  const extCompany = searchParams.get('company');
  const extJd = searchParams.get('jd');
  const extUrl = searchParams.get('url');
  const extLocation = searchParams.get('location');
  const extSalary = searchParams.get('salary');
  const extPosted = searchParams.get('posted');
  const extWorkType = searchParams.get('workType');
  const extHeuristicMiss = searchParams.get('heuristic') === 'miss';

  // "Extension mode" means the page was opened by the browser extension's
  // deep-link payload (title/company/jd/url, no `app` param). When that
  // happens, we run the auth check + auto-process pipeline and only
  // reveal the editable form after resume + cover letter are ready.
  const isExtensionMode =
    !appId &&
    (!!extTitle || !!extCompany || !!extJd || !!extUrl || extHeuristicMiss || !!extLocation || !!extSalary || !!extPosted || !!extWorkType);

  type PipelineStep = 'analyzing' | 'resume' | 'cover_letter' | 'done';
  type PipelineMode = 'auth-checking' | 'processing' | 'manual-fill' | 'jd-retry' | 'clarify-jd' | 'error' | null;

  // Held while the user is filling in the manual-fill form. Captures
  // everything the AI extracted + the original job description + a
  // pre-allocated folder name, so the resume handler can pick up where
  // formatJobDescription left off without re-running it.
  type ManualFillPayload = {
    folder: string;
    jobDescription: string;
    formattedJD: {
      company: string;
      job_title: string;
      location: string;
      employment_type: string;
      summary: string;
      responsibilities: string[];
      requirements: string[];
      preferred: string[];
    };
    missingCompany: boolean;
    missingTitle: boolean;
  };

  const [pipelineMode, setPipelineMode] = useState<PipelineMode>(
    isExtensionMode ? 'auth-checking' : null
  );
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('analyzing');
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  // Set right before router.replace on success. The processing UI
  // exposes a "View job" button that navigates to this URL as a safety
  // net for the (rare) case where the auto-transition doesn't fire.
  const [pipelineDestination, setPipelineDestination] = useState<string | null>(null);
  // Bumped on "Try again" to re-run the auth check + pipeline. Lives in
  // the effect's deps so changing it re-triggers the whole flow.
  const [pipelineRetryToken, setPipelineRetryToken] = useState(0);
  // Manual-fill form state. Populated when the AI returns an empty /
  // "Unknown Company" / missing job_title. The user fills in the
  // missing field(s) and the pipeline resumes from `saveApplication`.
  const [manualFill, setManualFill] = useState<ManualFillPayload | null>(null);
  const [manualCompany, setManualCompany] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualFillError, setManualFillError] = useState<string | null>(null);
  // JD-retry state. Populated when the AI couldn't extract a proper
  // job description from the scraped content (parse failure, empty
  // response, etc.). The user can paste a cleaner JD into the
  // textbox and click "Add Job" to retry the pipeline manually.
  const [jdRetryText, setJdRetryText] = useState('');
  const [jdRetryError, setJdRetryError] = useState<string | null>(null);

  // Clarify-jd state: the AI couldn't parse the JD or fields are missing.
  // We ask the user short natural questions up to 3 rounds.
  const [clarifyQuestion, setClarifyQuestion] = useState<string | null>(null);
  const [clarifyAnswer, setClarifyAnswer] = useState('');
  const [clarifyHistory, setClarifyHistory] = useState<{question: string; answer: string}[]>([]);
  const [clarifyRound, setClarifyRound] = useState(0);
  const [clarifyPartialJD, setClarifyPartialJD] = useState<FormattedJD | null>(null);
  const [clarifyJdText, setClarifyJdText] = useState('');

  // Daily-limit block. Snapshot from the server, shown in the upgrade
  // modal so the user sees the exact numbers they were blocked at.
  const [limitBlock, setLimitBlock] = useState<{
    tier: 'free' | 'pro' | 'max';
    used: number;
    limit: number;
    editsUsed: number;
    editsLimit: number;
  } | null>(null);

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewFromExtension, setIsNewFromExtension] = useState(false);
  const [jobUrl, setJobUrl] = useState<string | null>(null);
  const [heuristicMiss, setHeuristicMiss] = useState(false);
  const [meta, setMeta] = useState<{ location: string; salary: string; posted: string; workType: string }>({
    location: '',
    salary: '',
    posted: '',
    workType: '',
  });

  // Form state
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [dateApplied, setDateApplied] = useState('');
  const [status, setStatus] = useState('');
  const [responseDate, setResponseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [source, setSource] = useState('');
  const [category, setCategory] = useState('Uncategorized');
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [jobDescContent, setJobDescContent] = useState('');
  const [jobDescExpanded, setJobDescExpanded] = useState(true);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Effect 1: Handle Job Description loading
  useEffect(() => {
    async function fetchJobDescription() {
      // If it is a brand new scraped job, the description is already set via state, skip fetching
      if (isNewFromExtension || !application?.has_job_description) return;

      try {
        const html = await getDocumentHTML(application.category, application.folder, 'job_description');
        if (html) {
          let cleanedHtml = html.replace(/<html[^>]*>/gi, '').replace(/<\/html>/gi, '');
          cleanedHtml = cleanedHtml.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
          cleanedHtml = cleanedHtml.replace(/<body[^>]*>/gi, '').replace(/<\/body>/gi, '');
          setJobDescContent(cleanedHtml);
        }
      } catch (err) {
        console.error('Failed to load job description:', err);
      }
    }

    fetchJobDescription();
  }, [application, isNewFromExtension]);

  // Effect 2: Fetch application profile or seed from Extension URL params
  useEffect(() => {
    async function fetchData() {
      // The extension auto-process pipeline (Effect 3) handles the
      // extension-payload case end-to-end. While it's running, this
      // effect must not also seed the form — that would show the
      // "Imported from Extension" UI in parallel with the stepper.
      if (isExtensionMode && pipelineMode !== null) {
        return;
      }

      // 1. Check if this is an incoming payload from the standalone browser extension
      if (!appId && (extTitle || extCompany || extJd || extUrl || extHeuristicMiss || extLocation || extSalary || extPosted || extWorkType)) {
        setIsNewFromExtension(true);
        setCompany(extCompany || '');
        setJobTitle(extTitle || '');
        setJobDescContent(extJd || '');
        setJobUrl(extUrl || null);
        setMeta({
          location: extLocation || '',
          salary: extSalary || '',
          posted: extPosted || '',
          workType: extWorkType || '',
        });
        setHeuristicMiss(extHeuristicMiss && !extJd);
        setStatus('prospect');
        setSource(extractDomain(extUrl || ''));
        setCategory('Uncategorized');

        // Generate a provisional storage path context for the browser cache storage adapter
        const generatedFolder = `job-${Date.now()}`;
        setApplication({
          company: extCompany || 'Unknown Company',
          job_title: extTitle || 'Scraped Position',
          date_applied: '',
          status: 'prospect',
          source: extractDomain(extUrl || ''),
          contact_name: '',
          contact_email: '',
          notes: '',
          response_date: '',
          needs_followup: false,
          category: 'Uncategorized',
          category_name: 'Uncategorized',
          category_color: '#888888',
          folder: generatedFolder,
          has_resume: false,
          has_cover_letter: false,
          has_job_description: !!extJd,
          job_url: extUrl || null,
          files: []
        });

        setLoading(false);
        return;
      }

      // 2. Default behavior: Look up application data via existing saved index matching appId
      if (!appId) {
        setError('No application selected');
        setLoading(false);
        return;
      }

      try {
        const { getAllApplications } = await import('@/lib/storage-adapter');
        const apps = await getAllApplications();
        const found = apps.find((a) => `${a.category}/${a.folder}` === appId);

        if (!found) {
          setError('Application not found');
          setLoading(false);
          return;
        }

        setApplication(found as unknown as Application);
        setCompany(found.company);
        setJobTitle(found.job_title);
        setDateApplied(found.date_applied);
        setStatus(found.status);
        setResponseDate(found.response_date || '');
        setNotes(found.notes || '');
        setContactName(found.contact_name || '');
        setContactEmail(found.contact_email || '');
        setSource(found.source || '');
        setCategory(found.category_name || found.category || 'Uncategorized');
        setJobUrl(found.job_url || null);
        setMeta({ location: '', salary: '', posted: '', workType: '' });
        setHeuristicMiss(false);
        setIsNewFromExtension(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [appId, extTitle, extCompany, extJd, extUrl, extLocation, extSalary, extPosted, extWorkType, extHeuristicMiss]);


  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  // Effect 3: Extension mode — auth check + auto-process pipeline.
  // Runs once when the page is opened by the browser extension with a
  // deep-link payload. Two phases:
  //   1. Auth check. If the user is not signed in, redirect them to
  //      /login?next=<current URL> (or /signup, same query string).
  //      The login page shows a contextual banner; the auth callback
  //      sends them back here once sign-in completes.
  //   2. Pipeline. Save the workspace, save the JD, generate a tailored
  //      resume and cover letter against the user's master resume. Show
  //      a stepper while this runs; do NOT reveal the editable form.
  //      On success, replace the URL with the saved app so the existing
  //      app-loading effect takes over with the resume + cover letter
  //      already attached.

  // The shared pipeline core (ensureUncategorizedCategory →
  // formatJobDescription → required-field gate → saveApplication →
  // saveDocumentHTML → generateMaskedDocumentsForExistingJob). Used
  // by BOTH the auto-pipeline effect and the jd-retry button handler.
  // Returns a discriminated outcome so the caller can dispatch to the
  // right UI state.
  type PipelineOutcome =
    | { kind: 'success'; folder: string }
    | { kind: 'parse-fail'; message: string }
    | { kind: 'clarify'; question: string; partialJD: FormattedJD | null; jdText: string }
    | { kind: 'manual-fill'; folder: string; formattedJD: ManualFillPayload['formattedJD']; missingCompany: boolean; missingTitle: boolean }
    | { kind: 'other-fail'; message: string }
    | { kind: 'limit-blocked'; tier: 'free' | 'pro' | 'max'; jobsUsed: number; jobsLimit: number; editsUsed: number; editsLimit: number };

  async function runExtensionPipelineCore(
    jdText: string,
    cancelled: { current: boolean },
    preFormattedJD?: FormattedJD,
    extCompany?: string | null,
    extTitle?: string | null
  ): Promise<PipelineOutcome> {
    // 3a. Daily-limit pre-check. Same shape as AddJobModal.handleSubmitJD:
    // bail early with a friendly modal before we burn AI tokens on a
    // pipeline that will be rejected. Soft-fails on network errors so
    // the server-side gate remains the source of truth.
    try {
      const checkRes = await fetch('/api/usage/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_job' }),
      });
      if (checkRes.ok) {
        const check = await checkRes.json();
        if (!check.allowed) {
          return {
            kind: 'limit-blocked',
            tier: check.tier,
            jobsUsed: check.jobsUsed,
            jobsLimit: check.jobsLimit,
            editsUsed: check.editsUsed,
            editsLimit: check.editsLimit,
          };
        }
      }
    } catch (err) {
      console.warn('[extension pipeline] usage pre-check failed, continuing:', err);
    }

    // 3b. Ensure Uncategorized exists.
    const uncategorized = await ensureUncategorizedCategory();
    if (cancelled.current) return { kind: 'other-fail', message: 'Cancelled' };
    if (!uncategorized) {
      return {
        kind: 'other-fail',
        message: 'Could not set up the Uncategorized category for your account. Please refresh and try again.',
      };
    }

    // 3b. Format the JD. Parse / format failures here are what
    // send the caller to the clarification loop.
    // If a preFormattedJD was passed in (from the clarify loop), skip AI parsing.
    let formattedJD: FormattedJD | undefined;
    let formatResult: 'ok' | 'parse-fail' | 'missing-fields';

    if (preFormattedJD) {
      formattedJD = preFormattedJD;
      const mc = isUnknownValue(formattedJD.company);
      const mt = isUnknownValue(formattedJD.job_title);
      formatResult = (mc || mt) ? 'missing-fields' : 'ok';
    } else {
      try {
        formattedJD = await formatJobDescription(jdText);
        const mc = isUnknownValue(formattedJD.company);
        const mt = isUnknownValue(formattedJD.job_title);
        formatResult = (mc || mt) ? 'missing-fields' : 'ok';
      } catch {
        formatResult = 'parse-fail';
      }
    }

    if (cancelled.current) return { kind: 'other-fail', message: 'Cancelled' };

    // If the AI couldn't parse at all, but the extension provided
    // company/title, construct a minimal FormattedJD and proceed.
    if ((formatResult === 'parse-fail' || !formattedJD) && extCompany && extTitle) {
      formattedJD = {
        company: extCompany,
        job_title: extTitle,
        location: '',
        employment_type: '',
        summary: '',
        responsibilities: [],
        requirements: [],
        preferred: [],
      };
      formatResult = 'ok';
    }

    if (formatResult === 'parse-fail' || !formattedJD) {
      return {
        kind: 'clarify',
        question: '',
        partialJD: null,
        jdText,
      };
    }

    // Patch missing fields with extension-provided values.
    if (formatResult === 'missing-fields' || formatResult === 'ok') {
      if (isUnknownValue(formattedJD.company) && extCompany) {
        formattedJD.company = extCompany;
      }
      if (isUnknownValue(formattedJD.job_title) && extTitle) {
        formattedJD.job_title = extTitle;
      }
    }

    // Re-check after patching.
    const mc = isUnknownValue(formattedJD.company);
    const mt = isUnknownValue(formattedJD.job_title);
    if (mc || mt) {
      const question = mc && mt
        ? "We couldn't find a company name or job title in the job description. Can you tell us both?"
        : mc
          ? "We couldn't find a company name in the job description. What company is this job for?"
          : "We couldn't find a job title in the job description. Can you enter it below?";
      return {
        kind: 'clarify',
        question,
        partialJD: formattedJD,
        jdText,
      };
    }

    const folder = 'job-' + Date.now();

    // 3d. Save application.
    try {
      await saveApplication('Uncategorized', folder, {
        company: formattedJD.company,
        job_title: formattedJD.job_title,
        date_applied: '',
        status: 'prospect',
        response_date: null,
        notes: '',
        contact_name: null,
        contact_email: null,
        source: extractDomain(extUrl || ''),
        documents: [],
        job_url: extUrl || null,
      });
    } catch (err) {
      return { kind: 'other-fail', message: err instanceof Error ? err.message : 'Could not save the application.' };
    }
    if (cancelled.current) return { kind: 'other-fail', message: 'Cancelled' };

    // 3e. Save JD HTML.
    try {
      const jdHTML = buildJobDescriptionHTML(formattedJD, jdText);
      await saveDocumentHTML('Uncategorized', folder, 'job_description', jdHTML);
    } catch (err) {
      return { kind: 'other-fail', message: err instanceof Error ? err.message : 'Could not save the job description.' };
    }
    if (cancelled.current) return { kind: 'other-fail', message: 'Cancelled' };

    // 3f. Generate resume + cover letter.
    try {
      await generateMaskedDocumentsForExistingJob(
        'Uncategorized',
        folder,
        jdText,
        (step) => {
          if (cancelled.current) return;
          setPipelineStep(step);
        }
      );
    } catch (err) {
      return { kind: 'other-fail', message: err instanceof Error ? err.message : 'Could not generate the resume or cover letter.' };
    }
    if (cancelled.current) return { kind: 'other-fail', message: 'Cancelled' };

    return { kind: 'success', folder };
  }

  useEffect(() => {
    if (!isExtensionMode) return;

    let cancelled = false;

    async function run() {
      // 1. Auth check
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;

        if (!user) {
          // Hand the user off to login, then bounce back here.
          const nextUrl = window.location.pathname + window.location.search;
          router.replace(`/login?next=${encodeURIComponent(nextUrl)}`);
          return;
        }
      } catch (err) {
        if (cancelled) return;
        setPipelineError(
          err instanceof Error ? err.message : 'Could not check your sign-in status.'
        );
        setPipelineMode('error');
        return;
      }

      // 2. Master-resume gate
      try {
        const master = await getMasterResume();
        if (cancelled) return;
        if (!master) {
          setPipelineError(
            'To generate a tailored resume and cover letter, we need your master resume. Add it first — then come back and try the extension again.'
          );
          setPipelineMode('error');
          return;
        }
      } catch (err) {
        if (cancelled) return;
        setPipelineError(err instanceof Error ? err.message : 'Could not load your master resume.');
        setPipelineMode('error');
        return;
      }

      // 3. Pipeline (delegates to the shared core so the jd-retry
      // handler can re-run the same logic with a user-typed JD).
      setPipelineMode('processing');
      setPipelineStep('analyzing');

      const outcome = await runExtensionPipelineCore(extJd || '', { current: cancelled }, undefined, extCompany, extTitle);

      if (cancelled) return;

      switch (outcome.kind) {
        case 'parse-fail':
          // The AI couldn't extract a proper job description from the
          // scraped content. Fall through to the jd-retry state so the
          // user can paste a cleaner JD.
          setJdRetryText(extJd || '');
          setJdRetryError('Could not identify a job posting in this page. Copy the full job description and paste it below.');
          setPipelineMode('jd-retry');
          return;
        case 'clarify':
          setClarifyQuestion(
            outcome.question || "We couldn't understand this job description. What job are you applying for?"
          );
          setClarifyAnswer('');
          setClarifyHistory([]);
          setClarifyRound(0);
          setClarifyPartialJD(outcome.partialJD);
          setClarifyJdText(outcome.jdText);
          setPipelineMode('clarify-jd');
          return;
        case 'other-fail':
          setPipelineError(outcome.message);
          setPipelineMode('error');
          return;
        case 'limit-blocked':
          // Daily cap hit. Surface the upgrade modal with the exact
          // numbers the server reported. We close out the pipeline
          // (no stepper, no error state) — the modal IS the response.
          setLimitBlock({
            tier: outcome.tier,
            used: outcome.jobsUsed,
            limit: outcome.jobsLimit,
            editsUsed: outcome.editsUsed,
            editsLimit: outcome.editsLimit,
          });
          setPipelineMode(null);
          return;
        case 'success': {
          // Brief pause so the user sees the "done" state before the
          // view swaps. Without this, the transition can feel like
          // the stepper flickered and was gone.
          const destination = `/application?app=Uncategorized/${encodeURIComponent(outcome.folder)}`;
          setPipelineDestination(destination);
          await new Promise((r) => setTimeout(r, 700));
          if (cancelled) return;
          setPipelineMode(null);
          router.replace(destination);
          // Bump the daily counter. Fire-and-forget — the navigation
          // already happened. Same shape as AddJobModal.
          void fetch('/api/usage/increment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add_job' }),
          }).catch((err) => console.warn('[extension pipeline] usage increment failed:', err));
          return;
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // Run on mount and on retry. We deliberately don't depend on
    // ext* — re-running on those would re-kick the pipeline for the
    // same payload and create duplicate workspaces.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineRetryToken]);

  // Called from the manual-fill form when the user submits the
  // missing company / job title. Re-uses the stashed formatted JD +
  // folder from `manualFill` (so we don't re-run formatJobDescription)
  // and falls through to the same saveApplication → saveDocumentHTML
  // → generateMaskedDocumentsForExistingJob → router.replace sequence
  // the auto pipeline uses.
  const handleManualFillSubmit = async () => {
    if (!manualFill) return;

    const company = manualCompany.trim();
    const title = manualTitle.trim();
    const stillMissing: string[] = [];
    if (manualFill.missingCompany && !company) stillMissing.push('Company');
    if (manualFill.missingTitle && !title) stillMissing.push('Job title');
    if (stillMissing.length) {
      setManualFillError(
        `Please enter the ${stillMissing.join(' and ')} before continuing.`
      );
      return;
    }

    let cancelled = false;
    setManualFillError(null);
    setPipelineMode('processing');
    // The analyzing step already ran (that's how we got here). Start
    // the stepper at 'resume' so the visible progress matches what's
    // actually about to happen.
    setPipelineStep('resume');

    try {
      // Use whichever value the user provided for the missing field,
      // and fall back to the AI's extraction (or the loose scrape) for
      // the other one.
      const finalCompany = manualFill.missingCompany ? company : (manualFill.formattedJD.company || extCompany || '');
      const finalTitle = manualFill.missingTitle ? title : (manualFill.formattedJD.job_title || extTitle || '');

      const finalFormattedJD = {
        ...manualFill.formattedJD,
        company: finalCompany,
        job_title: finalTitle,
      };

      await saveApplication('Uncategorized', manualFill.folder, {
        company: finalCompany,
        job_title: finalTitle,
        date_applied: '',
        status: 'prospect',
        response_date: null,
        notes: '',
        contact_name: null,
        contact_email: null,
        source: extractDomain(extUrl || ''),
        documents: [],
        job_url: extUrl || null,
      });
      if (cancelled) return;

      const jdHTML = buildJobDescriptionHTML(finalFormattedJD, manualFill.jobDescription);
      await saveDocumentHTML('Uncategorized', manualFill.folder, 'job_description', jdHTML);
      if (cancelled) return;

      // Same intent as the auto pipeline: the stepper reuses the
      // existing analyzing→resume→cover_letter→done UI, but the
      // analyzing step has effectively already happened (we know
      // the JD format, the user just supplied the missing fields).
      // We pass an onStep that ignores the redundant 'analyzing'
      // event so the stepper stays on 'resume' until the AI resumes
      // generation actually starts.
      await generateMaskedDocumentsForExistingJob(
        'Uncategorized',
        manualFill.folder,
        manualFill.jobDescription,
        (step) => {
          if (cancelled) return;
          if (step === 'analyzing') return; // already done
          setPipelineStep(step);
        }
      );
      if (cancelled) return;

      const destination = `/application?app=Uncategorized/${encodeURIComponent(manualFill.folder)}`;
      setPipelineDestination(destination);
      // Same 700ms celebration pause as the auto pipeline.
      await new Promise((r) => setTimeout(r, 700));
      if (cancelled) return;
      setPipelineMode(null);
      setManualFill(null);
      router.replace(destination);
    } catch (err) {
      console.error('Manual-fill resume failed:', err);
      setPipelineError(err instanceof Error ? err.message : 'Failed to save this job.');
      setPipelineMode('error');
    }
  };

  const handleManualFillCancel = () => {
    setManualFill(null);
    setManualCompany('');
    setManualTitle('');
    setManualFillError(null);
    setPipelineMode(null);
    router.replace('/dashboard');
  };

  // Called from the jd-retry view when the user clicks "Add Job"
  // after pasting a cleaner JD. Re-runs the same pipeline core the
  // auto-pipeline uses, but with the textarea content instead of
  // the original extension scrape. All four outcomes dispatch the
  // same way as the auto path: success → saved-app, parse-fail →
  // stay in jd-retry with a new error, manual-fill → switch to the
  // manual-fill form, other-fail → generic error card.
  const handleJdRetry = async () => {
    if (!jdRetryText.trim()) return;
    setJdRetryError(null);
    setPipelineMode('processing');
    setPipelineStep('analyzing');

    const cancelled = { current: false };
    try {
      const outcome = await runExtensionPipelineCore(jdRetryText, cancelled);
      if (cancelled.current) return;

      switch (outcome.kind) {
        case 'clarify':
          setClarifyQuestion(
            outcome.question || "We couldn't understand this job description. What job are you applying for?"
          );
          setClarifyAnswer('');
          setClarifyHistory([]);
          setClarifyRound(0);
          setClarifyPartialJD(outcome.partialJD);
          setClarifyJdText(outcome.jdText);
          setPipelineMode('clarify-jd');
          return;
        case 'other-fail':
          setPipelineError(outcome.message);
          setPipelineMode('error');
          return;
        case 'success': {
          const destination = `/application?app=Uncategorized/${encodeURIComponent(outcome.folder)}`;
          setPipelineDestination(destination);
          await new Promise((r) => setTimeout(r, 700));
          if (cancelled.current) return;
          setPipelineMode(null);
          router.replace(destination);
          return;
        }
      }
    } catch (err) {
      if (cancelled.current) return;
      setPipelineError(err instanceof Error ? err.message : 'Failed to add this job.');
      setPipelineMode('error');
    }
  };

  const handleJdRetryCancel = () => {
    setJdRetryText('');
    setJdRetryError(null);
    setPipelineMode(null);
    router.replace('/dashboard');
  };

  const MAX_CLARIFY_ROUNDS = 3;

  const handleClarifySubmit = async () => {
    if (!clarifyAnswer.trim()) return;
    const newRound = clarifyRound + 1;
    const newHistory: { question: string; answer: string }[] = [
      ...clarifyHistory,
      { question: clarifyQuestion || '', answer: clarifyAnswer },
    ];

    if (newRound >= MAX_CLARIFY_ROUNDS) {
      // Give up — route to jd-retry so the user can paste a cleaner JD.
      setJdRetryText(clarifyJdText);
      setJdRetryError(
        'We had trouble identifying this job. Copy the full job description and paste it below.'
      );
      setPipelineMode('jd-retry');
      return;
    }

    setClarifyRound(newRound);
    setClarifyHistory(newHistory);
    setClarifyAnswer('');
    setPipelineStep('analyzing');

    try {
      const result = await conversationalParseJD(
        clarifyJdText,
        newHistory
      );

      if (result.kind === 'success') {
        // Fully parsed — run the rest of the pipeline with preFormattedJD.
        setPipelineStep('resume');
        const cancelled = { current: false };
        const outcome = await runExtensionPipelineCore(clarifyJdText, cancelled, result.formattedJD);
        if (cancelled.current) return;

        switch (outcome.kind) {
          case 'clarify':
            // Still ambiguous after re-parsing — show the next question.
            setClarifyQuestion(outcome.question || "We couldn't understand this job description. What job are you applying for?");
            setClarifyPartialJD(outcome.partialJD);
            setPipelineMode('clarify-jd');
            return;
          case 'other-fail':
            setPipelineError(outcome.message);
            setPipelineMode('error');
            return;
          case 'limit-blocked':
            setLimitBlock({
              tier: outcome.tier,
              used: outcome.jobsUsed,
              limit: outcome.jobsLimit,
              editsUsed: outcome.editsUsed,
              editsLimit: outcome.editsLimit,
            });
            return;
          case 'success': {
            const destination = `/application?app=Uncategorized/${encodeURIComponent(outcome.folder)}`;
            setPipelineDestination(destination);
            await new Promise((r) => setTimeout(r, 700));
            if (cancelled.current) return;
            setPipelineMode(null);
            router.replace(destination);
            return;
          }
        }
      } else if (result.kind === 'question') {
        // Still ambiguous — show the next question from the AI.
        setClarifyQuestion(result.question);
        setPipelineMode('clarify-jd');
      } else {
        // 'failed' — route to jd-retry.
        setJdRetryText(clarifyJdText);
        setJdRetryError(
          result.message || 'We had trouble processing your answer. Copy the full job description and paste it below.'
        );
        setPipelineMode('jd-retry');
      }
    } catch {
      // Fallback on error: route to jd-retry.
      setJdRetryText(clarifyJdText);
      setJdRetryError(
        'We had trouble processing your answer. Copy the full job description and paste it below.'
      );
      setPipelineMode('jd-retry');
    }
  };

  const handleClarifySkip = () => {
    // Skip the clarify flow and go straight to jd-retry.
    setJdRetryText(clarifyJdText);
    setJdRetryError(null);
    setPipelineMode('jd-retry');
  };

  const handleClarifyCancel = () => {
    setClarifyQuestion(null);
    setClarifyAnswer('');
    setClarifyHistory([]);
    setClarifyRound(0);
    setClarifyPartialJD(null);
    setClarifyJdText('');
    setPipelineMode(null);
    router.replace('/dashboard');
  };

  const handleSave = async () => {
    if (!application) return;

    try {
      const { saveApplication } = await import('@/lib/storage-adapter');

      // Save metadata properties
      await saveApplication(application.category as any, application.folder, {
        company,
        job_title: jobTitle,
        date_applied: dateApplied,
        status: status as any,
        response_date: responseDate || null,
        notes,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        source,
        documents: [],
        job_url: jobUrl,
      });

      // Update the category if changed
      await assignJobToCategory(application.category, application.folder, category);

      // If it is a new application from the extension, save the text as the job description asset
      if (isNewFromExtension && jobDescContent) {
        // Checking if saveDocumentHTML or similar exists inside your storage adapter
        try {
          const { saveDocumentHTML } = await import('@/lib/storage-adapter');
          if (typeof saveDocumentHTML === 'function') {
            await saveDocumentHTML(application.category, application.folder, 'job_description', `<div>${jobDescContent}</div>`);
          }
        } catch (e) {
          console.warn('Could not explicitly write job description asset file:', e);
        }
        setIsNewFromExtension(false); // Transition out of extension layout initialization state
      }

      setNotification({ message: 'Application saved successfully!', type: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleMarkApplied = async () => {
    if (!application) return;

    const today = new Date().toISOString().split('T')[0];
    setDateApplied(today);
    setStatus('applied');

    try {
      const { saveApplication } = await import('@/lib/storage-adapter');
      await saveApplication(application.category as any, application.folder, {
        company,
        job_title: jobTitle,
        date_applied: today,
        status: 'applied',
        response_date: responseDate || null,
        notes,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        source,
        documents: [],
        job_url: jobUrl,
      });

      setNotification({ message: 'Marked as applied!', type: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  // ----- Extension mode rendering (auth-checking / processing / error) -----
  // These early-returns intentionally run BEFORE the regular form loads.
  // The user must not see the editable "job details" view until the
  // resume and cover letter are both generated.
  if (pipelineMode === 'auth-checking') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-[14px] text-steel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
          </svg>
          Checking your account…
        </div>
      </div>
    );
  }

  if (pipelineMode === 'manual-fill' && manualFill) {
    const { missingCompany, missingTitle, formattedJD, jobDescription } = manualFill;
    const missingList: string[] = [];
    if (missingCompany) missingList.push('company name');
    if (missingTitle) missingList.push('job title');
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card variant="cream" className="max-w-[640px] w-full p-8">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-primary">
            One more step
          </div>
          <h2 className="text-[22px] md:text-[24px] font-semibold text-ink mb-2">
            We couldn&apos;t find the {missingList.join(' and ')}
          </h2>
          <p className="text-[14px] text-steel leading-relaxed mb-6">
            The job description is a bit sparse, so our AI couldn&apos;t pick up the missing
            detail{missingList.length > 1 ? 's' : ''}. Fill in the highlighted field{missingList.length > 1 ? 's' : ''} below and
            we&apos;ll save the application and generate your resume and cover letter.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-[12px] uppercase tracking-wide text-steel mb-2">
                Company
                {missingCompany && <span className="ml-1 text-red-600 normal-case">*</span>}
              </label>
              <input
                type="text"
                value={manualCompany}
                onChange={(e) => setManualCompany(e.target.value)}
                placeholder="e.g. Concentrix"
                disabled={!missingCompany}
                className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11 disabled:bg-canvas disabled:text-steel disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[12px] uppercase tracking-wide text-steel mb-2">
                Job title
                {missingTitle && <span className="ml-1 text-red-600 normal-case">*</span>}
              </label>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="e.g. Customer Service / Technical Support Rep"
                disabled={!missingTitle}
                className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11 disabled:bg-canvas disabled:text-steel disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {jobDescription && (
            <details className="mt-6">
              <summary className="text-[13px] text-steel cursor-pointer hover:text-ink">
                Show job description for context
              </summary>
              <pre className="mt-3 text-[12px] text-steel whitespace-pre-wrap max-h-[240px] overflow-y-auto rounded-lg border border-hairline-soft bg-canvas/50 p-3 font-sans">
                {jobDescription}
              </pre>
            </details>
          )}

          {manualFillError && (
            <p className="mt-4 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {manualFillError}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onClick={handleManualFillSubmit}
            >
              Save and generate resume &amp; cover letter
            </Button>
            <button
              type="button"
              onClick={handleManualFillCancel}
              className="text-[14px] text-steel hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (pipelineMode === 'jd-retry') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card variant="cream" className="max-w-[640px] w-full p-8">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-primary">
            One more step
          </div>
          <h2 className="text-[22px] md:text-[24px] font-semibold text-ink mb-2">
            We couldn&apos;t find a proper job description
          </h2>
          <p className="text-[14px] text-steel leading-relaxed mb-4">
            The page content didn&apos;t look like a job posting to our AI. Copy the full job
            description — including the job title, company name, responsibilities, and
            requirements — from the original posting, paste it below, and click{' '}
            <strong className="text-ink">Add Job</strong> to try again.
          </p>

          {jdRetryError && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-900 leading-relaxed">
              {jdRetryError}
            </div>
          )}

          <div className="mb-2">
            <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">
              Job description
            </label>
            <textarea
              value={jdRetryText}
              onChange={(e) => {
                setJdRetryText(e.target.value);
                if (jdRetryError) setJdRetryError(null);
              }}
              rows={12}
              placeholder="Paste the full job posting here — include the job title, company name, responsibilities, and requirements..."
              className="w-full px-4 py-3 rounded-xl border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none placeholder:text-muted"
              autoFocus
            />
          </div>

          <p className="text-[12px] text-steel mb-4">{jdRetryText.length} characters</p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onClick={handleJdRetry}
              disabled={!jdRetryText.trim()}
            >
              Add Job
            </Button>
            <button
              type="button"
              onClick={handleJdRetryCancel}
              className="text-[14px] text-steel hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (pipelineMode === 'clarify-jd' && clarifyQuestion !== null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card variant="cream" className="max-w-[560px] w-full p-8">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-primary">
            Tell us about this job
          </div>
          <h2 className="text-[22px] md:text-[24px] font-semibold text-ink mb-2">
            {clarifyQuestion}
          </h2>

          {clarifyHistory.length > 0 && (
            <div className="mb-4 space-y-2">
              {clarifyHistory.map((h, i) => (
                <div key={i} className="rounded-lg border border-hairline-strong bg-surface p-3">
                  <p className="text-[12px] text-steel font-medium mb-1">You said:</p>
                  <p className="text-[14px] text-ink">{h.answer}</p>
                </div>
              ))}
            </div>
          )}

          <details className="mb-4">
            <summary className="text-[12px] text-steel cursor-pointer hover:text-ink transition-colors select-none">
              View original job description
            </summary>
            <div className="mt-2 max-h-[200px] overflow-y-auto rounded-lg border border-hairline-strong bg-surface p-3 text-[13px] text-ink leading-relaxed whitespace-pre-wrap">
              {clarifyJdText}
            </div>
          </details>

          <div className="mb-2">
            <textarea
              value={clarifyAnswer}
              onChange={(e) => setClarifyAnswer(e.target.value)}
              rows={3}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 rounded-xl border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none placeholder:text-muted"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleClarifySubmit();
                }
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onClick={handleClarifySubmit}
              disabled={!clarifyAnswer.trim()}
            >
              Next
            </Button>
            <button
              type="button"
              onClick={handleClarifySkip}
              className="text-[14px] text-steel hover:text-ink transition-colors"
            >
              Paste the full description instead
            </button>
            <button
              type="button"
              onClick={handleClarifyCancel}
              className="text-[14px] text-steel hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (pipelineMode === 'processing') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card variant="cream" className="max-w-[560px] w-full p-8">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-primary">
            Adding to your dashboard
          </div>
          <h2 className="text-[22px] md:text-[24px] font-semibold text-ink mb-2">
            {extCompany || extTitle || 'This job'}
          </h2>
          {extTitle && extCompany && extTitle !== extCompany && (
            <p className="text-[14px] text-steel mb-6">{extTitle}</p>
          )}
          <p className="text-[14px] text-steel mb-6 leading-relaxed">
            We&apos;re setting up your workspace, generating a tailored resume, and writing a cover letter. This usually takes 20–60 seconds.
          </p>
          <AddJobStepper
            currentStep={pipelineStep}
            onViewJob={
              pipelineDestination
                ? () => {
                    setPipelineMode(null);
                    router.replace(pipelineDestination);
                  }
                : undefined
            }
          />
        </Card>
      </div>
    );
  }

  if (pipelineMode === 'error' && pipelineError) {
    const needsMasterResume = pipelineError.toLowerCase().includes('master resume');
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card variant="default" className="max-w-[560px] w-full p-8">
          <div className="flex items-start gap-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
              <line x1="12" y1="16" x2="12" y2="11" />
            </svg>
            <div className="flex-1">
              <h2 className="text-[18px] font-semibold text-ink mb-2">
                {needsMasterResume ? 'Master resume required' : 'Couldn’t add this job'}
              </h2>
              <p className="text-[14px] text-steel leading-relaxed mb-6">{pipelineError}</p>
              <div className="flex flex-wrap items-center gap-3">
                {needsMasterResume ? (
                  <a href="/master-resume">
                    <Button variant="primary">Add master resume</Button>
                  </a>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setPipelineError(null);
                      setPipelineMode('auth-checking');
                      // Re-run by remounting the effect via a state bump.
                      setPipelineRetryToken((n) => n + 1);
                    }}
                  >
                    Try again
                  </Button>
                )}
                <a
                  href="/dashboard"
                  className="text-[14px] text-steel hover:text-ink transition-colors"
                >
                  Back to dashboard
                </a>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <LoadingScreen messages={['Fetching your application...', 'Loading documents...', 'Preparing the timeline...', 'Almost there...']} />
    );
  }

  if (error && !application) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
        <Card variant="default" className="text-center py-12">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-steel mb-6">{error}</p>
          <a href="/dashboard">
            <Button variant="primary">Back to Dashboard</Button>
          </a>
        </Card>
      </div>
    );
  }

  if (!application) return null;

  const daysSinceApplied = dateApplied
    ? Math.floor((Date.now() - new Date(dateApplied).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen">
      {/* Back Link */}
      <a
        href="/dashboard"
        className="inline-flex items-center text-steel hover:text-primary mb-4 md:mb-6 transition-colors"
      >
        <span className="mr-2">←</span> Back to Dashboard
      </a>

      {/* Header Card */}
      <Card variant="cream" className="mb-4 md:mb-6">
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-[28px] md:text-[36px] font-medium text-ink mb-1">{company}</h1>
              <p className="text-[14px] md:text-[18px] text-steel mb-3">{jobTitle}</p>
              {jobUrl && (
                <a
                  href={jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline mb-3"
                >
                  View original posting
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}
              {/* Metadata chips (extension-sourced only). Shown when at least one
                  field is non-empty. Helps users spot Quick-Apply targets fast. */}
              {(meta.location || meta.salary || meta.posted || meta.workType) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {meta.location && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-surface-elevated text-steel border border-hairline">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {meta.location}
                    </span>
                  )}
                  {meta.salary && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-surface-elevated text-steel border border-hairline">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      {meta.salary}
                    </span>
                  )}
                  {meta.workType && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-surface-elevated text-steel border border-hairline">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      {meta.workType}
                    </span>
                  )}
                  {meta.posted && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-surface-elevated text-steel border border-hairline">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {meta.posted}
                    </span>
                  )}
                </div>
              )}
            </div>
            {isNewFromExtension && (
              <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded border border-amber-200 animate-pulse">
                Imported from Extension (Unsaved)
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-steel">
            {status && <Badge status={status as StatusType} />}
            {application.needs_followup && (
              <span className="bg-primary text-white px-2.5 py-1 rounded-full text-[12px] font-semibold">
                Needs Follow-up
              </span>
            )}
            {dateApplied && (
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Applied {new Date(dateApplied).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {daysSinceApplied > 0 ? ` (${daysSinceApplied}d ago)` : ''}
              </span>
            )}
            {source && (
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                {source}
              </span>
            )}
            {contactName && (
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {contactName}
              </span>
            )}
            {responseDate && (
              <span className="text-[12px] text-steel">
                Response: {new Date(responseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          {(application.has_job_description || isNewFromExtension) && (
            <div className="mt-4 pt-4 border-t border-hairline">
              <button
                onClick={() => setJobDescExpanded(!jobDescExpanded)}
                className="w-full flex items-center justify-between text-left hover:bg-surface-elevated rounded-lg px-3 py-2 -mx-3 transition-colors"
              >
                <span className="text-[12px] uppercase tracking-wide text-steel font-semibold">Job Description</span>
                <span className="flex items-center gap-2">
                  <span className="text-[12px] text-primary font-medium">
                    {jobDescExpanded ? 'Hide' : 'Show'}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-steel transition-transform duration-200 ${jobDescExpanded ? 'rotate-180' : ''}`}
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </span>
              </button>
              {jobDescExpanded && (
                <div className="mt-2">
                  <div
                    className="job-desc-content text-[13px] text-ink rounded-lg border border-hairline bg-canvas/50 p-4 max-h-[300px] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: jobDescContent }}
                  />
                  <style>{`
                    .job-desc-content h1, .job-desc-content h2, .job-desc-content h3 {
                      font-size: 14px;
                      font-weight: 600;
                      margin-bottom: 8px;
                      color: var(--ink);
                    }
                    .job-desc-content p {
                      margin-bottom: 8px;
                      line-height: 1.5;
                      color: var(--ink);
                    }
                    .job-desc-content ul, .job-desc-content ol {
                      margin-bottom: 8px;
                      padding-left: 20px;
                    }
                    .job-desc-content li {
                      margin-bottom: 4px;
                      color: var(--ink);
                    }
                    .job-desc-content strong {
                      font-weight: 600;
                    }
                  `}</style>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Heuristic miss warning (extension was triggered on a page the scraper couldn't identify) */}
      {isNewFromExtension && heuristicMiss && (
        <Card variant="default" className="mb-4 md:mb-6 border-amber-400 bg-amber-50">
          <div className="flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="text-[14px] font-semibold text-amber-900 mb-1">Heuristic check failed</p>
              <p className="text-[13px] text-amber-800 leading-relaxed">
                This page didn&apos;t look like a job posting (no &quot;job&quot; or &quot;career&quot; in the URL or title), so no job description was extracted. Paste the JD into the description field below before saving.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Uncategorized prompt — shown when the saved app is sitting in the
          Uncategorized bucket. The extension pipeline intentionally lands
          here so the user can pick a category (or leave it) on first view.
          The CategorySelector inside the form below is the action target. */}
      {application && (application.category_name || application.category || '').toLowerCase() === 'uncategorized' && (
        <Card variant="default" className="mb-4 md:mb-6 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-primary">
              <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <div>
              <p className="text-[14px] font-semibold text-ink mb-1">Pick a category for this job</p>
              <p className="text-[13px] text-steel leading-relaxed">
                It&apos;s currently in <strong>Uncategorized</strong>. Use the Category field in the form below to move it into one of your categories, or leave it here for now. Your resume and cover letter are already generated.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Card variant="default" className="mb-4 md:mb-6 border-red-500">
          <p className="text-red-500">{error}</p>
        </Card>
      )}

      {/* Two Column Layout: Form (left) + Files (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2">
          <Card variant="default">
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">Date Applied</label>
                  <input
                    type="date"
                    value={dateApplied}
                    onChange={(e) => setDateApplied(e.target.value)}
                    className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="capitalize">{opt.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">Response Date</label>
                  <input
                    type="date"
                    value={responseDate}
                    onChange={(e) => setResponseDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">Source</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g., LinkedIn, Indeed"
                    className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">Category</label>
                  <CategorySelector
                    value={category}
                    onChange={setCategory}
                    includeUncategorized={true}
                    onManageClick={() => setShowManageCategories(true)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">Contact Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Add any notes about this application..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4 border-t border-hairline-soft">
                <Button
                  variant="primary"
                  onClick={handleSave}
                >
                  {isNewFromExtension ? 'Save Application Workspace' : 'Save Changes'}
                </Button>
                {status === 'prospect' && !isNewFromExtension && (
                  <Button
                    variant="dark"
                    onClick={handleMarkApplied}
                  >
                    Mark Applied
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Files / Generation */}
        <div className="lg:col-span-1 space-y-4">
          {/* Resume Card */}
          {application.has_resume ? (
            <Card variant="default">
              <h3 className="text-[18px] font-medium text-ink mb-4">Resume</h3>
              <a
                href={`/document?app=${application.category}/${application.folder}&doc=resume`}
                className="flex items-center justify-between p-4 rounded-lg border border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink">View & Print to PDF</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </Card>
          ) : isGeneratingResume ? (
            <Card variant="default">
              <h3 className="text-[18px] font-medium text-ink mb-4">Resume</h3>
              <div className="flex items-center gap-3 p-4 text-steel">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                <span className="text-[14px]">Generating Resume...</span>
              </div>
            </Card>
          ) : (
            <Card variant="default">
              <h3 className="text-[18px] font-medium text-ink mb-4">Resume</h3>
              <button
                onClick={async () => {
                  if (!application) return;
                  setIsGeneratingResume(true);
                  try {
                    const jdHtml = await getDocumentHTML(application.category, application.folder, 'job_description');
                    const jdText = jdHtml ? jdHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
                    if (!jdText) throw new Error('No job description found');
                    await generateMaskedDocumentsForExistingJob(application.category, application.folder, jdText);
                    const { getAllApplications: ga } = await import('@/lib/storage-adapter');
                    const apps = await ga();
                    const updated = apps.find((a) => `${a.category}/${a.folder}` === `${application.category}/${application.folder}`);
                    if (updated) setApplication((prev) => prev ? { ...prev, has_resume: true } : prev);
                  } catch (err) {
                    console.error('Failed to generate resume:', err);
                    alert('Failed to generate resume. Please try again.');
                  } finally {
                    setIsGeneratingResume(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-primary text-primary text-[14px] font-medium hover:bg-primary/5 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Generate Resume with AI
              </button>
            </Card>
          )}

          {/* Cover Letter Card */}
          {application.has_cover_letter ? (
            <Card variant="default">
              <h3 className="text-[18px] font-medium text-ink mb-4">Cover Letter</h3>
              <a
                href={`/document?app=${application.category}/${application.folder}&doc=cover_letter`}
                className="flex items-center justify-between p-4 rounded-lg border border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink">View & Print to PDF</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </Card>
          ) : isGeneratingCoverLetter ? (
            <Card variant="default">
              <h3 className="text-[18px] font-medium text-ink mb-4">Cover Letter</h3>
              <div className="flex items-center gap-3 p-4 text-steel">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                <span className="text-[14px]">Generating Cover Letter...</span>
              </div>
            </Card>
          ) : (
            <Card variant="default">
              <h3 className="text-[18px] font-medium text-ink mb-4">Cover Letter</h3>
              <button
                onClick={async () => {
                  if (!application) return;
                  setIsGeneratingCoverLetter(true);
                  try {
                    const jdHtml = await getDocumentHTML(application.category, application.folder, 'job_description');
                    const jdText = jdHtml ? jdHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
                    if (!jdText) throw new Error('No job description found');
                    await generateMaskedDocumentsForExistingJob(application.category, application.folder, jdText);
                    const { getAllApplications: ga } = await import('@/lib/storage-adapter');
                    const apps = await ga();
                    const updated = apps.find((a) => `${a.category}/${a.folder}` === `${application.category}/${application.folder}`);
                    if (updated) setApplication((prev) => prev ? { ...prev, has_cover_letter: true } : prev);
                  } catch (err) {
                    console.error('Failed to generate cover letter:', err);
                    alert('Failed to generate cover letter. Please try again.');
                  } finally {
                    setIsGeneratingCoverLetter(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-primary text-primary text-[14px] font-medium hover:bg-primary/5 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Generate Cover Letter with AI
              </button>
            </Card>
          )}
        </div>
      </div>

      {notification && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
            )}
            <p className={`text-[14px] font-medium ${
              notification.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {notification.message}
            </p>
            <button
              onClick={() => setNotification(null)}
              className={`ml-2 p-1 rounded hover:bg-black/5 ${
                notification.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <ManageCategoriesModal
        isOpen={showManageCategories}
        onClose={() => setShowManageCategories(false)}
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

      {notification && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
            )}
            <p className={`text-[14px] font-medium ${
              notification.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {notification.message}
            </p>
            <button
              onClick={() => setNotification(null)}
              className={`ml-2 p-1 rounded hover:bg-black/5 ${
                notification.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <LoadingScreen messages={['Fetching your application...', 'Loading documents...', 'Preparing the timeline...', 'Almost there...']} />
  );
}

export default function ApplicationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ApplicationContent />
    </Suspense>
  );
}