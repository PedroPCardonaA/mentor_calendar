import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, TimeLog, TablesInsert, TablesUpdate } from '../database.types'

type Client = SupabaseClient<Database>

export async function getTimeLogs(
  supabase: Client,
  ownerId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<TimeLog[]> {
  const { data, error } = await supabase
    .from('time_logs')
    .select('*')
    .eq('owner_id', ownerId)
    .gte('logged_at', rangeStart.toISOString())
    .lte('logged_at', rangeEnd.toISOString())
    .order('logged_at')

  if (error) throw error
  return data ?? []
}

export async function createTimeLog(
  supabase: Client,
  input: Omit<TablesInsert<'time_logs'>, 'id' | 'logged_at'>
): Promise<TimeLog> {
  const { data, error } = await supabase
    .from('time_logs')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTimeLog(
  supabase: Client,
  id: string,
  update: TablesUpdate<'time_logs'>
): Promise<TimeLog> {
  const { data, error } = await supabase
    .from('time_logs')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTimeLog(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from('time_logs').delete().eq('id', id)
  if (error) throw error
}
