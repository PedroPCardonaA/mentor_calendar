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

/** Get all profiles that are linked to `userId` via mentorships (both directions). */
export async function getLinkedProfiles(
  supabase: Client,
  userId: string
): Promise<Profile[]> {
  // Linked as mentor → get students
  const { data: asStudents, error: e1 } = await supabase
    .from('mentorships')
    .select('student_id')
    .eq('mentor_id', userId)

  // Linked as student → get mentors
  const { data: asMentors, error: e2 } = await supabase
    .from('mentorships')
    .select('mentor_id')
    .eq('student_id', userId)

  if (e1) throw e1
  if (e2) throw e2

  const ids = [
    ...(asStudents ?? []).map((r) => r.student_id),
    ...(asMentors ?? []).map((r) => r.mentor_id),
  ]

  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', ids)

  if (error) throw error
  return data ?? []
}
