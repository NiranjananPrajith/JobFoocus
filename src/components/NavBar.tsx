'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import AddJobModal from '@/components/AddJobModal'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function NavBar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [addJobOpen, setAddJobOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const navLinks = user
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/jobs', label: 'Jobs' },
        { href: '/followups', label: 'Follow-ups' },
      ]
    : [{ href: '/pricing', label: 'Pricing' }]

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full no-print"
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #ededed',
          height: '64px',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          {/* Left - Brand */}
          <a href="/" className="flex items-center gap-3">
            <img
              src="/icon_wide.webp"
              alt="Job Foocus"
              className="h-8 object-contain"
            />
          </a>

          {/* Right - Desktop Navigation + CTA */}
          <div className="flex items-center gap-4 md:gap-6">
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href)
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={[
                      'px-4 py-2 text-[14px] font-medium transition-colors duration-150',
                      isActive
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-steel hover:text-ink',
                    ].join(' ')}
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {link.label}
                  </a>
                )
              })}
            </nav>

            {/* Login / Sign Up buttons */}
            {!user && (
              <div className="hidden md:flex items-center gap-2">
                <a
                  href="/login"
                  className="px-4 py-2 text-[14px] font-medium text-steel hover:text-ink transition-colors"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  Log in
                </a>
                <a
                  href="/signup"
                  className="px-4 py-2 text-[14px] font-medium text-white rounded-md transition-colors"
                  style={{
                    backgroundColor: '#fa520f',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#cc3a05')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fa520f')}
                >
                  Sign up
                </a>
              </div>
            )}

            {/* Logged in */}
            {user && (
              <>
                {/* Add Job */}
                <button
                  className="hidden md:inline-flex px-5 py-2.5 rounded-md text-[14px] font-medium text-white transition-colors duration-150"
                  style={{
                    backgroundColor: '#fa520f',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  onClick={() => setAddJobOpen(true)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#cc3a05')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fa520f')}
                >
                  Add Job
                </button>

                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors"
                    style={{
                      borderColor: profileOpen ? '#cc3a05' : '#fa520f',
                      backgroundColor: profileOpen ? '#fff8e0' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#cc3a05'
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff8e0'
                    }}
                    onMouseLeave={(e) => {
                      if (!profileOpen) {
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#fa520f'
                        ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                      }
                    }}
                    title="Account"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-hairline-soft shadow-lg z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-hairline-soft">
                        <p className="text-[12px] text-steel truncate">{user.email}</p>
                      </div>
                      <a
                        href="/master-resume"
                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        Master Resume
                      </a>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-ink"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={[
          'fixed top-[64px] left-0 right-0 z-50 bg-canvas border-b border-hairline-soft',
          'transform transition-transform duration-200 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <nav className="flex flex-col p-4">
          {navLinks.map((link) => {
            const isActive = link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href)
            return (
              <a
                key={link.href + '-mobile'}
                href={link.href}
                className={[
                  'px-4 py-3 text-[16px] font-medium transition-colors duration-150',
                  'border-b border-hairline-soft last:border-b-0',
                  isActive
                    ? 'text-primary'
                    : 'text-ink hover:text-primary',
                ].join(' ')}
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            )
          })}
          {!user && (
            <>
              <a
                href="/login"
                className="px-4 py-3 text-[15px] font-medium text-steel hover:text-ink border-b border-hairline-soft"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Log in
              </a>
              <a
                href="/signup"
                className="px-4 py-3 text-[15px] font-medium text-white border-b border-hairline-soft"
                style={{ backgroundColor: '#fa520f', fontFamily: 'Inter, system-ui, sans-serif' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign up
              </a>
            </>
          )}
          {user && (
            <>
              <button
                onClick={() => { setMobileMenuOpen(false); setAddJobOpen(true) }}
                className="w-full px-5 py-3 rounded-md text-[14px] font-medium text-white transition-colors duration-150"
                style={{
                  backgroundColor: '#fa520f',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                Add Job
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); handleSignOut() }}
                className="w-full text-left px-4 py-3 text-[14px] font-medium text-steel border-t border-hairline-soft"
              >
                Sign out
              </button>
            </>
          )}
        </nav>
      </div>

      <AddJobModal isOpen={addJobOpen} onClose={() => setAddJobOpen(false)} onJobAdded={() => window.location.reload()} />
    </>
  )
}