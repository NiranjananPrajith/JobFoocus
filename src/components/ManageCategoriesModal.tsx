'use client';

import { useEffect, useState, useCallback } from 'react';
import Button from './design/Button';
import CategoryPopup from './CategoryPopup';
import LoadingScreen from './LoadingScreen';
import {
  getUserCategories,
  deleteCategory,
  updateCategory,
  getApplicationsByCategory,
  isSystemCategory,
  type UserCategory,
} from '@/lib/storage-adapter';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged?: () => void;
}

interface CategoryWithCount extends UserCategory {
  jobCount: number;
}

export default function ManageCategoriesModal({
  isOpen,
  onClose,
  onCategoriesChanged,
}: ManageCategoriesModalProps) {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [editingCat, setEditingCat] = useState<UserCategory | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [deletingCat, setDeletingCat] = useState<CategoryWithCount | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const loadCategories = useCallback(async () => {
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
    if (isOpen && mounted) {
      loadCategories();
    }
  }, [isOpen, mounted, loadCategories]);

  const handleEdit = (cat: UserCategory) => {
    setEditingCat(cat);
    setShowEditPopup(true);
  };

  const handleEditSave = async (updatedCat: UserCategory) => {
    if (!editingCat) return;
    const result = await updateCategory(editingCat.name, updatedCat);
    if (result.success) {
      await loadCategories();
      onCategoriesChanged?.();
    }
    setShowEditPopup(false);
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
    await loadCategories();
    onCategoriesChanged?.();
    setDeletingCat(null);
    setDeleteConfirmText('');
  };

  const handleDeleteCancel = () => {
    setDeletingCat(null);
    setDeleteConfirmText('');
  };

  if (!mounted || !isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-scrim backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-canvas rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-hairline-soft">
            <h3 className="text-[18px] font-semibold text-ink">Manage Categories</h3>
            <button
              onClick={onClose}
              className="text-steel hover:text-ink transition-colors p-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <LoadingScreen messages={['Loading categories...', 'Almost there...']} size="sm" className="min-h-[200px]" />
            ) : categories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-steel text-[14px]">No categories yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((cat) => {
                  const isSystem = isSystemCategory(cat.name);
                  return (
                    <div
                      key={cat.name}
                      className="border border-hairline-soft rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] font-medium text-ink truncate">{cat.name}</p>
                              {isSystem && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel shrink-0">
                                  System
                                </span>
                              )}
                            </div>
                            {cat.description && (
                              <p className="text-[12px] text-steel mt-0.5 line-clamp-2">{cat.description}</p>
                            )}
                            <p className="text-[11px] text-steel mt-1">
                              {cat.jobCount} job{cat.jobCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        {!isSystem && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleEdit(cat)}
                              className="px-3 py-1.5 text-[12px] text-steel hover:text-ink hover:bg-surface rounded-md transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(cat)}
                              className="px-3 py-1.5 text-[12px] text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 p-3 bg-surface rounded-lg">
              <p className="text-[12px] text-steel">
                <span className="font-medium text-ink">Note:</span> Deleting a category moves all its jobs to &quot;Uncategorized&quot;.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-hairline-soft">
            <Button variant="secondary" onClick={onClose} className="w-full justify-center">
              Done
            </Button>
          </div>
        </div>
      </div>

      {showEditPopup && editingCat && (
        <CategoryPopup
          isOpen={showEditPopup}
          onClose={() => { setShowEditPopup(false); setEditingCat(null); }}
          onSave={handleEditSave}
          editCategory={editingCat}
        />
      )}

      {deletingCat && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center px-4 bg-scrim backdrop-blur-sm"
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
    </>
  );
}
