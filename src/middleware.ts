import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/auth')
  const isPublicRoute =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/features') ||
    request.nextUrl.pathname.startsWith('/pricing') ||
    request.nextUrl.pathname.startsWith('/privacy-policy') ||
    request.nextUrl.pathname.startsWith('/terms-of-service') ||
    request.nextUrl.pathname.startsWith('/extension-install')

  // Unauthenticated — redirect protected routes to login
  if (!user && !isPublicRoute && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Forward the full path + query string as `?next=` so deep links from
    // the browser extension (e.g. /application?title=...&company=...)
    // can bounce the user back here after sign-in.
    if (request.nextUrl.pathname !== '/') {
      url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`
    }
    return NextResponse.redirect(url)
  }

  // Authenticated — redirect auth pages to dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.webp|icon_wide.webp|.*\\.(?:svg|png|jpg|jpeg|gif|webp|zip|mjs|js)$).*)',
  ],
}