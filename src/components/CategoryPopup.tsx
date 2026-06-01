'use client';

import { useEffect, useState } from 'react';
import Button from './design/Button';
import type { UserCategory } from '@/lib/storage-adapter';

interface CategoryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: UserCategory) => void;
  editCategory?: UserCategory | null;
}

export default function CategoryPopup({ isOpen, onClose, onSave, editCategory }: CategoryPopupProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) {
      if (editCategory) {
        setName(editCategory.name);
        setDescription(editCategory.description || '');
      } else {
        setName('');
        setDescription('');
      }
    }
  }, [isOpen, editCategory]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      color: editCategory?.color || '#4a90e2',
      createdAt: editCategory?.createdAt || new Date().toISOString(),
    });
    onClose();
  };

  const isValid = name.trim().length > 0;
  const isEdit = !!editCategory;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(30, 25, 20, 0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[18px] font-semibold text-ink">
            {isEdit ? 'Edit Category' : 'Create New Category'}
          </h3>
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

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tech Support, Night Shift"
              maxLength={50}
              autoFocus
              className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="text-[11px] text-steel mt-1">{name.length}/50</p>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wide text-steel mb-2">
              Description <span className="text-steel font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of jobs go in this category? e.g., Remote support, line cook..."
              maxLength={200}
              rows={3}
              className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
            <p className="text-[11px] text-steel mt-1">{description.length}/200</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!isValid}
            className="min-w-[80px]"
          >
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}
