import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendMetaCAPIEvent } from '@/lib/meta-capi'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`)

      // Meta CAPI: CompleteRegistration event (fire-and-forget)
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id && user?.email) {
        const eventId = `reg_${user.id}`
        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
        const clientUa = request.headers.get('user-agent') ?? ''

        // Send server-side CAPI event
        sendMetaCAPIEvent({
          eventName: 'CompleteRegistration',
          eventId,
          eventTime: Math.floor(Date.now() / 1000),
          eventSourceUrl: `${origin}/auth/callback`,
          clientIpAddress: clientIp,
          clientUserAgent: clientUa,
          userData: {
            email: user.email,
            externalId: user.id,
          },
        })

        // Set cookie for client-side dedup (NavBar reads it on SIGNED_IN)
        response.cookies.set('jf_reg_event_id', eventId, {
          httpOnly: true,
          maxAge: 300, // 5 minutes
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        })
      }

      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
