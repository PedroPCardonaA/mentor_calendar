import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Profile } from '../database.types'

type Client = SupabaseClient<Database>

export async function getProfile(
  supabase: Client,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }
  return data
}

export async function updateProfile(
  supabase: Client,
  userId: string,
  update: { full_name?: string; email?: string }
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}
