import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Mentorship, Profile } from '../database.types'

type Client = SupabaseClient<Database>

/** Get all students linked to a mentor (with their profile rows). */
export async function getMentorStudents(
  supabase: Client,
  mentorId: string
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('mentorships')
    .select('student_id, profiles!mentorships_student_id_fkey(*)')
    .eq('mentor_id', mentorId)

  if (error) throw error
  return (data ?? []).map((row) => row.profiles as unknown as Profile)
}

/** Get all mentors linked to a student (with their profile rows). */
export async function getStudentMentors(
  supabase: Client,
  studentId: string
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('mentorships')
    .select('mentor_id, profiles!mentorships_mentor_id_fkey(*)')
    .eq('student_id', studentId)

  if (error) throw error
  return (data ?? []).map((row) => row.profiles as unknown as Profile)
}

export async function getMentorships(
  supabase: Client,
  mentorId: string
): Promise<Mentorship[]> {
  const { data, error } = await supabase
    .from('mentorships')
    .select('*')
    .eq('mentor_id', mentorId)

  if (error) throw error
  return data ?? []
}

export async function createMentorship(
  supabase: Client,
  mentorId: string,
  studentId: string
): Promise<Mentorship> {
  const { data, error } = await supabase
    .from('mentorships')
    .insert({ mentor_id: mentorId, student_id: studentId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteMentorship(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from('mentorships').delete().eq('id', id)
  if (error) throw error
}
