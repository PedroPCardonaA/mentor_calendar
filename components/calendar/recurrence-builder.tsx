'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY'

const DAYS = [
  { code: 'MO', label: 'Mo' },
  { code: 'TU', label: 'Tu' },
  { code: 'WE', label: 'We' },
  { code: 'TH', label: 'Th' },
  { code: 'FR', label: 'Fr' },
  { code: 'SA', label: 'Sa' },
  { code: 'SU', label: 'Su' },
] as const

export interface RecurrenceValue {
  freq: Freq
  interval: number
  byDay: string[] // day codes, used only for WEEKLY
  until: string // ISO date string 'YYYY-MM-DD' or ''
}

export const DEFAULT_RECURRENCE: RecurrenceValue = {
  freq: 'WEEKLY',
  interval: 1,
  byDay: [],
  until: '',
}

/** Build RRULE string (no DTSTART) from structured value */
export function buildRRule(r: RecurrenceValue): string {
  const parts = [`FREQ=${r.freq}`, `INTERVAL=${r.interval}`]
  if (r.freq === 'WEEKLY' && r.byDay.length > 0) {
    parts.push(`BYDAY=${r.byDay.join(',')}`)
  }
  if (r.until) {
    // Convert 'YYYY-MM-DD' to RRULE UNTIL format
    const d = new Date(r.until + 'T23:59:59Z')
    const until = d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
    parts.push(`UNTIL=${until}`)
  }
  return parts.join(';')
}

/** Parse a stored RRULE string back into a RecurrenceValue */
export function parseRRule(rrule: string): RecurrenceValue {
  const result: RecurrenceValue = { ...DEFAULT_RECURRENCE }
  const parts = rrule.split(';')
  for (const part of parts) {
    const [key, val] = part.split('=')
    if (key === 'FREQ') result.freq = val as Freq
    if (key === 'INTERVAL') result.interval = parseInt(val, 10) || 1
    if (key === 'BYDAY') result.byDay = val.split(',')
    if (key === 'UNTIL' && val) {
      // Convert RRULE UNTIL (20261231T235959Z) back to YYYY-MM-DD
      const y = val.slice(0, 4)
      const m = val.slice(4, 6)
      const d = val.slice(6, 8)
      result.until = `${y}-${m}-${d}`
    }
  }
  return result
}

interface Props {
  value: RecurrenceValue
  onChange: (v: RecurrenceValue) => void
}

export function RecurrenceBuilder({ value, onChange }: Props) {
  function set<K extends keyof RecurrenceValue>(k: K, v: RecurrenceValue[K]) {
    onChange({ ...value, [k]: v })
  }

  function toggleDay(code: string) {
    const next = value.byDay.includes(code)
      ? value.byDay.filter((d) => d !== code)
      : [...value.byDay, code]
    set('byDay', next)
  }

  return (
    <div className="flex flex-col gap-3 p-3 rounded-lg border bg-muted/30">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Repeats</Label>
          <Select value={value.freq} onValueChange={(v) => v && set('freq', v as Freq)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rrule-interval" className="text-xs">
            Every
          </Label>
          <div className="flex items-center gap-1.5">
            <Input
              id="rrule-interval"
              type="number"
              min={1}
              max={99}
              value={value.interval}
              onChange={(e) => set('interval', Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-16"
            />
            <span className="text-sm text-muted-foreground">
              {value.freq === 'DAILY' ? 'days' : value.freq === 'WEEKLY' ? 'weeks' : 'months'}
            </span>
          </div>
        </div>
      </div>

      {value.freq === 'WEEKLY' && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">On days</Label>
          <div className="flex gap-1">
            {DAYS.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => toggleDay(code)}
                className={`h-7 w-7 rounded-full text-xs font-medium transition-colors ${
                  value.byDay.includes(code)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rrule-until" className="text-xs">
          Ends on <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="rrule-until"
          type="date"
          value={value.until}
          onChange={(e) => set('until', e.target.value)}
          className="w-40"
        />
      </div>
    </div>
  )
}
