'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getTrashedApplications, permanentlyDeleteApplication, restoreApplication, type EnrichedApplication } from '@/lib/storage-adapter';

function formatDeletedDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntilDeletion(dateStr: string) {
  const deleted = new Date(dateStr).getTime();
  const expires = deleted + 30 * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000));
  return remaining;
}

export default function TrashPage() {
  const [trashed, setTrashed] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const apps = await getTrashedApplications();
      setTrashed(apps);
    } catch (error) {
      console.error('Error loading trash:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleRestore = async (category: string, folder: string) => {
    try {
      await restoreApplication(category as any, folder);
      await refresh();
    } catch (error) {
      console.error('Error restoring application:', error);
    }
  };

  const handlePermanentDelete = async (category: string, folder: string) => {
    if (!confirm('Permanently delete this application and all its documents? This cannot be undone.')) return;
    try {
      await permanentlyDeleteApplication(category as any, folder);
      await refresh();
    } catch (error) {
      console.error('Error permanently deleting application:', error);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-canvas border-b border-hairline px-6 py-5">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-ink">Trash</h1>
              <p className="text-sm text-steel mt-0.5">Deleted applications are kept for 30 days before automatic removal.</p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-hairline text-steel hover:text-ink hover:border-hairline-strong transition-all text-sm font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
              <line x1="12" y1="2" x2="12" y2="6"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
              <line x1="2" y1="12" x2="6" y2="12"/>
              <line x1="18" y1="12" x2="22" y2="12"/>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
            </svg>
            <span className="ml-3 text-steel">Loading...</span>
          </div>
        ) : trashed.length === 0 ? (
          <div className="text-center py-20">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            <h2 className="text-lg font-semibold text-ink mb-1">Trash is empty</h2>
            <p className="text-sm text-steel">Deleted jobs will appear here for 30 days.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trashed.map(app => {
              const remaining = app.deleted_at ? daysUntilDeletion(app.deleted_at) : 30;
              return (
                <div key={`${app.category}/${app.folder}`} className="bg-surface rounded-xl border border-hairline overflow-hidden">
                  <div className="flex items-center">
                    <div className="w-1 shrink-0" style={{ backgroundColor: app.category_color || '#888888' }} />
                    <div className="flex-1 min-w-0 px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-semibold text-ink truncate">{app.company}</h3>
                          <p className="text-[13px] text-steel truncate mt-0.5">{app.job_title}</p>
                          <p className="text-[12px] text-red-400 mt-1">
                            Deleted {app.deleted_at ? formatDeletedDate(app.deleted_at) : 'unknown'} · {remaining} day{remaining !== 1 ? 's' : ''} until permanent removal
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRestore(app.category, app.folder)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hairline text-steel hover:text-ink hover:border-hairline-strong transition-all text-[13px] font-medium"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1 4 1 10 7 10"/>
                              <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                            </svg>
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(app.category, app.folder)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all text-[13px] font-medium"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            Delete Forever
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
