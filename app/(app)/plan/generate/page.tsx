import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveCalendar } from '@/lib/active-calendar'
import { GeneratePlanView } from './generate-plan-view'
import type { Category } from '@/lib/database.types'

export default async function GeneratePlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { ownerId, canEdit } = await getActiveCalendar(supabase)

  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .eq('owner_id', ownerId)
    .order('name')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Generate Plan</h1>
        <p className="text-muted-foreground mt-1">
          Let AI propose a study plan for the week. Review, edit, then accept.
        </p>
      </div>
      {!canEdit && (
        <div className="mb-4 rounded-md bg-muted border px-3 py-2 text-sm text-muted-foreground">
          You have <strong>viewer</strong> access to this calendar — plan generation is disabled.
        </div>
      )}
      <GeneratePlanView
        ownerId={ownerId}
        me={user.id}
        categories={(categoriesData ?? []) as Category[]}
        canEdit={canEdit}
      />
    </div>
  )
}
