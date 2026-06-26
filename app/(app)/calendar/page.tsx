import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarView } from '@/components/calendar/calendar-view'
import type { Category } from '@/lib/database.types'

export default async function CalendarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .eq('owner_id', user.id)
    .order('name')

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
      </div>
      <CalendarView
        categories={(categoriesData ?? []) as Category[]}
        studentId={user.id}
      />
    </div>
  )
}
