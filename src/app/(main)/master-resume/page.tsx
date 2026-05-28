'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { getMasterResume, setMasterResume } from '@/lib/storage-adapter';
import { parseResumeFile, getAcceptedFileTypes, getAcceptedMimeTypes, type ParsedResume } from '@/lib/resume-parser';
import Card from '@/components/design/Card';
import Button from '@/components/design/Button';

// ---------------------------------------------------------------------------
// Data Structures
// ---------------------------------------------------------------------------

interface SocialLink {
  name: string;
  url: string;
}

interface WorkExperience {
  employer: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  duties: string;
}

interface EducationEntry {
  institution: string;
  course: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Certification {
  name: string;
  issuingAuthority: string;
  validFrom: string;
  validTill: string;
  description: string;
}

type ProficiencyLevel =
  | 'basic'
  | 'conversational'
  | 'working'
  | 'professional'
  | 'full_professional'
  | 'native';

interface LanguageProficiency {
  language: string;
  proficiency: ProficiencyLevel;
}

interface MasterResume {
  name: string;
  phone: string;
  email: string;
  socials: SocialLink[];
  portfolio: SocialLink[];
  summary: string;
  workExperience: WorkExperience[];
  education: EducationEntry[];
  certifications: Certification[];
  languages: LanguageProficiency[];
}

const PROFICIENCY_OPTIONS: { value: ProficiencyLevel; label: string }[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'working', label: 'Working' },
  { value: 'professional', label: 'Professional' },
  { value: 'full_professional', label: 'Full Professional' },
  { value: 'native', label: 'Native' },
];

const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  basic: 'Basic',
  conversational: 'Conversational',
  working: 'Working',
  professional: 'Professional',
  full_professional: 'Full Professional',
  native: 'Native',
};

const emptyResume = (): MasterResume => ({
  name: '',
  phone: '',
  email: '',
  socials: [],
  portfolio: [],
  summary: '',
  workExperience: [],
  education: [],
  certifications: [],
  languages: [],
});

function emptySocial(): SocialLink { return { name: '', url: '' }; }
function emptyWork(): WorkExperience { return { employer: '', jobTitle: '', startDate: '', endDate: '', duties: '' }; }
function emptyEducation(): EducationEntry { return { institution: '', course: '', startDate: '', endDate: '', description: '' }; }
function emptyCertification(): Certification { return { name: '', issuingAuthority: '', validFrom: '', validTill: '', description: '' }; }
function emptyLanguage(): LanguageProficiency { return { language: '', proficiency: 'basic' }; }

// ---------------------------------------------------------------------------
// Input styles
// ---------------------------------------------------------------------------

const inputClass =
  'w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11';

const inputClassPrivate =
  'w-full px-4 py-3 rounded-md border border-blue-200 bg-white text-ink text-[14px] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 h-11';

// ---------------------------------------------------------------------------
// Private Section Header
// ---------------------------------------------------------------------------

function PrivateSectionHeader({ title, count, max }: { title: string; count: number; max: number }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-100">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
        <span className="text-[11px] font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
          Device Only
        </span>
      </div>
      <span className="text-[12px] text-steel">{count} / {max}</span>
    </div>
  );
}

const labelClass = 'block text-[11px] uppercase tracking-wide text-steel mb-2';

const textareaClass =
  'w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none';

// ---------------------------------------------------------------------------
// Reusable Link Item Row
// ---------------------------------------------------------------------------

function LinkItemRow({
  item,
  onChange,
  onRemove,
  nameLabel = 'Name',
  urlLabel = 'URL',
  privateField = false,
}: {
  item: SocialLink;
  onChange: (field: keyof SocialLink, value: string) => void;
  onRemove: () => void;
  nameLabel?: string;
  urlLabel?: string;
  privateField?: boolean;
}) {
  const fieldClass = privateField ? inputClassPrivate : inputClass;
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>{nameLabel}</label>
          <input
            type="text"
            value={item.name}
            onChange={(e) => onChange('name', e.target.value)}
            className={fieldClass}
            placeholder="e.g., LinkedIn"
          />
        </div>
        <div>
          <label className={labelClass}>{urlLabel}</label>
          <input
            type="url"
            value={item.url}
            onChange={(e) => onChange('url', e.target.value)}
            className={fieldClass}
            placeholder="https://"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-2.5 w-11 h-11 rounded-md border border-red-300 text-red-400 hover:bg-red-50 flex items-center justify-center shrink-0"
        aria-label="Remove"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Char Counter
// ---------------------------------------------------------------------------

function CharCounter({ current, max }: { current: number; max: number }) {
  return (
    <div className={`text-[11px] text-right mt-1 ${current > max ? 'text-red-500' : 'text-steel'}`}>
      {current} / {max}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Content
// ---------------------------------------------------------------------------

function MasterResumeContent() {
  const [resume, setResume] = useState<MasterResume>(emptyResume);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMasterResume().then((data) => {
      if (data) {
        setResume({ ...emptyResume(), ...data });
      }
      setLoading(false);
    });
  }, []);

  const set = <K extends keyof MasterResume>(key: K, value: MasterResume[K]) => {
    setResume((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const parsed = await parseResumeFile(file) as ParsedResume;

      setResume(prev => ({
        ...prev,
        name: parsed.name || prev.name,
        phone: parsed.phone || prev.phone,
        email: parsed.email || prev.email,
        summary: parsed.summary || prev.summary,
        workExperience: parsed.workExperience?.length > 0 ? parsed.workExperience : prev.workExperience,
        education: parsed.education?.length > 0 ? parsed.education : prev.education,
      }));
      alert('Resume imported successfully! Review the prefilled fields and click Save to apply.');
    } catch (err) {
      console.error('[Import] Failed to parse resume file:', err);
      setImportError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Socials
  const updateSocial = (idx: number, field: keyof SocialLink, value: string) => {
    const updated = [...resume.socials];
    updated[idx] = { ...updated[idx], [field]: value };
    set('socials', updated);
  };
  const addSocial = () => { if (resume.socials.length < 10) set('socials', [...resume.socials, emptySocial()]); };
  const removeSocial = (idx: number) => set('socials', resume.socials.filter((_, i) => i !== idx));

  // Portfolio
  const updatePortfolio = (idx: number, field: keyof SocialLink, value: string) => {
    const updated = [...resume.portfolio];
    updated[idx] = { ...updated[idx], [field]: value };
    set('portfolio', updated);
  };
  const addPortfolio = () => { if (resume.portfolio.length < 10) set('portfolio', [...resume.portfolio, emptySocial()]); };
  const removePortfolio = (idx: number) => set('portfolio', resume.portfolio.filter((_, i) => i !== idx));

  // Work Experience
  const updateWork = (idx: number, field: keyof WorkExperience, value: string) => {
    const updated = [...resume.workExperience];
    updated[idx] = { ...updated[idx], [field]: value };
    set('workExperience', updated);
  };
  const addWork = () => { if (resume.workExperience.length < 25) set('workExperience', [...resume.workExperience, emptyWork()]); };
  const removeWork = (idx: number) => set('workExperience', resume.workExperience.filter((_, i) => i !== idx));

  // Education
  const updateEducation = (idx: number, field: keyof EducationEntry, value: string) => {
    const updated = [...resume.education];
    updated[idx] = { ...updated[idx], [field]: value };
    set('education', updated);
  };
  const addEducation = () => { if (resume.education.length < 25) set('education', [...resume.education, emptyEducation()]); };
  const removeEducation = (idx: number) => set('education', resume.education.filter((_, i) => i !== idx));

  // Certifications
  const updateCert = (idx: number, field: keyof Certification, value: string) => {
    const updated = [...resume.certifications];
    updated[idx] = { ...updated[idx], [field]: value };
    set('certifications', updated);
  };
  const addCert = () => { if (resume.certifications.length < 50) set('certifications', [...resume.certifications, emptyCertification()]); };
  const removeCert = (idx: number) => set('certifications', resume.certifications.filter((_, i) => i !== idx));

  // Languages
  const updateLang = (idx: number, field: keyof LanguageProficiency, value: string) => {
    const updated = [...resume.languages];
    updated[idx] = { ...updated[idx], [field]: value as LanguageProficiency[keyof LanguageProficiency] };
    set('languages', updated);
  };
  const addLang = () => { if (resume.languages.length < 10) set('languages', [...resume.languages, emptyLanguage()]); };
  const removeLang = (idx: number) => set('languages', resume.languages.filter((_, i) => i !== idx));

  const handleSave = async () => {
    await setMasterResume(resume);
    setSaved(true);
    alert('Master resume saved successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-xl text-steel">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Back Link */}
      <a
        href="/dashboard"
        className="inline-flex items-center text-steel hover:text-primary mb-4 md:mb-6 transition-colors"
      >
        <span className="mr-2">←</span> Back to Dashboard
      </a>

      {/* Header */}
      <Card variant="cream" className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] md:text-[36px] font-medium text-ink">Master Resume</h1>
            <p className="text-[14px] text-steel mt-1">
              Your single source of truth for all job applications
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={getAcceptedFileTypes()}
              onChange={handleImportFile}
              className="hidden"
              id="resume-file-input"
            />
            <label
              htmlFor="resume-file-input"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-hairline-strong bg-white text-[14px] font-medium text-ink hover:bg-surface transition-colors cursor-pointer disabled:opacity-60"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              {isImporting ? 'Importing...' : 'Import from PDF / DOCX'}
            </label>
            {saved && (
              <span className="text-[13px] text-green-600 font-medium flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Saved
              </span>
            )}
          </div>
        </div>
        {importError && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
            <strong>Import failed:</strong> {importError}
          </div>
        )}
      </Card>

      {/* Privacy Notice */}
      <div
        className="mb-6 px-4 py-3 rounded-lg border border-blue-200 bg-blue-50 flex items-start gap-3"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <p className="text-[13px] text-blue-800 leading-relaxed">
          <strong>Your privacy is guaranteed.</strong> Your name, phone number, email address, social links, and portfolio links are stored only in your browser&apos;s local cache and <strong>never leave your device</strong>. When you generate AI-tailored resumes or cover letters, only the work experience, education, certifications, languages, and professional summary are used — all personal identifiers are completely masked.
        </p>
      </div>

      {/* Section 1: Contact Info — Private */}
      <div className="mb-3 p-5 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/60">
        <PrivateSectionHeader title="Contact Information" count={1} max={1} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Full Name</label>
            <input type="text" value={resume.name} onChange={(e) => set('name', e.target.value)} className={inputClassPrivate} placeholder="Jane Doe" />
          </div>
          <div>
            <label className={labelClass}>Phone Number</label>
            <input type="tel" value={resume.phone} onChange={(e) => set('phone', e.target.value)} className={inputClassPrivate} placeholder="(555) 123-4567" />
          </div>
          <div>
            <label className={labelClass}>Email Address</label>
            <input type="email" value={resume.email} onChange={(e) => set('email', e.target.value)} className={inputClassPrivate} placeholder="jane@example.com" />
          </div>
        </div>
      </div>

      {/* Section 2: Socials — Private */}
      <div className="mb-3 p-5 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/60">
        <PrivateSectionHeader title="Socials" count={resume.socials.length} max={10} />
        <div className="space-y-4">
          {resume.socials.map((item, idx) => (
            <LinkItemRow
              key={idx}
              item={item}
              onChange={(field, val) => updateSocial(idx, field, val)}
              onRemove={() => removeSocial(idx)}
              nameLabel="Platform"
              urlLabel="Profile URL"
              privateField
            />
          ))}
        </div>
        {resume.socials.length < 10 && (
          <Button variant="outline" onClick={addSocial} className="mt-4 w-full sm:w-auto border-blue-200 text-blue-700 hover:bg-blue-100">
            + Add Social Link
          </Button>
        )}
      </div>

      {/* Section 3: Portfolio — Private */}
      <div className="mb-6 p-5 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/60">
        <PrivateSectionHeader title="Portfolio Links" count={resume.portfolio.length} max={10} />
        <div className="space-y-4">
          {resume.portfolio.map((item, idx) => (
            <LinkItemRow
              key={idx}
              item={item}
              onChange={(field, val) => updatePortfolio(idx, field, val)}
              onRemove={() => removePortfolio(idx)}
              nameLabel="Site / Platform"
              urlLabel="URL"
              privateField
            />
          ))}
        </div>
        {resume.portfolio.length < 10 && (
          <Button variant="outline" onClick={addPortfolio} className="mt-4 w-full sm:w-auto border-blue-200 text-blue-700 hover:bg-blue-100">
            + Add Portfolio Link
          </Button>
        )}
      </div>

      {/* Section 4: Professional Summary */}
      <Card variant="default" className="mb-4">
        <h2 className="text-[18px] font-semibold text-ink mb-6">Professional Summary</h2>
        <div>
          <textarea
            value={resume.summary}
            onChange={(e) => set('summary', e.target.value.slice(0, 5000))}
            rows={6}
            className={textareaClass}
            placeholder="Write a 2-3 sentence summary of your professional background and key strengths..."
          />
          <CharCounter current={resume.summary.length} max={5000} />
        </div>
      </Card>

      {/* Section 5: Work Experience */}
      <Card variant="default" className="mb-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-semibold text-ink">Work Experience</h2>
          <span className="text-[12px] text-steel">{resume.workExperience.length} / 25</span>
        </div>
        <div className="space-y-6">
          {resume.workExperience.map((item, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-hairline-soft bg-canvas/50">
              <div className="flex items-start justify-between mb-4">
                <span className="text-[12px] font-semibold text-steel">Entry {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeWork(idx)}
                  className="w-8 h-8 rounded-md border border-red-300 text-red-400 hover:bg-red-50 flex items-center justify-center"
                  aria-label="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Employer Name</label>
                  <input type="text" value={item.employer} onChange={(e) => updateWork(idx, 'employer', e.target.value)} className={inputClass} placeholder="Company Inc." />
                </div>
                <div>
                  <label className={labelClass}>Job Title</label>
                  <input type="text" value={item.jobTitle} onChange={(e) => updateWork(idx, 'jobTitle', e.target.value)} className={inputClass} placeholder="Customer Service Rep" />
                </div>
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input type="month" value={item.startDate} onChange={(e) => updateWork(idx, 'startDate', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>End Date</label>
                  <input type="month" value={item.endDate} onChange={(e) => updateWork(idx, 'endDate', e.target.value)} className={inputClass} placeholder="Present" />
                </div>
              </div>
              <div className="mt-4">
                <label className={labelClass}>Duties & Responsibilities</label>
                <textarea
                  value={item.duties}
                  onChange={(e) => updateWork(idx, 'duties', e.target.value.slice(0, 3000))}
                  rows={4}
                  className={textareaClass}
                  placeholder="Describe your key responsibilities and achievements..."
                />
                <CharCounter current={item.duties.length} max={3000} />
              </div>
            </div>
          ))}
        </div>
        {resume.workExperience.length < 25 && (
          <Button variant="outline" onClick={addWork} className="mt-6 w-full sm:w-auto">
            + Add Work Experience
          </Button>
        )}
      </Card>

      {/* Section 6: Education */}
      <Card variant="default" className="mb-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-semibold text-ink">Education</h2>
          <span className="text-[12px] text-steel">{resume.education.length} / 25</span>
        </div>
        <div className="space-y-6">
          {resume.education.map((item, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-hairline-soft bg-canvas/50">
              <div className="flex items-start justify-between mb-4">
                <span className="text-[12px] font-semibold text-steel">Entry {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeEducation(idx)}
                  className="w-8 h-8 rounded-md border border-red-300 text-red-400 hover:bg-red-50 flex items-center justify-center"
                  aria-label="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Institution Name</label>
                  <input type="text" value={item.institution} onChange={(e) => updateEducation(idx, 'institution', e.target.value)} className={inputClass} placeholder="College / University" />
                </div>
                <div>
                  <label className={labelClass}>Course / Program</label>
                  <input type="text" value={item.course} onChange={(e) => updateEducation(idx, 'course', e.target.value)} className={inputClass} placeholder="Diploma in Business" />
                </div>
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input type="month" value={item.startDate} onChange={(e) => updateEducation(idx, 'startDate', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>End Date</label>
                  <input type="month" value={item.endDate} onChange={(e) => updateEducation(idx, 'endDate', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="mt-4">
                <label className={labelClass}>Description</label>
                <textarea
                  value={item.description}
                  onChange={(e) => updateEducation(idx, 'description', e.target.value.slice(0, 3000))}
                  rows={4}
                  className={textareaClass}
                  placeholder="What you learned, notable projects, achievements..."
                />
                <CharCounter current={item.description.length} max={3000} />
              </div>
            </div>
          ))}
        </div>
        {resume.education.length < 25 && (
          <Button variant="outline" onClick={addEducation} className="mt-6 w-full sm:w-auto">
            + Add Education
          </Button>
        )}
      </Card>

      {/* Section 7: Certifications */}
      <Card variant="default" className="mb-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-semibold text-ink">Certifications</h2>
          <span className="text-[12px] text-steel">{resume.certifications.length} / 50</span>
        </div>
        <div className="space-y-4">
          {resume.certifications.map((item, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-hairline-soft bg-canvas/50">
              <div className="flex items-start justify-between mb-4">
                <span className="text-[12px] font-semibold text-steel">Entry {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeCert(idx)}
                  className="w-8 h-8 rounded-md border border-red-300 text-red-400 hover:bg-red-50 flex items-center justify-center"
                  aria-label="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Certificate Name</label>
                  <input type="text" value={item.name} onChange={(e) => updateCert(idx, 'name', e.target.value)} className={inputClass} placeholder="Forklift Operator" />
                </div>
                <div>
                  <label className={labelClass}>Issuing Authority (optional)</label>
                  <input type="text" value={item.issuingAuthority} onChange={(e) => updateCert(idx, 'issuingAuthority', e.target.value)} className={inputClass} placeholder="CSA Group" />
                </div>
                <div>
                  <label className={labelClass}>Valid From (optional)</label>
                  <input type="month" value={item.validFrom} onChange={(e) => updateCert(idx, 'validFrom', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Valid Till (optional)</label>
                  <input type="month" value={item.validTill} onChange={(e) => updateCert(idx, 'validTill', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="mt-4">
                <label className={labelClass}>Description (optional)</label>
                <textarea
                  value={item.description}
                  onChange={(e) => updateCert(idx, 'description', e.target.value.slice(0, 1000))}
                  rows={3}
                  className={textareaClass}
                  placeholder="Additional details..."
                />
                <CharCounter current={item.description.length} max={1000} />
              </div>
            </div>
          ))}
        </div>
        {resume.certifications.length < 50 && (
          <Button variant="outline" onClick={addCert} className="mt-6 w-full sm:w-auto">
            + Add Certification
          </Button>
        )}
      </Card>

      {/* Section 8: Language Proficiency */}
      <Card variant="default" className="mb-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-semibold text-ink">Language Proficiency</h2>
          <span className="text-[12px] text-steel">{resume.languages.length} / 10</span>
        </div>
        <div className="space-y-4">
          {resume.languages.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Language</label>
                  <input
                    type="text"
                    value={item.language}
                    onChange={(e) => updateLang(idx, 'language', e.target.value)}
                    className={inputClass}
                    placeholder="English"
                  />
                </div>
                <div>
                  <label className={labelClass}>Proficiency</label>
                  <select
                    value={item.proficiency}
                    onChange={(e) => updateLang(idx, 'proficiency', e.target.value)}
                    className={inputClass}
                  >
                    {PROFICIENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeLang(idx)}
                className="mt-2.5 w-11 h-11 rounded-md border border-red-300 text-red-400 hover:bg-red-50 flex items-center justify-center shrink-0"
                aria-label="Remove"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          ))}
        </div>
        {resume.languages.length < 10 && (
          <Button variant="outline" onClick={addLang} className="mt-4 w-full sm:w-auto">
            + Add Language
          </Button>
        )}
      </Card>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-hairline-soft px-4 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="text-[13px] text-steel">
            Changes are saved to your browser&apos;s local storage.
          </p>
          <Button variant="primary" onClick={handleSave} className="shrink-0">
            Save Master Resume
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-xl text-steel">Loading...</div>
    </div>
  );
}

export default function MasterResumePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MasterResumeContent />
    </Suspense>
  );
}
