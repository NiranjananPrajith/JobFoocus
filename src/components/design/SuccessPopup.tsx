import { useEffect, useState } from 'react'
import Button from './Button'

interface SuccessPopupProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
  actionLabel?: string
  actionHref?: string
}

export default function SuccessPopup({
  isOpen,
  onClose,
  title = 'Saved!',
  message = 'Your changes have been saved successfully.',
  actionLabel = 'Go to Dashboard',
  actionHref = '/dashboard',
}: SuccessPopupProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!mounted || !isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(30, 25, 20, 0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center">
        {/* Green circle with checkmark */}
        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <h3 className="text-[20px] font-semibold text-ink mb-2">{title}</h3>
        <p className="text-[14px] text-steel mb-8 leading-relaxed">{message}</p>

        <div className="flex flex-col gap-3 w-full">
          <Button
            variant="primary"
            className="w-full justify-center"
            onClick={() => { onClose(); window.location.href = actionHref }}
          >
            {actionLabel}
          </Button>
          <button
            onClick={onClose}
            className="text-[13px] text-steel hover:text-ink transition-colors py-1"
          >
            Keep editing
          </button>
        </div>
      </div>
    </div>
  )
}
