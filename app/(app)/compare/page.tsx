import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveCalendar } from '@/lib/active-calendar'
import { CompareView } from './compare-view'
import type { Category } from '@/lib/database.types'

export default async function ComparePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { ownerId } = await getActiveCalendar(supabase)

  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .eq('owner_id', ownerId)
    .order('name')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Compare</h1>
        <p className="text-muted-foreground mt-1">
          Planned schedule vs. what actually happened.
        </p>
      </div>
      <CompareView categories={(categoriesData ?? []) as Category[]} ownerId={ownerId} />
    </div>
  )
}
