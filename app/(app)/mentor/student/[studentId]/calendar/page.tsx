import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CalendarView } from '@/components/calendar/calendar-view'
import type { Category } from '@/lib/database.types'

export default async function MentorStudentCalendarPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify the mentor is linked to this student
  const { data: mentorship } = await supabase
    .from('mentorships')
    .select('id')
    .eq('mentor_id', user.id)
    .eq('student_id', studentId)
    .single()

  if (!mentorship) notFound()

  const { data: studentProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', studentId)
    .single()

  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .eq('owner_id', studentId)
    .order('name')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          {studentProfile?.full_name ?? studentProfile?.email ?? 'Student'}&apos;s Calendar
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Read-only view. You can also add events for this student.</p>
      </div>
      <CalendarView
        categories={(categoriesData ?? []) as Category[]}
        studentId={studentId}
      />
    </div>
  )
}
