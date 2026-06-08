'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getUserCategories, type UserCategory } from '@/lib/storage-adapter';
import CategoryPopup from './CategoryPopup';

interface CategorySelectorProps {
  value: string;
  onChange: (category: string) => void;
  includeUncategorized?: boolean;
  onManageClick?: () => void;
  /**
   * Where the popover opens relative to the trigger. Default 'down'
   * (used in forms where there's vertical room below). Use 'up' in
   * tight contexts like job cards where the popover would otherwise
   * clip at the bottom of the viewport / card.
   */
  popoverDirection?: 'down' | 'up';
}

export default function CategorySelector({
  value,
  onChange,
  includeUncategorized = false,
  onManageClick,
  popoverDirection = 'down',
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const loadCategories = useCallback(async () => {
    const cats = await getUserCategories();
    setCategories(cats);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadCategories();
    }
  }, [mounted, loadCategories]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSelect = (catName: string) => {
    onChange(catName);
    setIsOpen(false);
    setFilter('');
  };

  const handleAddNew = () => {
    setShowPopup(true);
    setIsOpen(false);
  };

  const handleManage = () => {
    if (onManageClick) onManageClick();
    setIsOpen(false);
  };

  const handleSaveNew = async (newCat: UserCategory) => {
    const { saveCategory } = await import('@/lib/storage-adapter');
    const result = await saveCategory(newCat);
    if (result.success) {
      await loadCategories();
      onChange(newCat.name);
    }
  };

  const displayValue = categories.find(c => c.name === value)?.name || value;

  if (!mounted) {
    return (
      <div className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] h-11">
        Loading...
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? filter : displayValue}
          onChange={(e) => { setFilter(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Select category..."
          className="w-full px-4 py-3 rounded-md border border-hairline-strong bg-canvas text-ink text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-11 cursor-pointer"
          readOnly={!isOpen}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-ink transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            className={`absolute z-50 left-0 right-0 bg-white rounded-lg border border-hairline-strong shadow-lg overflow-hidden ${
              popoverDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
            <div className="max-h-64 overflow-y-auto">
              {includeUncategorized && (
                <div className="px-4 py-2.5 text-[13px] text-steel bg-surface cursor-not-allowed flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-[#888888] shrink-0"
                  />
                  Uncategorized
                  <span className="text-[11px] text-steel ml-auto">(system)</span>
                </div>
              )}

              {filteredCategories.length === 0 && filter && (
                <div className="px-4 py-3 text-[13px] text-steel">
                  No categories match &quot;{filter}&quot;
                </div>
              )}

              {filteredCategories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => handleSelect(cat.name)}
                  className="w-full px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors flex items-center gap-3 text-left"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.name}</span>
                  {value === cat.name && (
                    <svg className="ml-auto shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}

              {(categories.length > 0 || filter) && (
                <div className="border-t border-hairline-soft" />
              )}

              <button
                type="button"
                onClick={handleAddNew}
                className="w-full px-4 py-2.5 text-[13px] text-primary hover:bg-primary/5 transition-colors flex items-center gap-3 text-left"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add New Category
              </button>

              {onManageClick && (
                <button
                  type="button"
                  onClick={handleManage}
                  className="w-full px-4 py-2.5 text-[13px] text-steel hover:bg-surface transition-colors flex items-center gap-3 text-left"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  Manage Categories...
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <CategoryPopup
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        onSave={handleSaveNew}
      />
    </>
  );
}
