import { redirect } from 'next/navigation'

/**
 * Root route `/` — the proxy handles the redirect for authenticated users
 * (→ /calendar or /mentor) and unauthenticated users (→ /login).
 * This page is a final fallback that should rarely render.
 */
export default function RootPage() {
  redirect('/calendar')
}
