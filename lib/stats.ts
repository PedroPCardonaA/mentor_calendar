import type { Event, EventException, TimeLog, Category, EventType } from './database.types'
import { expandOccurrences, type Occurrence } from './recurrence'
import { format, startOfWeek, addWeeks, startOfMonth, addMonths } from 'date-fns'

// ─── Aggregation types ──────────────────────────────────────────────────────

export interface HoursByCategory {
  categoryId: string | null
  categoryName: string
  color: string
  plannedHours: number
  actualHours: number
}

export interface HoursByType {
  eventType: EventType
  plannedHours: number
  actualHours: number
}

export interface HoursOverTime {
  label: string // week or month label
  plannedHours: number
  actualHours: number
}

export interface AdherenceByCategory {
  categoryId: string | null
  categoryName: string
  color: string
  adherencePct: number
  plannedHours: number
  actualHours: number
  deltaHours: number
}

export interface StatsResult {
  byCategory: HoursByCategory[]
  byType: HoursByType[]
  overTime: HoursOverTime[]
  totalAdherence: number
  byAdherence: AdherenceByCategory[]
}

const UNCATEGORIZED = { id: null, name: 'Uncategorized', color: '#6b7280' }
const EVENT_TYPES: EventType[] = ['deadline', 'lecture', 'lab', 'study', 'other']

// ─── Main aggregation ───────────────────────────────────────────────────────

export function computeStats(
  events: Event[],
  exceptions: EventException[],
  logs: TimeLog[],
  categories: Category[],
  rangeStart: Date,
  rangeEnd: Date,
  bucket: 'week' | 'month' = 'week',
): StatsResult {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const occs = expandOccurrences(events, exceptions, rangeStart, rangeEnd)

  // Map occurrence_start ISO to occurrence for matching
  const occByKey = new Map<string, Occurrence>()
  for (const occ of occs) {
    occByKey.set(`${occ.event.id}::${occ.occurrenceStart.toISOString()}`, occ)
  }

  // Planned minutes per category/type
  const plannedByCat = new Map<string | null, number>()
  const plannedByType = new Map<string, number>()
  for (const occ of occs) {
    const dur = occ.end ? Math.round((occ.end.getTime() - occ.start.getTime()) / 60000) : 0
    const catId = occ.event.category_id ?? null
    plannedByCat.set(catId, (plannedByCat.get(catId) ?? 0) + dur)
    plannedByType.set(occ.event.event_type, (plannedByType.get(occ.event.event_type) ?? 0) + dur)
  }

  // Actual minutes per category/type
  const actualByCat = new Map<string | null, number>()
  const actualByType = new Map<string, number>()
  for (const log of logs) {
    const catId = log.category_id ?? null
    actualByCat.set(catId, (actualByCat.get(catId) ?? 0) + log.actual_minutes)
    actualByType.set(log.event_type, (actualByType.get(log.event_type) ?? 0) + log.actual_minutes)
  }

  // Merge keys
  const catKeys = new Set([...plannedByCat.keys(), ...actualByCat.keys()])
  const byCategory: HoursByCategory[] = [...catKeys]
    .map((catId) => {
      const cat = catId ? (catMap.get(catId) ?? null) : null
      const info = cat ?? UNCATEGORIZED
      return {
        categoryId: catId,
        categoryName: info.name,
        color: info.color ?? '#6b7280',
        plannedHours: Math.round(((plannedByCat.get(catId) ?? 0) / 60) * 100) / 100,
        actualHours: Math.round(((actualByCat.get(catId) ?? 0) / 60) * 100) / 100,
      }
    })
    .sort((a, b) => b.plannedHours - a.plannedHours)

  const byType: HoursByType[] = EVENT_TYPES.map((et) => ({
    eventType: et,
    plannedHours: Math.round(((plannedByType.get(et) ?? 0) / 60) * 100) / 100,
    actualHours: Math.round(((actualByType.get(et) ?? 0) / 60) * 100) / 100,
  })).filter((r) => r.plannedHours > 0 || r.actualHours > 0)

  // Over-time bucketing
  const overTime = buildOverTime(occs, logs, rangeStart, rangeEnd, bucket)

  // Totals
  const totalPlanned = [...plannedByCat.values()].reduce((s, v) => s + v, 0)
  const totalActual = logs.reduce((s, l) => s + l.actual_minutes, 0)
  const totalAdherence = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0

  const byAdherence: AdherenceByCategory[] = byCategory.map((row) => ({
    ...row,
    adherencePct: row.plannedHours > 0 ? Math.round((row.actualHours / row.plannedHours) * 100) : 0,
    deltaHours: Math.round((row.actualHours - row.plannedHours) * 100) / 100,
  }))

  return { byCategory, byType, overTime, totalAdherence, byAdherence }
}

function buildOverTime(
  occs: Occurrence[],
  logs: TimeLog[],
  rangeStart: Date,
  rangeEnd: Date,
  bucket: 'week' | 'month',
): HoursOverTime[] {
  const buckets = new Map<string, { planned: number; actual: number }>()

  function bucketKey(d: Date): string {
    if (bucket === 'week') {
      return format(startOfWeek(d, { weekStartsOn: 1 }), 'MMM d')
    }
    return format(startOfMonth(d), 'MMM yyyy')
  }

  for (const occ of occs) {
    const key = bucketKey(occ.start)
    const dur = occ.end ? Math.round((occ.end.getTime() - occ.start.getTime()) / 60000) : 0
    const prev = buckets.get(key) ?? { planned: 0, actual: 0 }
    buckets.set(key, { ...prev, planned: prev.planned + dur })
  }

  for (const log of logs) {
    const d = log.actual_start ? new Date(log.actual_start) : new Date(log.logged_at)
    const key = bucketKey(d)
    const prev = buckets.get(key) ?? { planned: 0, actual: 0 }
    buckets.set(key, { ...prev, actual: prev.actual + log.actual_minutes })
  }

  // Generate ordered bucket labels
  const labels: string[] = []
  let cursor =
    bucket === 'week' ? startOfWeek(rangeStart, { weekStartsOn: 1 }) : startOfMonth(rangeStart)
  while (cursor <= rangeEnd) {
    labels.push(bucketKey(cursor))
    cursor = bucket === 'week' ? addWeeks(cursor, 1) : addMonths(cursor, 1)
  }

  return labels.map((label) => {
    const b = buckets.get(label) ?? { planned: 0, actual: 0 }
    return {
      label,
      plannedHours: Math.round((b.planned / 60) * 100) / 100,
      actualHours: Math.round((b.actual / 60) * 100) / 100,
    }
  })
}
