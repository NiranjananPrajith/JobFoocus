'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DeleteAccountButton() {
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const canDelete = confirmText === 'DELETE'

  const handleDelete = async () => {
    if (!canDelete) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to delete account')
      }
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-[14px] font-medium text-red-600 border border-red-300 hover:bg-red-50 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
        Delete Account
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { if (!loading) { setModalOpen(false); setConfirmText(''); setError(null) } }}
          />

          {/* Modal */}
          <div className="relative bg-canvas rounded-xl shadow-lg border border-hairline-soft w-full max-w-[420px] mx-4 overflow-hidden">
            <div className="px-6 py-5">
              <h3 className="text-[18px] font-semibold text-ink mb-2">Delete your account?</h3>
              <p className="text-[14px] text-steel leading-relaxed mb-4">
                This will permanently delete your account and all associated data — jobs, resumes, cover letters, categories, and settings. This action cannot be undone.
              </p>
              <label className="block mb-1 text-[13px] font-medium text-ink">
                Type <code className="bg-surface px-1 py-0.5 rounded">DELETE</code> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                disabled={loading}
                className="w-full px-3 py-2 text-[14px] border border-hairline-soft rounded-md focus:outline-none focus:border-red-400 disabled:opacity-50"
                onKeyDown={(e) => { if (e.key === 'Enter' && canDelete) handleDelete() }}
                autoFocus
              />
              {error && (
                <p className="text-[13px] text-red-600 mt-2">{error}</p>
              )}
            </div>
            <div className="px-6 py-4 bg-surface flex items-center justify-end gap-3">
              <button
                onClick={() => { setModalOpen(false); setConfirmText(''); setError(null) }}
                disabled={loading}
                className="px-4 py-2 text-[14px] font-medium text-ink hover:bg-canvas rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete || loading}
                className="px-4 py-2 text-[14px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
