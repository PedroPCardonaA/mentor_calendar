import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '../database.types'

/**
 * Refreshes the Supabase session in the proxy (Next.js 16 `proxy.ts`).
 * Must be called at the start of every proxy invocation to keep the session alive.
 * Returns the authenticated user (or null) and the response with refreshed cookies.
 */
export async function updateSession(request: NextRequest) {
  // Start with a pass-through response; will be replaced if cookies are set
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Mutate request cookies so the forwarded request sees them
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Re-create the response so it carries the updated cookies downstream
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser() validates the JWT server-side — do NOT replace with getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user, response: supabaseResponse }
}
