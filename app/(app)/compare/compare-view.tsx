'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { expandOccurrences } from '@/lib/recurrence'
import type { Occurrence } from '@/lib/recurrence'
import type { Category, Event, EventException, TimeLog, EventType } from '@/lib/database.types'
import { EVENT_TYPE_COLORS, formatDateRange, formatMinutes, EVENT_TYPE_LABELS } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'
import { format, startOfWeek, endOfWeek } from 'date-fns'

interface Props {
  categories: Category[]
  ownerId: string
}

interface CompareRow {
  type: 'planned' | 'actual' | 'matched'
  occurrence?: Occurrence
  log?: TimeLog
  matched: boolean
  missed: boolean
  unplanned: boolean
}

function buildRows(occs: Occurrence[], logs: TimeLog[]): CompareRow[] {
  const rows: CompareRow[] = []

  // Build a lookup from (event_id, occurrence_start ISO) → log
  const logByKey = new Map<string, TimeLog>()
  const unmatchedLogs = new Set<string>()

  for (const log of logs) {
    if (log.event_id && log.occurrence_start) {
      logByKey.set(`${log.event_id}::${log.occurrence_start}`, log)
    } else {
      unmatchedLogs.add(log.id)
    }
  }

  for (const occ of occs) {
    const key = `${occ.event.id}::${occ.occurrenceStart.toISOString()}`
    const log = logByKey.get(key)
    if (log) {
      rows.push({
        type: 'matched',
        occurrence: occ,
        log,
        matched: true,
        missed: false,
        unplanned: false,
      })
      logByKey.delete(key)
    } else {
      rows.push({
        type: 'planned',
        occurrence: occ,
        matched: false,
        missed: true,
        unplanned: false,
      })
    }
  }

  // Remaining logs are unplanned
  for (const log of logs) {
    if (unmatchedLogs.has(log.id)) {
      rows.push({ type: 'actual', log, matched: false, missed: false, unplanned: true })
    }
  }

  // Remaining matched-key logs (planned events, log was matched by key but occ may be outside range)
  for (const log of logByKey.values()) {
    rows.push({ type: 'actual', log, matched: false, missed: false, unplanned: false })
  }

  return rows.sort((a, b) => {
    const aTime =
      a.occurrence?.start ??
      (a.log?.actual_start ? new Date(a.log.actual_start) : new Date(a.log?.logged_at ?? 0))
    const bTime =
      b.occurrence?.start ??
      (b.log?.actual_start ? new Date(b.log.actual_start) : new Date(b.log?.logged_at ?? 0))
    return aTime.getTime() - bTime.getTime()
  })
}

export function CompareView({ categories, ownerId }: Props) {
  const supabase = createClient()
  const catMap = new Map(categories.map((c) => [c.id, c]))

  const now = new Date()
  const [startDate, setStartDate] = useState(
    format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  )
  const [endDate, setEndDate] = useState(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  const [rows, setRows] = useState<CompareRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [pending, startTransition] = useTransition()

  function load() {
    startTransition(async () => {
      const rangeStart = new Date(startDate + 'T00:00:00')
      const rangeEnd = new Date(endDate + 'T23:59:59')

      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('owner_id', ownerId)
        .or(
          `and(is_recurring.eq.false,start_at.gte.${rangeStart.toISOString()},start_at.lte.${rangeEnd.toISOString()}),` +
            `and(is_recurring.eq.true,start_at.lte.${rangeEnd.toISOString()},or(recurrence_until.is.null,recurrence_until.gte.${rangeStart.toISOString()}))`,
        )

      const events: Event[] = eventsData ?? []

      const { data: excData } = await supabase
        .from('event_exceptions')
        .select('*')
        .in('event_id', events.map((e) => e.id).concat(['__noop__']))

      const exceptions: EventException[] = excData ?? []
      const occs = expandOccurrences(events, exceptions, rangeStart, rangeEnd)

      const { data: logsData } = await supabase
        .from('time_logs')
        .select('*')
        .eq('owner_id', ownerId)
        .gte('logged_at', rangeStart.toISOString())
        .lte('logged_at', rangeEnd.toISOString())

      const logs: TimeLog[] = logsData ?? []
      setRows(buildRows(occs, logs))
      setLoaded(true)
    })
  }

  const planned = rows.filter((r) => r.type === 'planned' || r.type === 'matched')
  const actual = rows.filter((r) => r.type === 'actual' || r.type === 'matched')
  const missed = rows.filter((r) => r.missed)
  const unplanned = rows.filter((r) => r.unplanned)
  const matched = rows.filter((r) => r.matched)

  const totalPlannedMin = planned.reduce((sum, r) => {
    if (!r.occurrence) return sum
    const dur = r.occurrence.end
      ? Math.round((r.occurrence.end.getTime() - r.occurrence.start.getTime()) / 60000)
      : 0
    return sum + dur
  }, 0)

  const totalActualMin = rows.reduce((sum, r) => sum + (r.log?.actual_minutes ?? 0), 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Date range picker */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cmp-start">From</Label>
          <Input
            id="cmp-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cmp-end">To</Label>
          <Input
            id="cmp-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={load} disabled={pending}>
          {pending ? 'Loading…' : 'Compare'}
        </Button>
      </div>

      {loaded && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
              label="Matched"
              value={matched.length}
            />
            <StatCard
              icon={<XCircle className="h-4 w-4 text-destructive" />}
              label="Missed"
              value={missed.length}
            />
            <StatCard
              icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
              label="Unplanned"
              value={unplanned.length}
            />
            <StatCard
              icon={<Clock className="h-4 w-4 text-primary" />}
              label="Adherence"
              value={
                totalPlannedMin > 0
                  ? `${Math.round((totalActualMin / totalPlannedMin) * 100)}%`
                  : '—'
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Planned: {formatMinutes(totalPlannedMin)} · Actual: {formatMinutes(totalActualMin)}
          </p>

          <Separator />

          {/* Row-by-row list */}
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No events or logs in this range.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((row, i) => (
                <CompareRowItem key={i} row={row} catMap={catMap} />
              ))}
            </ul>
          )}
        </>
      )}

      {!loaded && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Pick a date range and click Compare.
        </p>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border bg-card p-3 flex items-center gap-2">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  )
}

function CompareRowItem({ row, catMap }: { row: CompareRow; catMap: Map<string, Category> }) {
  const occ = row.occurrence
  const log = row.log

  const bgClass = row.missed
    ? 'bg-destructive/5 border-destructive/20'
    : row.unplanned
      ? 'bg-amber-50 border-amber-200'
      : 'bg-card border-border'

  const badgeEl = row.matched ? (
    <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">
      Matched
    </Badge>
  ) : row.missed ? (
    <Badge variant="secondary" className="bg-red-100 text-red-700 text-[10px]">
      Missed
    </Badge>
  ) : row.unplanned ? (
    <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]">
      Unplanned
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-[10px]">
      Actual
    </Badge>
  )

  const color = occ
    ? (catMap.get(occ.event.category_id ?? '')?.color ??
      EVENT_TYPE_COLORS[occ.event.event_type as EventType])
    : '#6b7280'

  return (
    <li className={`rounded-xl border p-3 ${bgClass}`}>
      <div className="flex items-start gap-3">
        <span className="h-3 w-3 rounded-full flex-shrink-0 mt-0.5" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">
              {occ?.title ?? log?.title ?? '(untitled)'}
            </span>
            {badgeEl}
            <Badge variant="outline" className="text-[10px] capitalize">
              {
                EVENT_TYPE_LABELS[
                  (occ?.event.event_type ?? log?.event_type ?? 'other') as EventType
                ]
              }
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
            {occ && <span>Planned: {formatDateRange(occ.start, occ.end)}</span>}
            {log && log.actual_start && (
              <span>
                Actual:{' '}
                {formatDateRange(
                  new Date(log.actual_start),
                  log.actual_end ? new Date(log.actual_end) : null,
                )}{' '}
                · {formatMinutes(log.actual_minutes)}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
