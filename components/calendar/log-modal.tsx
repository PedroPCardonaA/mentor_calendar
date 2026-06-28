'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category, EventType } from '@/lib/database.types'
import type { Occurrence } from '@/lib/recurrence'
import { EVENT_TYPE_LABELS } from '@/lib/format'
import { minutesFromRange } from '@/lib/format'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { toast } from 'sonner'

function dateToLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export interface LogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill from a planned occurrence. Null = unplanned log. */
  occurrence: Occurrence | null
  categories: Category[]
  ownerId: string
  onSuccess: () => void
}

export function LogModal({
  open,
  onOpenChange,
  occurrence,
  categories,
  ownerId,
  onSuccess,
}: LogModalProps) {
  const supabase = createClient()

  const initTitle = occurrence?.title ?? ''
  const initType = (occurrence?.event.event_type as EventType) ?? 'study'
  const initCat = occurrence?.event.category_id ?? '__none__'
  const initStart = occurrence ? dateToLocalInput(occurrence.start) : dateToLocalInput(new Date())
  const initEnd = occurrence?.end ? dateToLocalInput(occurrence.end) : ''

  const [title, setTitle] = useState(initTitle)
  const [eventType, setEventType] = useState<EventType>(initType)
  const [categoryId, setCategoryId] = useState(initCat)
  const [actualStart, setActualStart] = useState(initStart)
  const [actualEnd, setActualEnd] = useState(initEnd)
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSave() {
    if (!actualStart) {
      toast.error('Start time is required')
      return
    }
    setPending(true)
    try {
      const start = new Date(actualStart)
      const end = actualEnd ? new Date(actualEnd) : null
      const minutes = end ? minutesFromRange(start, end) : 0

      const { error } = await supabase.from('time_logs').insert({
        owner_id: ownerId,
        event_id: occurrence?.event.id ?? null,
        occurrence_start: occurrence?.occurrenceStart.toISOString() ?? null,
        category_id: categoryId === '__none__' ? null : categoryId,
        title: title.trim() || null,
        event_type: eventType,
        notes: notes.trim() || null,
        actual_start: start.toISOString(),
        actual_end: end?.toISOString() ?? null,
        actual_minutes: Math.max(0, minutes),
      })
      if (error) throw error

      toast.success(occurrence ? 'Actual time logged' : 'Unplanned log saved')
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save log')
    } finally {
      setPending(false)
    }
  }

  const isPlanned = !!occurrence

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isPlanned ? 'Log actual time' : 'Add unplanned log'}</DialogTitle>
        </DialogHeader>
        {isPlanned && (
          <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Planned: <strong>{occurrence.title}</strong> on {occurrence.start.toLocaleString()}
          </div>
        )}
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="log-title">Title</Label>
            <Input
              id="log-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isPlanned ? occurrence.title : 'What did you work on?'}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={eventType} onValueChange={(v) => v && setEventType(v as EventType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(
                    ([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '__none__')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="log-start">Actual start</Label>
              <Input
                id="log-start"
                type="datetime-local"
                value={actualStart}
                onChange={(e) => setActualStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="log-end">Actual end</Label>
              <Input
                id="log-end"
                type="datetime-local"
                value={actualEnd}
                onChange={(e) => setActualEnd(e.target.value)}
              />
            </div>
          </div>
          {actualStart && actualEnd && new Date(actualEnd) > new Date(actualStart) && (
            <p className="text-xs text-muted-foreground">
              Duration:{' '}
              <strong>{minutesFromRange(new Date(actualStart), new Date(actualEnd))} min</strong>
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="log-notes">Notes</Label>
            <textarea
              id="log-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
            />
          </div>
        </div>
        <DialogFooter showCloseButton>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? 'Saving…' : 'Save log'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
