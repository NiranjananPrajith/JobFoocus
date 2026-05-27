'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/design/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#fafafa' }}>
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <img src="/icon.webp" alt="Job Foocus" className="w-12 h-12 rounded-xl mx-auto mb-4" />
          <h1 className="text-[24px] font-semibold text-ink" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Welcome back
          </h1>
          <p className="text-[14px] text-steel mt-1">Sign in to your Job Foocus account</p>
        </div>

        <div className="bg-white rounded-xl border border-hairline-soft p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-hairline-strong text-[14px] font-medium text-ink bg-white hover:bg-surface transition-colors disabled:opacity-60"
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
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-4 text-[13px] text-green-700 text-center">
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
                    className="w-full px-3 py-2.5 rounded-lg border border-hairline-strong text-[14px] text-ink bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="you@example.com"
                  />
                </div>

                <Button variant="primary" type="submit" className="w-full justify-center py-2.5" disabled={loading}>
                  {loading ? 'Sending link...' : 'Send magic link'}
                </Button>
              </>
            )}
          </form>
        </div>

        <p className="text-center text-[13px] text-steel mt-4">
          Don&apos;t have an account?{' '}
          <a href="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}