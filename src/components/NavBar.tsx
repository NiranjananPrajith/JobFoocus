'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import AddJobModal from '@/components/AddJobModal'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function NavBar() {
  const pathname = usePathname()
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
          <a href={user ? '/dashboard' : '/'} className="flex items-center gap-3">
            <img
              src="/icon_wide.webp"
              alt="Job Foocus"
              className="h-8 object-contain"
            />
          </a>

          {/* Right */}
          <div className="flex items-center gap-4">
            {!user && (
              <>
                {!['/login', '/signup', '/pricing'].some(p => pathname === p) && (
                  <a
                    href="/pricing"
                    className="px-3 py-2 text-[14px] font-medium text-steel hover:text-ink transition-colors"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Pricing
                  </a>
                )}
                <a
                  href="/login"
                  className="px-3 py-2 text-[14px] font-medium text-steel hover:text-ink transition-colors"
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
              </>
            )}

            {/* Logged in */}
            {user && (
              <>
                <button
                  className="px-5 py-2.5 rounded-md text-[14px] font-medium text-white transition-colors duration-150"
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
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-hairline-soft shadow-lg z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-hairline-soft">
                        <p className="text-[12px] text-steel truncate">{user.email}</p>
                      </div>
                      <div className="py-2">
                        {navLinks.map((link) => {
                          const isActive = link.href === '/'
                            ? pathname === '/'
                            : pathname.startsWith(link.href)
                          return (
                            <a
                              key={link.href}
                              href={link.href}
                              className={[
                                'flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors',
                                isActive
                                  ? 'text-primary font-medium'
                                  : 'text-ink hover:bg-surface',
                              ].join(' ')}
                              onClick={() => setProfileOpen(false)}
                            >
                              {link.href === '/dashboard' && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                                </svg>
                              )}
                              {link.href === '/jobs' && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                                </svg>
                              )}
                              {link.href === '/followups' && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                              )}
                              {link.label}
                            </a>
                          )
                        })}
                        <div className="border-t border-hairline-soft my-1" />
                        <a
                          href="/categories"
                          className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors"
                          onClick={() => setProfileOpen(false)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                            <line x1="7" y1="7" x2="7.01" y2="7"/>
                          </svg>
                          Manage Categories
                        </a>
                        <a
                          href="/trash"
                          className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors"
                          onClick={() => setProfileOpen(false)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                          Trash
                        </a>
                      </div>
                      <div className="border-t border-hairline-soft py-2">
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
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <AddJobModal isOpen={addJobOpen} onClose={() => setAddJobOpen(false)} onJobAdded={() => window.location.reload()} />
    </>
  )
}