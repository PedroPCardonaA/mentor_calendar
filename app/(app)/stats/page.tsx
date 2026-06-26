import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatsView } from './stats-view'
import type { Category, Profile } from '@/lib/database.types'

export default async function StatsPage() {
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

  const isMentor = profile?.role === 'mentor'

  // Mentors can view stats for linked students
  let students: Profile[] = []
  if (isMentor) {
    const { data: mentorships } = await supabase
      .from('mentorships')
      .select('student_id, profiles!mentorships_student_id_fkey(*)')
      .eq('mentor_id', user.id)

    students = (mentorships ?? []).map((m) => m.profiles as unknown as Profile)
  }

  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .eq('owner_id', user.id)
    .order('name')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Stats</h1>
        <p className="text-muted-foreground mt-1">Planned vs. actual hours and adherence metrics.</p>
      </div>
      <StatsView
        userId={user.id}
        isMentor={isMentor}
        students={students}
        initialCategories={(categoriesData ?? []) as Category[]}
      />
    </div>
  )
}
