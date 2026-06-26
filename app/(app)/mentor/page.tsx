import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MentorDashboard } from './mentor-dashboard'
import type { Profile } from '@/lib/database.types'

export default async function MentorPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Non-mentors shouldn't reach this page (proxy redirects them to /calendar)
  if (profile?.role !== 'mentor') redirect('/calendar')

  // Fetch linked students with their profile data
  const { data: mentorships } = await supabase
    .from('mentorships')
    .select('id, student_id, profiles!mentorships_student_id_fkey(*)')
    .eq('mentor_id', user.id)

  type MentorshipWithProfile = {
    id: string
    student_id: string
    profiles: Profile
  }

  const students = ((mentorships ?? []) as unknown as MentorshipWithProfile[]).map((m) => ({
    mentorshipId: m.id,
    profile: m.profiles,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Students</h1>
        <p className="text-muted-foreground mt-1">Monitor and manage your linked students.</p>
      </div>
      <MentorDashboard mentorId={user.id} students={students} />
    </div>
  )
}
