'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_CALENDAR_COOKIE } from '@/lib/active-calendar'

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(ACTIVE_CALENDAR_COOKIE)
  redirect('/login')
}

/**
 * Called by the calendar switcher. Validates that the requested ownerId is
 * either the current user's own id or an accepted-editor/viewer share, then
 * sets the active_calendar cookie.
 */
export async function setActiveCalendarAction(ownerId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Allow self
  if (ownerId === user.id) {
    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_CALENDAR_COOKIE, ownerId, { path: '/', sameSite: 'lax', httpOnly: true })
    revalidatePath('/', 'layout')
    return
  }

  // Validate it's an accepted share for this user
  const { data } = await supabase
    .from('calendar_shares')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('collaborator_id', user.id)
    .eq('status', 'accepted')
    .single()

  if (!data) return // silently ignore invalid attempts (no throw to not break client)

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_CALENDAR_COOKIE, ownerId, { path: '/', sameSite: 'lax', httpOnly: true })
  revalidatePath('/', 'layout')
}
