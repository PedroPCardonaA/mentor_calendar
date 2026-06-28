import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, SharePermission } from './database.types'

export const ACTIVE_CALENDAR_COOKIE = 'active_calendar'

export interface CalendarOption {
  ownerId: string
  label: string
  /** 'owner' for the user's own calendar; 'viewer' | 'editor' for shares */
  permission: 'owner' | SharePermission
}

export interface ActiveCalendar {
  /** The signed-in user's own id */
  me: string
  /** The calendar currently in view (may be own or a shared one) */
  ownerId: string
  /** Whether the current user can create/edit/delete in this calendar */
  canEdit: boolean
  /** All calendars accessible: own + accepted shares */
  calendars: CalendarOption[]
  /** Count of pending invitations (for nav badge) */
  pendingInviteCount: number
}

type Client = SupabaseClient<Database>

/**
 * Server-only helper. Reads the active_calendar cookie, validates access,
 * and returns full active-calendar context. Must be called inside a Server
 * Component or Server Action (cookies() requires server context).
 */
export async function getActiveCalendar(supabase: Client): Promise<ActiveCalendar> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')
  const me = user.id

  // Load profile for my own label
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', me)
    .single()

  const myLabel = myProfile?.full_name ?? myProfile?.email ?? 'My calendar'

  // Load accepted shares where I'm the collaborator, join owner profile
  const { data: acceptedShares } = await supabase
    .from('calendar_shares')
    .select('id, owner_id, permission, profiles!calendar_shares_owner_id_fkey(full_name, email)')
    .eq('collaborator_id', me)
    .eq('status', 'accepted')

  // Count pending invitations
  const { count: pendingInviteCount } = await supabase
    .from('calendar_shares')
    .select('id', { count: 'exact', head: true })
    .eq('collaborator_id', me)
    .eq('status', 'pending')

  const calendars: CalendarOption[] = [
    { ownerId: me, label: myLabel, permission: 'owner' },
    ...(acceptedShares ?? []).map((row) => {
      const profile = row.profiles as { full_name: string | null; email: string | null } | null
      return {
        ownerId: row.owner_id,
        label: profile?.full_name ?? profile?.email ?? row.owner_id.slice(0, 8),
        permission: (row.permission ?? 'viewer') as SharePermission,
      }
    }),
  ]

  // Resolve active calendar from cookie
  const cookieStore = await cookies()
  const cookieVal = cookieStore.get(ACTIVE_CALENDAR_COOKIE)?.value ?? ''
  const isValidCookie = calendars.some((c) => c.ownerId === cookieVal)
  const ownerId = isValidCookie ? cookieVal : me

  const activeEntry = calendars.find((c) => c.ownerId === ownerId)
  const canEdit = activeEntry?.permission === 'owner' || activeEntry?.permission === 'editor'

  return {
    me,
    ownerId,
    canEdit: canEdit ?? false,
    calendars,
    pendingInviteCount: pendingInviteCount ?? 0,
  }
}
