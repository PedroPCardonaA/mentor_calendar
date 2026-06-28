import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvitationsView } from './invitations-view'
import type { Profile } from '@/lib/database.types'

interface ShareWithOwner {
  id: string
  owner_id: string
  invitee_email: string
  collaborator_id: string | null
  permission: string
  status: string
  created_at: string
  updated_at: string
  owner_profile: Pick<Profile, 'id' | 'full_name' | 'email'>
}

export default async function InvitationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: shares } = await supabase
    .from('calendar_shares')
    .select('*, owner_profile:profiles!calendar_shares_owner_id_fkey(id, full_name, email)')
    .eq('collaborator_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Invitations</h1>
        <p className="text-muted-foreground mt-1">
          Calendars other people have shared with you.
        </p>
      </div>
      <InvitationsView
        me={user.id}
        initialShares={(shares ?? []) as unknown as ShareWithOwner[]}
      />
    </div>
  )
}
