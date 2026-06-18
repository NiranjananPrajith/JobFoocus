'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Button from '@/components/design/Button';
import CategoryPopup from '@/components/CategoryPopup';
import {
  getUserCategories,
  saveCategory,
  updateCategory,
  deleteCategory,
  getApplicationsByCategory,
  isSystemCategory,
  type UserCategory,
} from '@/lib/storage-adapter';

interface CategoryWithCount extends UserCategory {
  jobCount: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [editingCat, setEditingCat] = useState<UserCategory | null>(null);
  const [deletingCat, setDeletingCat] = useState<CategoryWithCount | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const cats = await getUserCategories();
    const catsWithCount: CategoryWithCount[] = [];
    for (const cat of cats) {
      const apps = await getApplicationsByCategory(cat.name);
      catsWithCount.push({ ...cat, jobCount: apps.length });
    }
    setCategories(catsWithCount);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreateNew = () => {
    setEditingCat(null);
    setShowPopup(true);
  };

  const handleEdit = (cat: UserCategory) => {
    setEditingCat(cat);
    setShowPopup(true);
  };

  const handleSave = async (cat: UserCategory) => {
    if (editingCat) {
      await updateCategory(editingCat.name, cat);
    } else {
      const result = await saveCategory(cat);
      if (!result.success) {
        alert(result.error || 'Failed to create category');
        return;
      }
    }
    await refresh();
    setShowPopup(false);
    setEditingCat(null);
  };

  const handleDeleteClick = (cat: CategoryWithCount) => {
    setDeletingCat(cat);
    setDeleteConfirmText('');
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCat) return;
    if (deleteConfirmText.toLowerCase() !== 'delete') return;

    await deleteCategory(deletingCat.name);
    await refresh();
    setDeletingCat(null);
    setDeleteConfirmText('');
  };

  const handleDeleteCancel = () => {
    setDeletingCat(null);
    setDeleteConfirmText('');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-canvas border-b border-hairline px-6 py-5">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-ink">Categories</h1>
              <p className="text-sm text-steel mt-0.5">
                Manage your job categories. Deleting moves jobs to Uncategorized.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={handleCreateNew}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Category
              </Button>
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
        ) : categories.length === 0 ? (
          <div className="text-center py-20">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <h2 className="text-lg font-semibold text-ink mb-1">No categories yet</h2>
            <p className="text-sm text-steel mb-6">Create your first category to organize your job applications.</p>
            <Button variant="primary" onClick={handleCreateNew}>
              Create First Category
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((cat) => {
              const isSystem = isSystemCategory(cat.name);
              return (
                <div key={cat.name} className="bg-surface rounded-xl border border-hairline overflow-hidden">
                  <div className="flex items-center">
                    <div className="w-1.5 h-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <div className="flex-1 min-w-0 px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-ink truncate">{cat.name}</h3>
                            {isSystem && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel shrink-0">
                                System
                              </span>
                            )}
                          </div>
                          {cat.description && (
                            <p className="text-[13px] text-steel mt-0.5 line-clamp-2">{cat.description}</p>
                          )}
                          <p className="text-[12px] text-steel mt-2">
                            {cat.jobCount} job{cat.jobCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {!isSystem && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleEdit(cat)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hairline text-steel hover:text-ink hover:border-hairline-strong transition-all text-[13px] font-medium"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(cat)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all text-[13px] font-medium"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CategoryPopup
        isOpen={showPopup}
        onClose={() => { setShowPopup(false); setEditingCat(null); }}
        onSave={handleSave}
        editCategory={editingCat}
      />

      {deletingCat && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-scrim backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleDeleteCancel(); }}
        >
          <div className="bg-canvas rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-[18px] font-semibold text-ink mb-2">Delete &quot;{deletingCat.name}&quot;?</h3>
            <p className="text-[14px] text-steel mb-4">
              {deletingCat.jobCount > 0 ? (
                <>
                  This category has <strong>{deletingCat.jobCount} job{deletingCat.jobCount !== 1 ? 's' : ''}</strong>. All jobs will be moved to &quot;Uncategorized&quot;.
                </>
              ) : (
                'This category has no jobs and can be safely deleted.'
              )}
            </p>
            <div className="mb-4">
              <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">
                Type &quot;delete&quot; to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="delete"
                className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={handleDeleteCancel}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmText.toLowerCase() !== 'delete'}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
