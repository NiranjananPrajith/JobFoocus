'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Badge from '@/components/design/Badge';
import Button from '@/components/design/Button';
import CategorySelector from '@/components/CategorySelector';
import { statusLabels, type StatusType } from '@/lib/design-system';
import type { EnrichedApplication, UserCategory, StatusKey } from '@/lib/storage-adapter';
import { formatApplicationDate } from './helpers';

const ALL_STATUSES: StatusType[] = ['prospect', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'];

interface ApplicationDrawerProps {
  application: EnrichedApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<EnrichedApplication>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  userCategories: UserCategory[];
}

export default function ApplicationDrawer({ application, isOpen, onClose, onSave, onDelete, userCategories }: ApplicationDrawerProps) {
  const [notes, setNotes] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [saving, setSaving] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when application changes
  useEffect(() => {
    if (application) {
      setNotes(application.notes || '');
      setContactName(application.contact_name || '');
      setContactEmail(application.contact_email || '');
      setShowDeleteConfirm(false);
      setDeleteInput('');
    }
  }, [application?.category, application?.folder]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const debouncedSave = useCallback(
    (field: string, value: string) => {
      if (!application) return;
      if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
      notesTimeoutRef.current = setTimeout(() => {
        const id = `${application.category}/${application.folder}`;
        onSave(id, { [field]: value });
      }, 500);
    },
    [application, onSave]
  );

  const handleStatusChange = (status: StatusType) => {
    if (!application) return;
    const id = `${application.category}/${application.folder}`;
    onSave(id, { status: status as StatusKey });
  };

  const handleCategoryChange = (catName: string) => {
    if (!application) return;
    const id = `${application.category}/${application.folder}`;
    onSave(id, { category_name: catName } as any);
  };

  const handleDelete = async () => {
    if (!application || deleteInput.toLowerCase() !== 'delete') return;
    setSaving(true);
    try {
      const id = `${application.category}/${application.folder}`;
      await onDelete(id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !application) return null;

  const { absolute, relative } = formatApplicationDate(application);
  const id = `${application.category}/${application.folder}`;

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 z-50 h-full w-full max-w-[480px] bg-card border-l border-hairline shadow-2xl overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${application.company}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-hairline-soft px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold text-ink truncate">
              {application.company}
            </h2>
            <p className="text-[14px] text-steel truncate mt-0.5">
              {application.job_title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-steel hover:text-ink hover:bg-surface transition-colors"
            aria-label="Close drawer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {/* Status segment */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-steel block mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-all border"
                  style={{
                    backgroundColor: application.status === s ? statusLabels[s] ? undefined : 'var(--surface)' : 'transparent',
                    borderColor: application.status === s ? 'var(--primary)' : 'var(--hairline)',
                    color: application.status === s ? 'var(--primary)' : 'var(--steel)',
                    ...(application.status === s ? { backgroundColor: 'var(--primary)', color: 'var(--on-primary)', borderColor: 'var(--primary)' } : {}),
                  }}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-steel block mb-2">
              Category
            </label>
            <CategorySelector
              value={application.category}
              onChange={handleCategoryChange}
              includeUncategorized
              popoverDirection="down"
            />
          </div>

          {/* Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-steel block mb-1">
                Date applied
              </label>
              <p className="text-[13px] text-ink">
                {absolute || 'Not set'}
              </p>
              {relative && (
                <p className="text-[12px] text-muted mt-0.5">{relative}</p>
              )}
            </div>
            {application.response_date && (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-steel block mb-1">
                  Response date
                </label>
                <p className="text-[13px] text-ink">
                  {new Date(application.response_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>

          {/* Follow-up */}
          {application.needs_followup && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-primary/5 border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="text-[12px] font-medium text-primary">
                Follow-up needed — this job has been waiting for {application.days_since_applied || '?'} days
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-steel block mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                debouncedSave('notes', e.target.value);
              }}
              onBlur={() => debouncedSave('notes', notes)}
              placeholder="Add notes about this application..."
              rows={4}
              className="w-full text-[13px] text-ink bg-surface border border-hairline-soft rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted"
            />
          </div>

          {/* Contact */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-steel block mb-2">
              Contact
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                onBlur={() => debouncedSave('contact_name', contactName)}
                placeholder="Contact name"
                className="w-full text-[13px] text-ink bg-surface border border-hairline-soft rounded-lg px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted"
              />
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                onBlur={() => debouncedSave('contact_email', contactEmail)}
                placeholder="Contact email"
                className="w-full text-[13px] text-ink bg-surface border border-hairline-soft rounded-lg px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted"
              />
            </div>
          </div>

          {/* Documents */}
          {application.documents && application.documents.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-steel block mb-2">
                Documents
              </label>
              <div className="space-y-2">
                {application.documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={`/document?app=${encodeURIComponent(id)}&doc=${encodeURIComponent(doc.filename)}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-hairline-soft hover:border-hairline hover:bg-surface transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted shrink-0">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink truncate">
                        {doc.original_filename || doc.filename}
                      </p>
                      <p className="text-[11px] text-muted">
                        {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted shrink-0">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Source */}
          {application.source && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-steel block mb-1">
                Source
              </label>
              <p className="text-[13px] text-steel">{application.source}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-hairline-soft px-6 py-4 flex items-center justify-between">
          <a
            href={`/application?app=${encodeURIComponent(id)}`}
            className="text-[13px] font-medium text-primary hover:underline"
          >
            Open full page →
          </a>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-[12px] text-muted hover:text-red-500 transition-colors"
            >
              Move to trash
            </button>
          </div>
        </div>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <>
            <div className="fixed inset-0 z-[60] bg-ink/50" onClick={() => setShowDeleteConfirm(false)} />
            <div className="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[380px] bg-card rounded-xl border border-hairline shadow-xl p-6">
              <h3 className="text-[16px] font-semibold text-ink mb-2">
                Move to trash?
              </h3>
              <p className="text-[13px] text-steel mb-4">
                This will remove <span className="font-medium text-ink">{application.company}</span> from your dashboard. You can restore it from Trash within 30 days.
              </p>
              <p className="text-[12px] text-steel mb-3">
                Type <span className="font-mono font-semibold text-ink">delete</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="Type 'delete'"
                className="w-full text-[13px] text-ink bg-surface border border-hairline-soft rounded-lg px-3 py-2 mb-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deleteInput.toLowerCase() === 'delete') {
                    handleDelete();
                  }
                }}
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="text-[13px]">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteInput.toLowerCase() !== 'delete' || saving}
                  className="text-[13px]"
                >
                  {saving ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
