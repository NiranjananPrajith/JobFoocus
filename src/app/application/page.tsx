'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/design/Card';
import Button from '@/components/design/Button';
import Badge from '@/components/design/Badge';
import { getDocumentHTML } from '@/lib/storage-adapter';
import { StatusType } from '@/lib/design-system';

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
  files: { name: string; size: number; type: string }[];
}

const STATUS_OPTIONS: StatusType[] = ['prospect', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'];

function ApplicationContent() {
  const searchParams = useSearchParams();
  const appId = searchParams.get('app');

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [jobDescContent, setJobDescContent] = useState('');
  const [jobDescExpanded, setJobDescExpanded] = useState(true);

  useEffect(() => {
    async function fetchJobDescription() {
      if (!application?.has_job_description) return;

      try {
        const html = await getDocumentHTML(application.category, application.folder, 'job_description');
        if (html) {
          // Strip html, head, body wrapper tags but keep inner content
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
  }, [application]);

  useEffect(() => {
    async function fetchData() {
      if (!appId) {
        setError('No application selected');
        setLoading(false);
        return;
      }

      try {
        const { getAllApplications, saveApplication } = await import('@/lib/storage-adapter');
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [appId]);

  const handleSave = async () => {
    if (!application) return;

    try {
      const { saveApplication } = await import('@/lib/storage-adapter');
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
        job_url: null,
      });

      alert('Application saved successfully!');
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
        job_url: null,
      });

      alert('Marked as applied!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-xl text-steel">Loading...</div>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
        <Card variant="default" className="text-center py-12">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-steel mb-6">{error}</p>
          <a href="./index.html">
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
        href="./index.html"
        className="inline-flex items-center text-steel hover:text-primary mb-4 md:mb-6 transition-colors"
      >
        <span className="mr-2">←</span> Back to Dashboard
      </a>

      {/* Header Card */}
      <Card variant="cream" className="mb-4 md:mb-6">
        <div>
          <h1 className="text-[28px] md:text-[36px] font-medium text-ink mb-1">{company}</h1>
          <p className="text-[14px] md:text-[18px] text-steel mb-3">{jobTitle}</p>
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
          {application.has_job_description && (
            <div className="mt-4 pt-4 border-t border-stone-200">
              <button
                onClick={() => setJobDescExpanded(!jobDescExpanded)}
                className="w-full flex items-center justify-between text-left hover:bg-stone-100 rounded-lg px-3 py-2 -mx-3 transition-colors"
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
                    className="job-desc-content text-[13px] text-steel rounded-lg border border-stone-200 bg-canvas/50 p-4 max-h-[300px] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: jobDescContent }}
                  />
                  <style>{`
                    .job-desc-content h1, .job-desc-content h2, .job-desc-content h3 {
                      font-size: 14px;
                      font-weight: 600;
                      margin-bottom: 8px;
                      color: #1a1a1a;
                    }
                    .job-desc-content p {
                      margin-bottom: 8px;
                      line-height: 1.5;
                      color: #444;
                    }
                    .job-desc-content ul, .job-desc-content ol {
                      margin-bottom: 8px;
                      padding-left: 20px;
                    }
                    .job-desc-content li {
                      margin-bottom: 4px;
                      color: #444;
                    }
                    .job-desc-content strong {
                      font-weight: 600;
                    }
                  `}</style>
                  <div className="mt-3 flex justify-end">
                    <a
                      href={`/document?app=${application.category}/${application.folder}&doc=job_description`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                    >
                      Full view & print
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

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
                  Save Changes
                </Button>
                {status === 'prospect' && (
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

        {/* Right Column - Files */}
        <div className="lg:col-span-1 space-y-4">
          {application.has_resume && (
            <Card variant="default">
              <h3 className="text-[18px] font-medium text-ink mb-4">Resume</h3>
              <a
                href={`/document?app=${application.category}/${application.folder}&doc=resume`}
                className="flex items-center justify-between p-4 rounded-lg border border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink">View & Print to PDF</p>
                  <p className="text-[12px] text-steel">Opens in new tab</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </Card>
          )}

          {application.has_cover_letter && (
            <Card variant="default">
              <h3 className="text-[18px] font-medium text-ink mb-4">Cover Letter</h3>
              <a
                href={`/document?app=${application.category}/${application.folder}&doc=cover_letter`}
                className="flex items-center justify-between p-4 rounded-lg border border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink">View & Print to PDF</p>
                  <p className="text-[12px] text-steel">Opens in new tab</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </Card>
          )}

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

export default function ApplicationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ApplicationContent />
    </Suspense>
  );
}