import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveCalendar } from '@/lib/active-calendar'
import { SharingView } from './sharing-view'
import type { CalendarShare } from '@/lib/database.types'

export default async function SharingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { me } = await getActiveCalendar(supabase)

  // Only show shares for the user's OWN calendar (not the active calendar)
  const { data: shares } = await supabase
    .from('calendar_shares')
    .select('*')
    .eq('owner_id', me)
    .order('created_at')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Sharing</h1>
        <p className="text-muted-foreground mt-1">
          Invite people to your calendar as viewer or editor.
        </p>
      </div>
      <SharingView me={me} initialShares={(shares ?? []) as CalendarShare[]} />
    </div>
  )
}
