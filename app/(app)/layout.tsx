import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveCalendar } from '@/lib/active-calendar'
import { AppNav } from '@/components/app-nav'
import type { Profile } from '@/lib/database.types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const activeCalendar = await getActiveCalendar(supabase)

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav
        profile={profile as Profile}
        calendars={activeCalendar.calendars}
        activeOwnerId={activeCalendar.ownerId}
        pendingInviteCount={activeCalendar.pendingInviteCount}
      />
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
