'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category, EventType } from '@/lib/database.types'
import type { Occurrence } from '@/lib/recurrence'
import { EVENT_TYPE_LABELS } from '@/lib/format'
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
import { RecurrenceBuilder, buildRRule, parseRRule, DEFAULT_RECURRENCE } from './recurrence-builder'
import type { RecurrenceValue } from './recurrence-builder'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

export type ModalMode =
  | { type: 'create'; defaultStart?: Date }
  | { type: 'edit-occurrence'; occurrence: Occurrence }
  | { type: 'edit-event'; occurrence: Occurrence }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: ModalMode
  categories: Category[]
  ownerId: string
  canEdit: boolean
  onSuccess: () => void
}

function dateToLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToISO(s: string): string {
  return new Date(s).toISOString()
}

export function EventModal({
  open,
  onOpenChange,
  mode,
  categories,
  ownerId,
  canEdit,
  onSuccess,
}: Props) {
  const supabase = createClient()

  const existingEvent = mode.type !== 'create' ? mode.occurrence.event : null
  const existingOcc = mode.type !== 'create' ? mode.occurrence : null

  const initStart =
    mode.type === 'create'
      ? dateToLocalInput(mode.defaultStart ?? new Date())
      : dateToLocalInput(existingOcc!.start)

  const initEnd =
    mode.type === 'create' ? '' : existingOcc!.end ? dateToLocalInput(existingOcc!.end) : ''

  const [title, setTitle] = useState(existingOcc?.title ?? '')
  const [eventType, setEventType] = useState<EventType>(
    (existingEvent?.event_type as EventType) ?? 'study',
  )
  const [categoryId, setCategoryId] = useState<string>(existingEvent?.category_id ?? '__none__')
  const [description, setDescription] = useState(existingEvent?.description ?? '')
  const [startAt, setStartAt] = useState(initStart)
  const [endAt, setEndAt] = useState(initEnd)
  const [isRecurring, setIsRecurring] = useState(existingEvent?.is_recurring ?? false)
  const [recurrence, setRecurrence] = useState<RecurrenceValue>(
    existingEvent?.rrule ? parseRRule(existingEvent.rrule) : DEFAULT_RECURRENCE,
  )
  const [pending, setPending] = useState(false)

  const isEditOccurrence = mode.type === 'edit-occurrence'
  const readOnly = !canEdit

  async function handleSave() {
    if (readOnly) return
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!startAt) {
      toast.error('Start time is required')
      return
    }
    setPending(true)

    try {
      const catId = categoryId === '__none__' ? null : categoryId
      const start = localInputToISO(startAt)
      const end = endAt ? localInputToISO(endAt) : null
      const rruleStr = isRecurring ? buildRRule(recurrence) : null

      if (isEditOccurrence && existingOcc) {
        const { error } = await supabase.from('event_exceptions').upsert(
          {
            event_id: existingOcc.event.id,
            occurrence_start: existingOcc.occurrenceStart.toISOString(),
            title: title !== existingOcc.event.title ? title : null,
            start_at: start !== existingOcc.event.start_at ? start : null,
            end_at: end,
            is_cancelled: false,
          },
          { onConflict: 'event_id,occurrence_start' },
        )
        if (error) throw error
        toast.success('Occurrence updated')
      } else if (mode.type === 'edit-event' && existingEvent) {
        const { error } = await supabase
          .from('events')
          .update({
            title: title.trim(),
            event_type: eventType,
            category_id: catId,
            description: description || null,
            start_at: start,
            end_at: end,
            is_recurring: isRecurring,
            rrule: rruleStr,
            recurrence_until: recurrence.until
              ? new Date(recurrence.until + 'T23:59:59Z').toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingEvent.id)
        if (error) throw error
        toast.success('Event updated')
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const { error } = await supabase.from('events').insert({
          owner_id: ownerId,
          created_by: user!.id,
          title: title.trim(),
          event_type: eventType,
          category_id: catId,
          description: description || null,
          start_at: start,
          end_at: end,
          is_recurring: isRecurring,
          rrule: rruleStr,
          recurrence_until: recurrence.until
            ? new Date(recurrence.until + 'T23:59:59Z').toISOString()
            : null,
        })
        if (error) throw error
        toast.success('Event created')
      }

      onSuccess()
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setPending(false)
    }
  }

  async function handleDeleteOccurrence() {
    if (readOnly || !existingOcc) return
    setPending(true)
    try {
      const { error } = await supabase.from('event_exceptions').upsert(
        {
          event_id: existingOcc.event.id,
          occurrence_start: existingOcc.occurrenceStart.toISOString(),
          is_cancelled: true,
        },
        { onConflict: 'event_id,occurrence_start' },
      )
      if (error) throw error
      toast.success('Occurrence cancelled')
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel')
    } finally {
      setPending(false)
    }
  }

  async function handleDeleteEvent() {
    if (readOnly || !existingEvent) return
    setPending(true)
    try {
      const { error } = await supabase.from('events').delete().eq('id', existingEvent.id)
      if (error) throw error
      toast.success('Event deleted')
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setPending(false)
    }
  }

  const modalTitle =
    mode.type === 'create'
      ? 'New event'
      : isEditOccurrence
        ? 'View / edit occurrence'
        : 'Edit event'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{readOnly ? 'View event' : modalTitle}</DialogTitle>
        </DialogHeader>

        {readOnly && (
          <div className="rounded-md bg-muted border px-3 py-2 text-xs text-muted-foreground">
            You have <strong>viewer</strong> access to this calendar — editing is disabled.
          </div>
        )}

        <div className="flex flex-col gap-4 py-2">
          {existingEvent?.is_recurring && mode.type === 'edit-occurrence' && !readOnly && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              Editing only <strong>this occurrence</strong>. Changes won&apos;t affect other
              repeats.
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ev-title">Title</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              disabled={isEditOccurrence || readOnly}
            />
          </div>

          {!isEditOccurrence && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Type</Label>
                  <Select
                    value={eventType}
                    onValueChange={(v) => v && setEventType(v as EventType)}
                    disabled={readOnly}
                  >
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
                  <Select
                    value={categoryId}
                    onValueChange={(v) => setCategoryId(v ?? '__none__')}
                    disabled={readOnly}
                  >
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ev-desc">Description</Label>
                <textarea
                  id="ev-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional notes"
                  disabled={readOnly}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none disabled:opacity-50"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-start">Start</Label>
              <Input
                id="ev-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ev-end">End</Label>
              <Input
                id="ev-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>

          {!isEditOccurrence && !readOnly && (
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="accent-primary"
                />
                Repeat this event
              </label>
              {isRecurring && <RecurrenceBuilder value={recurrence} onChange={setRecurrence} />}
            </div>
          )}
        </div>

        <DialogFooter>
          {!readOnly && existingOcc && (
            <div className="flex gap-2 mr-auto">
              {existingEvent?.is_recurring && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteOccurrence}
                  disabled={pending}
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  This occurrence
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteEvent}
                disabled={pending}
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {existingEvent?.is_recurring ? 'All occurrences' : 'Delete event'}
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button onClick={handleSave} disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
