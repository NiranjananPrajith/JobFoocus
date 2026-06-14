'use client'

import { createClient } from '@/lib/supabase/client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/design/Button'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-[14px] text-steel">Loading…</div>
    </div>
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || ''

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  // Computed after mount because `window` is undefined during SSR.
  const [callbackUrl, setCallbackUrl] = useState('/auth/callback')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const url = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`
    setCallbackUrl(url)
  }, [next])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSent(true)
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-surface">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <img src="/icon.webp" alt="Job Foocus" className="w-12 h-12 rounded-xl mx-auto mb-4" />
          <h1 className="text-[24px] font-semibold text-ink" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Welcome back
          </h1>
          <p className="text-[14px] text-steel mt-1">Sign in to your Job Foocus account</p>
        </div>

        {next && (
          <div className="mb-4 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-[13px] text-ink flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-primary">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              <strong>You were sent here to add a job to your dashboard.</strong>{' '}
              After signing in, you&apos;ll be taken straight back to finish adding the job
              you just scraped.
            </span>
          </div>
        )}

        <div className="bg-canvas rounded-xl border border-hairline-soft p-6 space-y-4">
          {error && (
            <div className="bg-surface border border-red-500/30 rounded-lg px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-hairline-strong text-[14px] font-medium text-ink bg-canvas hover:bg-surface transition-colors disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-hairline-soft" />
            <span className="text-[12px] text-steel">or</span>
            <div className="flex-1 border-t border-hairline-soft" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {sent ? (
              <div className="bg-surface border border-green-500/30 rounded-lg px-4 py-4 text-[13px] text-green-700 text-center">
                <p className="font-semibold mb-1">Check your email</p>
                <p>We sent a magic link to <strong>{email}</strong>. Click the link to sign in.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-hairline-strong text-[14px] text-ink bg-canvas focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="you@example.com"
                  />
                </div>

                <Button variant="primary" type="submit" className="w-full justify-center py-2.5" disabled={loading}>
                  {loading ? 'Sending link...' : 'Send magic link'}
                </Button>
              </>
            )}
          </form>

          <p className="text-center text-[11px] text-steel mt-4 leading-relaxed">
            We use your account email exclusively to manage your quota and subscription. Your resume, contact details, and career materials are never processed or saved on our servers.
          </p>
        </div>

        <div className="text-center mt-6">
          <p className="text-[12px] text-steel mb-2">Don&apos;t have an account?</p>
          <a
            href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
            className="block w-full px-4 py-2.5 rounded-lg border border-primary text-primary text-[14px] font-medium hover:bg-primary/5 transition-colors"
          >
            Create your account &nbsp;→
          </a>
        </div>
      </div>
    </div>
  )
}