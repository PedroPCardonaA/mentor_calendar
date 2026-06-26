import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GeneratePlanView } from './generate-plan-view'
import type { Category } from '@/lib/database.types'

export default async function GeneratePlanPage() {
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

  // Only students can generate a plan for themselves
  if (profile?.role === 'mentor') redirect('/mentor')

  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .eq('owner_id', user.id)
    .order('name')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Generate Plan</h1>
        <p className="text-muted-foreground mt-1">
          Let AI propose a study plan for the week. Review, edit, then accept.
        </p>
      </div>
      <GeneratePlanView
        studentId={user.id}
        categories={(categoriesData ?? []) as Category[]}
      />
    </div>
  )
}
