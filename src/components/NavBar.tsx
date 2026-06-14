'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import AddJobModal from '@/components/AddJobModal'
import ThemeToggle from '@/components/ThemeToggle'
import { useTheme } from '@/lib/theme-context'
import { createClient } from '@/lib/supabase/client'
import { TIER_LABEL, TIER_PRICE_USD, type Tier } from '@/lib/limits'
import { timeUntilReset } from '@/lib/usage-utils'
import type { User } from '@supabase/supabase-js'

export default function NavBar() {
  const pathname = usePathname()
  const [addJobOpen, setAddJobOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const [profileOpen, setProfileOpen] = useState(false)
  const [billingOpen, setBillingOpen] = useState(false)
  const [navMenuOpen, setNavMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const billingRef = useRef<HTMLDivElement>(null)
  const navMenuRef = useRef<HTMLDivElement>(null)
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
      // Close either popdown if the click landed outside it. Both
      // refs are checked independently — clicking inside the billing
      // popdown should not also close the profile popdown, but a
      // click anywhere outside both should close both.
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
      if (billingRef.current && !billingRef.current.contains(e.target as Node)) {
        setBillingOpen(false)
      }
      if (navMenuRef.current && !navMenuRef.current.contains(e.target as Node)) {
        setNavMenuOpen(false)
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
        className="sticky top-0 z-50 w-full no-print bg-canvas"
        style={{
          borderBottom: '1px solid var(--hairline-soft)',
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
          <div className="flex items-center gap-3 md:gap-4">
            {!user && (
              <>
                {/* Desktop nav links — hidden on mobile */}
                <div className="hidden md:flex items-center gap-1">
                  {pathname !== '/' && (
                    <a href="/" className="px-3 py-2 text-[14px] font-medium text-steel hover:text-ink transition-colors" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      Features
                    </a>
                  )}
                  {pathname !== '/pricing' && (
                    <a href="/pricing" className="px-3 py-2 text-[14px] font-medium text-steel hover:text-ink transition-colors" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      Pricing
                    </a>
                  )}
                  {pathname !== '/extension-install' && (
                    <a href="/extension-install" className="px-3 py-2 text-[14px] font-medium text-steel hover:text-ink transition-colors" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      Extension
                    </a>
                  )}
                </div>

                <a
                  href="/login"
                  className="px-4 py-2 text-[14px] rounded-md font-medium text-white transition-colors duration-150"
                  style={{
                    backgroundColor: 'var(--primary)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-deep)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
                >
                  Get Started
                </a>

                <ThemeToggle />

                {/* Hamburger — mobile only */}
                <div className="relative md:hidden" ref={navMenuRef}>
                  <button
                    onClick={() => setNavMenuOpen(!navMenuOpen)}
                    className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors"
                    style={{
                      borderColor: navMenuOpen ? 'var(--primary-deep)' : 'var(--primary)',
                      backgroundColor: navMenuOpen ? 'var(--cream)' : 'transparent',
                    }}
                    aria-label="Menu"
                  >
                    {navMenuOpen ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                      </svg>
                    )}
                  </button>

                  {navMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-canvas rounded-xl border border-hairline-soft shadow-lg z-50 overflow-hidden">
                      <div className="py-2">
                        <a href="/" onClick={() => setNavMenuOpen(false)} className="block px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors">
                          Features
                        </a>
                        <a href="/pricing" onClick={() => setNavMenuOpen(false)} className="block px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors">
                          Pricing
                        </a>
                        <a href="/extension-install" onClick={() => setNavMenuOpen(false)} className="block px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors">
                          Extension
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Logged in */}
            {user && (
              <>
                <button
                  className="md:px-5 md:py-2.5 md:text-[14px] px-3.5 py-2 text-[13px] rounded-md font-medium text-white transition-colors duration-150"
                  style={{
                    backgroundColor: 'var(--primary)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  onClick={() => setAddJobOpen(true)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-deep)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
                >
                  Add Job
                </button>

                <ThemeToggle className="hidden md:flex" />

                {/* Billing popdown — plan + usage + Upgrade/Manage.
                    Sits to the left of the profile icon so a paying
                    user has a one-click path to manage their
                    subscription. The popdown closes on click outside,
                    on icon re-click, and on any action inside it. */}
                <BillingPopdown
                  open={billingOpen}
                  setOpen={setBillingOpen}
                  containerRef={billingRef}
                  className="md:w-9 md:h-9 w-8 h-8"
                />

                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="md:w-9 md:h-9 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors"
                    style={{
                      borderColor: profileOpen ? 'var(--primary-deep)' : 'var(--primary)',
                      backgroundColor: profileOpen ? 'var(--cream)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary-deep)'
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--cream)'
                    }}
                    onMouseLeave={(e) => {
                      if (!profileOpen) {
                        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)'
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
                    <div className="absolute right-0 top-full mt-2 w-56 bg-canvas rounded-xl border border-hairline-soft shadow-lg z-50 overflow-hidden">
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
                          href="/extension-install"
                          className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors"
                          onClick={() => setProfileOpen(false)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Install Extension
                        </a>
                        <button
                          onClick={() => { toggleTheme(); setProfileOpen(false) }}
                          className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors md:hidden"
                        >
                          {theme === 'dark' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                          )}
                          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                        </button>
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

// ---------------------------------------------------------------------------
// BillingPopdown
// ---------------------------------------------------------------------------
//
// Top-right credit-card icon + popdown. Shows the user's current plan,
// today's usage, and a primary action (Upgrade for free / Manage
// Subscription for paid) plus a "View full account" link.
//
// Data fetch: on open, POST /api/usage/check with a placeholder
// `action` — the response shape is identical regardless of action
// (tier, jobsUsed, jobsLimit, editsUsed, editsLimit), so we use
// `add_job` arbitrarily. The fetch is read-only and the route is
// already called by AddJobModal and the document editor, so reusing
// it here avoids a new endpoint.
//
// Action button behavior matches the /account page:
//   - Free tier → `router.push('/pricing')` (AccountUpgradeButton)
//   - Paid tier → POST /api/stripe/create-portal-session, then
//     `window.location.href = data.url` (AccountManageButton)
//
// Defined at the bottom of the file so the main NavBar component
// stays focused on layout. The popdown takes its open state from the
// parent so the parent's click-outside handler can close it via the
// shared ref.

interface BillingState {
  tier: Tier | null
  jobsUsed: number
  jobsLimit: number
  editsUsed: number
  editsLimit: number
}

function BillingPopdown({
  open,
  setOpen,
  containerRef,
  className = '',
}: {
  open: boolean
  setOpen: (v: boolean) => void
  containerRef: React.RefObject<HTMLDivElement>
  className?: string
}) {
  const router = useRouter()
  const [state, setState] = useState<BillingState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Bump this counter to force the fetch effect to re-run (used by
  // the "Retry" button on a failed load).
  const [fetchNonce, setFetchNonce] = useState(0)

  // Fetch on each open (or retry). The route is fast (a single
  // supabase read), so we don't bother caching across opens — the
  // data is fresh every time the user looks at it. If the request
  // fails we surface the error and let the user retry via the
  // `fetchNonce` button; we do not auto-retry.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/api/usage/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'add_job' }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Failed to load billing')
        if (cancelled) return
        setState({
          tier: data.tier as Tier,
          jobsUsed: data.jobsUsed ?? 0,
          jobsLimit: data.jobsLimit ?? 0,
          editsUsed: data.editsUsed ?? 0,
          editsLimit: data.editsLimit ?? 0,
        })
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load billing')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, fetchNonce])

  const isPaid = state != null && state.tier !== 'free'

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${className}`}
        style={{
          borderColor: open ? 'var(--primary-deep)' : 'var(--primary)',
          backgroundColor: open ? 'var(--cream)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.borderColor = 'var(--primary-deep)'
          el.style.backgroundColor = 'var(--cream)'
        }}
        onMouseLeave={(e) => {
          if (!open) {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)'
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
          }
        }}
        title="Plan &amp; billing"
        aria-label="Plan and billing"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fa520f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      </button>

      {open && (
        // Width: w-72 (288px) is wider than the profile dropdown's
        // w-56 because we need room for two progress bars + a
        // full-width button + a secondary text link.
        <div className="absolute right-0 top-full mt-2 w-72 bg-canvas rounded-xl border border-hairline-soft shadow-lg z-50 overflow-hidden">
          {/* Header — current plan */}
          <div className="px-4 py-3 border-b border-hairline-soft">
            {loading && (
              <p className="text-[12px] text-steel">Loading…</p>
            )}
            {error && !loading && !state && (
              <div>
                <p className="text-[12px] text-red-600">{error}</p>
                <button
                  onClick={() => setFetchNonce((n) => n + 1)}
                  className="text-[12px] text-primary hover:underline mt-1"
                >
                  Retry
                </button>
              </div>
            )}
            {state && (
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-steel mb-1">
                  Current plan
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[18px] font-semibold text-ink leading-none">
                    {TIER_LABEL[state.tier!]}
                  </span>
                  {isPaid && (
                    <span className="text-[13px] text-steel">
                      ${TIER_PRICE_USD[state.tier!]}/mo
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Body — usage bars + reset hint */}
          {state && (
            <div className="px-4 py-3">
              <CompactUsageBar
                label="Jobs added"
                used={state.jobsUsed}
                limit={state.jobsLimit}
              />
              <div className="h-3" />
              <CompactUsageBar
                label="Document edits"
                used={state.editsUsed}
                limit={state.editsLimit}
              />
              <p className="text-[11px] text-steel mt-3 text-right">
                Resets in {timeUntilReset()} (midnight UTC)
              </p>
            </div>
          )}

          {/* Footer — single link to Account page */}
          {state && (
            <div className="px-4 py-3 border-t border-hairline-soft">
              <a
                href="/account"
                onClick={() => setOpen(false)}
                className="block w-full text-center px-4 py-2 rounded-md text-[13px] font-medium text-white transition-colors"
                style={{ backgroundColor: 'var(--primary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-deep)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
              >
                Account and Billing
              </a>
              {error && (
                <p className="text-[11px] text-red-600 mt-2 text-center">{error}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// CompactUsageBar — a smaller version of the /account page's bar,
// designed for the 288px popdown. Renders the label, the X/Y number,
// and a thin progress bar. Color flips to red when at-cap, matching
// the design on /account so the visual cue is consistent.
function CompactUsageBar({
  label,
  used,
  limit,
}: {
  label: string
  used: number
  limit: number
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  const atCap = used >= limit
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] font-medium text-ink">{label}</span>
        <span
          className={`text-[12px] font-semibold ${
            atCap ? 'text-primary' : 'text-steel'
          }`}
        >
          {used} / {limit}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{
          backgroundColor: 'var(--cream-deeper)',
          border: '1px solid var(--beige-deep)',
        }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: atCap ? '#dc2626' : 'var(--primary)',
          }}
        />
      </div>
    </div>
  )
}