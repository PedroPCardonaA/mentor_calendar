import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  CalendarShare,
  Profile,
  SharePermission,
  ShareStatus,
  TablesInsert,
} from '../database.types'

type Client = SupabaseClient<Database>

/** Shares I own (I am the calendar owner who sent the invite). */
export async function listMyShares(
  supabase: Client,
  ownerId: string
): Promise<CalendarShare[]> {
  const { data, error } = await supabase
    .from('calendar_shares')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at')

  if (error) throw error
  return data ?? []
}

export interface IncomingInvite extends CalendarShare {
  owner_profile: Pick<Profile, 'id' | 'full_name' | 'email'>
}

/** Invitations addressed to me as collaborator (pending + accepted + declined). */
export async function listIncomingInvites(
  supabase: Client,
  collaboratorId: string
): Promise<IncomingInvite[]> {
  const { data, error } = await supabase
    .from('calendar_shares')
    .select('*, owner_profile:profiles!calendar_shares_owner_id_fkey(id, full_name, email)')
    .eq('collaborator_id', collaboratorId)
    .order('created_at')

  if (error) throw error
  return (data ?? []) as unknown as IncomingInvite[]
}

/** Calendars I have accepted access to (for the calendar switcher). */
export interface AcceptedCalendar {
  share: CalendarShare
  ownerProfile: Pick<Profile, 'id' | 'full_name' | 'email'>
}

export async function listAcceptedCalendars(
  supabase: Client,
  collaboratorId: string
): Promise<AcceptedCalendar[]> {
  const { data, error } = await supabase
    .from('calendar_shares')
    .select('*, owner_profile:profiles!calendar_shares_owner_id_fkey(id, full_name, email)')
    .eq('collaborator_id', collaboratorId)
    .eq('status', 'accepted')
    .order('created_at')

  if (error) throw error
  return (data ?? []).map((row) => ({
    share: row as unknown as CalendarShare,
    ownerProfile: (row as unknown as { owner_profile: Pick<Profile, 'id' | 'full_name' | 'email'> }).owner_profile,
  }))
}

/** Invite someone to my calendar. */
export async function createShare(
  supabase: Client,
  input: Pick<TablesInsert<'calendar_shares'>, 'owner_id' | 'invitee_email' | 'permission'>
): Promise<CalendarShare> {
  const { data, error } = await supabase
    .from('calendar_shares')
    .insert({ ...input, status: 'pending' })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Change viewer ↔ editor for an existing share. */
export async function updateSharePermission(
  supabase: Client,
  shareId: string,
  permission: SharePermission
): Promise<CalendarShare> {
  const { data, error } = await supabase
    .from('calendar_shares')
    .update({ permission, updated_at: new Date().toISOString() })
    .eq('id', shareId)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Revoke (delete) a share I own. */
export async function revokeShare(supabase: Client, shareId: string): Promise<void> {
  const { error } = await supabase.from('calendar_shares').delete().eq('id', shareId)
  if (error) throw error
}

/** Invitee accepts an invitation (sets status + collaborator_id). */
export async function acceptInvite(
  supabase: Client,
  shareId: string,
  collaboratorId: string
): Promise<CalendarShare> {
  const { data, error } = await supabase
    .from('calendar_shares')
    .update({
      status: 'accepted' satisfies ShareStatus,
      collaborator_id: collaboratorId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', shareId)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Invitee declines an invitation. */
export async function declineInvite(
  supabase: Client,
  shareId: string
): Promise<CalendarShare> {
  const { data, error } = await supabase
    .from('calendar_shares')
    .update({ status: 'declined' satisfies ShareStatus, updated_at: new Date().toISOString() })
    .eq('id', shareId)
    .select()
    .single()

  if (error) throw error
  return data
}
