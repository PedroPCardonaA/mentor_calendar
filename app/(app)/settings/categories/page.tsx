import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CategoryManager } from './category-manager'
import type { Category } from '@/lib/database.types'

export default async function CategoriesSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('owner_id', user.id)
    .order('name')

  if (error) throw error

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-muted-foreground mt-1">
          Organize your events and logs by category. Assign a color to each.
        </p>
      </div>
      <CategoryManager initial={(data ?? []) as Category[]} userId={user.id} />
    </div>
  )
}
