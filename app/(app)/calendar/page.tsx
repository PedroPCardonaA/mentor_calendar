import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveCalendar } from '@/lib/active-calendar'
import { CalendarView } from '@/components/calendar/calendar-view'
import type { Category } from '@/lib/database.types'

export default async function CalendarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { ownerId, canEdit } = await getActiveCalendar(supabase)

  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .eq('owner_id', ownerId)
    .order('name')

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
      </div>
      <CalendarView
        categories={(categoriesData ?? []) as Category[]}
        ownerId={ownerId}
        canEdit={canEdit}
      />
    </div>
  )
}
