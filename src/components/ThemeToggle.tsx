'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme-context'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${className}`}
      style={{
        borderColor: isDark ? '#cc3a05' : '#fa520f',
        backgroundColor: isDark ? 'var(--cream)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.borderColor = '#cc3a05'
        el.style.backgroundColor = 'var(--cream)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.borderColor = isDark ? '#cc3a05' : '#fa520f'
        el.style.backgroundColor = isDark ? 'var(--cream)' : 'transparent'
      }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
