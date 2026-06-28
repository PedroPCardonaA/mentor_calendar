import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Routes requiring an authenticated session
const PROTECTED_PREFIXES = ['/calendar', '/compare', '/stats', '/sharing', '/invitations', '/plan', '/settings']
// Routes that authenticated users should be redirected away from
const AUTH_PREFIXES = ['/login', '/signup', '/onboarding']

export async function proxy(request: NextRequest) {
  const { user, response: supabaseResponse } = await updateSession(request)
  const path = request.nextUrl.pathname

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p))
  const isAuthPage = AUTH_PREFIXES.some((p) => path.startsWith(p))
  const isRoot = path === '/'

  /**
   * Copy session cookies from supabaseResponse onto a redirect response so the
   * refreshed session is persisted even when we redirect.
   */
  function redirectWithCookies(url: URL) {
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies
      .getAll()
      .forEach((c) => redirectResponse.cookies.set(c.name, c.value, c))
    return redirectResponse
  }

  // Unauthenticated: gate protected routes and root
  if (!user && (isProtected || isRoot)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', encodeURIComponent(path))
    return redirectWithCookies(loginUrl)
  }

  // Authenticated: send away from auth pages and root → calendar
  if (user && (isAuthPage || isRoot)) {
    return redirectWithCookies(new URL('/calendar', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
