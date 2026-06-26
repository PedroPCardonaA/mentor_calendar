import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Category, TablesInsert, TablesUpdate } from '../database.types'

type Client = SupabaseClient<Database>

export async function getCategories(
  supabase: Client,
  ownerId: string
): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('owner_id', ownerId)
    .order('name')

  if (error) throw error
  return data ?? []
}

export async function createCategory(
  supabase: Client,
  input: Omit<TablesInsert<'categories'>, 'id' | 'created_at' | 'updated_at'>
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCategory(
  supabase: Client,
  id: string,
  update: TablesUpdate<'categories'>
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCategory(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}
