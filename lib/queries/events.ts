import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  Event,
  EventException,
  TablesInsert,
  TablesUpdate,
} from '../database.types'

type Client = SupabaseClient<Database>

/**
 * Fetch events for a calendar owner that could have occurrences in [rangeStart, rangeEnd].
 * - Non-recurring: start_at in range
 * - Recurring: start_at <= rangeEnd AND (recurrence_until IS NULL OR recurrence_until >= rangeStart)
 */
export async function getEvents(
  supabase: Client,
  ownerId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<Event[]> {
  const start = rangeStart.toISOString()
  const end = rangeEnd.toISOString()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('owner_id', ownerId)
    .or(
      `and(is_recurring.eq.false,start_at.gte.${start},start_at.lte.${end}),` +
        `and(is_recurring.eq.true,start_at.lte.${end},or(recurrence_until.is.null,recurrence_until.gte.${start}))`
    )
    .order('start_at')

  if (error) throw error
  return data ?? []
}

/** Fetch event_exceptions for a set of event IDs, optionally bounded by occurrence_start. */
export async function getEventExceptions(
  supabase: Client,
  eventIds: string[],
  rangeStart?: Date,
  rangeEnd?: Date
): Promise<EventException[]> {
  if (eventIds.length === 0) return []

  let query = supabase
    .from('event_exceptions')
    .select('*')
    .in('event_id', eventIds)

  if (rangeStart) query = query.gte('occurrence_start', rangeStart.toISOString())
  if (rangeEnd) query = query.lte('occurrence_start', rangeEnd.toISOString())

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createEvent(
  supabase: Client,
  input: Omit<TablesInsert<'events'>, 'id' | 'created_at' | 'updated_at'>
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEvent(
  supabase: Client,
  id: string,
  update: TablesUpdate<'events'>
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteEvent(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}

/** Upsert an exception for a single occurrence (cancel or override fields). */
export async function upsertEventException(
  supabase: Client,
  input: Omit<TablesInsert<'event_exceptions'>, 'id' | 'created_at'>
): Promise<EventException> {
  const { data, error } = await supabase
    .from('event_exceptions')
    .upsert(input, { onConflict: 'event_id,occurrence_start' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteEventException(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from('event_exceptions').delete().eq('id', id)
  if (error) throw error
}
