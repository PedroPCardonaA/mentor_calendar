'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeStats } from '@/lib/stats'
import type { Category, Event, EventException, TimeLog, EventType } from '@/lib/database.types'
import { EVENT_TYPE_LABELS } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import type { StatsResult } from '@/lib/stats'

interface Props {
  ownerId: string
  initialCategories: Category[]
}

export function StatsView({ ownerId, initialCategories }: Props) {
  const supabase = createClient()

  const now = new Date()
  const defStart = format(startOfWeek(subWeeks(now, 3), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const defEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const [startDate, setStartDate] = useState(defStart)
  const [endDate, setEndDate] = useState(defEnd)
  const [bucket, setBucket] = useState<'week' | 'month'>('week')
  const [categories] = useState<Category[]>(initialCategories)
  const [stats, setStats] = useState<StatsResult | null>(null)
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

      const { data: logsData } = await supabase
        .from('time_logs')
        .select('*')
        .eq('owner_id', ownerId)
        .gte('logged_at', rangeStart.toISOString())
        .lte('logged_at', rangeEnd.toISOString())

      const logs: TimeLog[] = logsData ?? []
      setStats(computeStats(events, exceptions, logs, categories, rangeStart, rangeEnd, bucket))
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stats-start">From</Label>
          <Input
            id="stats-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stats-end">To</Label>
          <Input
            id="stats-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Bucket</Label>
          <Select value={bucket} onValueChange={(v) => v && setBucket(v as 'week' | 'month')}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={load} disabled={pending}>
          {pending ? 'Loading…' : 'Load stats'}
        </Button>
      </div>

      {!stats && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Configure filters above and click Load stats.
        </p>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard label="Total adherence" value={`${stats.totalAdherence}%`} />
            <KpiCard
              label="Planned hours"
              value={stats.byCategory.reduce((s, r) => s + r.plannedHours, 0).toFixed(1) + 'h'}
            />
            <KpiCard
              label="Actual hours"
              value={stats.byCategory.reduce((s, r) => s + r.actualHours, 0).toFixed(1) + 'h'}
            />
          </div>

          <Tabs defaultValue="time">
            <TabsList>
              <TabsTrigger value="time">Over time</TabsTrigger>
              <TabsTrigger value="category">By category</TabsTrigger>
              <TabsTrigger value="type">By type</TabsTrigger>
              <TabsTrigger value="adherence">Adherence</TabsTrigger>
            </TabsList>

            <TabsContent value="time" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Planned vs. actual hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.overTime}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="h" />
                      <Tooltip formatter={(v) => [`${v}h`]} />
                      <Legend />
                      <Bar
                        dataKey="plannedHours"
                        name="Planned"
                        fill="hsl(215 90% 60%)"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="actualHours"
                        name="Actual"
                        fill="hsl(145 60% 45%)"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="category" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Hours by category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.byCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 11 }} unit="h" />
                      <YAxis
                        type="category"
                        dataKey="categoryName"
                        width={100}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip formatter={(v) => [`${v}h`]} />
                      <Legend />
                      <Bar
                        dataKey="plannedHours"
                        name="Planned"
                        fill="hsl(215 90% 60%)"
                        radius={[0, 3, 3, 0]}
                      />
                      <Bar
                        dataKey="actualHours"
                        name="Actual"
                        fill="hsl(145 60% 45%)"
                        radius={[0, 3, 3, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="type" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Hours by event type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={stats.byType.map((r) => ({
                        ...r,
                        label: EVENT_TYPE_LABELS[r.eventType as EventType],
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="h" />
                      <Tooltip formatter={(v) => [`${v}h`]} />
                      <Legend />
                      <Bar
                        dataKey="plannedHours"
                        name="Planned"
                        fill="hsl(215 90% 60%)"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="actualHours"
                        name="Actual"
                        fill="hsl(145 60% 45%)"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adherence" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Adherence & delta by category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground text-xs">
                          <th className="pb-2 font-medium">Category</th>
                          <th className="pb-2 font-medium text-right">Planned</th>
                          <th className="pb-2 font-medium text-right">Actual</th>
                          <th className="pb-2 font-medium text-right">Delta</th>
                          <th className="pb-2 font-medium text-right">Adherence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byAdherence.map((row) => (
                          <tr key={row.categoryId ?? '__none__'} className="border-b last:border-0">
                            <td className="py-1.5 flex items-center gap-1.5">
                              <span
                                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                style={{ background: row.color }}
                              />
                              {row.categoryName}
                            </td>
                            <td className="py-1.5 text-right">{row.plannedHours}h</td>
                            <td className="py-1.5 text-right">{row.actualHours}h</td>
                            <td
                              className={`py-1.5 text-right ${row.deltaHours >= 0 ? 'text-green-600' : 'text-destructive'}`}
                            >
                              {row.deltaHours >= 0 ? '+' : ''}
                              {row.deltaHours}h
                            </td>
                            <td className="py-1.5 text-right">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${row.adherencePct >= 80 ? 'bg-green-100 text-green-700' : row.adherencePct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}
                              >
                                {row.adherencePct}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-0.5">{value}</p>
    </div>
  )
}
