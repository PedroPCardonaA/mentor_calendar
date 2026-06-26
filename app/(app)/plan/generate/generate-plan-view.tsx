'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Category, EventType } from '@/lib/database.types'
import type { ProposedEvent, GeneratePlanResponse } from '@/app/api/generate-plan/route'
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Pencil, Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format, startOfWeek, nextMonday } from 'date-fns'

interface DraftItem {
  id: string // local id
  proposed: ProposedEvent
  accepted: boolean
  edited: boolean
  // Editable fields (override proposed)
  title: string
  start_at: string
  end_at: string
}

interface Props {
  studentId: string
  categories: Category[]
}

function getNextMonday(): string {
  const now = new Date()
  const next = nextMonday(startOfWeek(now, { weekStartsOn: 1 }))
  // If today is Monday, use today's week
  const candidateThisWeek = startOfWeek(now, { weekStartsOn: 1 })
  const target = candidateThisWeek >= now ? candidateThisWeek : next
  return format(target, "yyyy-MM-dd'T'00:00:00'Z'")
}

function localDT(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function GeneratePlanView({ studentId, categories }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const catMap = new Map(categories.map((c) => [c.id, c]))

  const [weekStart, setWeekStart] = useState(getNextMonday())
  const [draft, setDraft] = useState<DraftItem[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [genPending, startGen] = useTransition()
  const [savePending, startSave] = useTransition()

  function generate() {
    startGen(async () => {
      const resp = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, week_start: weekStart }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }))
        toast.error(err.error ?? 'Generation failed')
        return
      }
      const data: GeneratePlanResponse = await resp.json()
      const items: DraftItem[] = (data.proposed ?? []).map((p, i) => ({
        id: `draft-${i}`,
        proposed: p,
        accepted: true,
        edited: false,
        title: p.title,
        start_at: p.start_at,
        end_at: p.end_at,
      }))
      setDraft(items)
      toast.success(`${items.length} events proposed`)
    })
  }

  function toggleAccept(id: string) {
    setDraft((prev) => prev?.map((item) => item.id === id ? { ...item, accepted: !item.accepted } : item) ?? null)
  }

  function saveEdit(id: string, fields: { title: string; start_at: string; end_at: string }) {
    setDraft((prev) =>
      prev?.map((item) =>
        item.id === id ? { ...item, ...fields, edited: true } : item
      ) ?? null
    )
    setEditingId(null)
  }

  function acceptAll() {
    setDraft((prev) => prev?.map((item) => ({ ...item, accepted: true })) ?? null)
  }

  function rejectAll() {
    setDraft((prev) => prev?.map((item) => ({ ...item, accepted: false })) ?? null)
  }

  function handleSave() {
    if (!draft) return
    startSave(async () => {
      const toInsert = draft.filter((item) => item.accepted)
      if (toInsert.length === 0) {
        toast.error('No events accepted.')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }

      let inserted = 0
      let skipped = 0

      for (const item of toInsert) {
        // Skip fixture events that already have an event_id (they already exist in DB)
        if (item.proposed.source === 'fixture' && item.proposed.event_id) {
          skipped++
          continue
        }
        // TODO(pedro): verify edge fn response matches ProposedEvent shape; adjust if fields differ

        const { error } = await supabase.from('events').insert({
          student_id: studentId,
          created_by: user.id,
          title: item.title,
          event_type: item.proposed.event_type,
          category_id: item.proposed.category_id,
          start_at: item.start_at,
          end_at: item.end_at,
          is_recurring: false,
        })
        if (error) {
          toast.error(`Failed to insert "${item.title}": ${error.message}`)
          return
        }
        inserted++
      }

      toast.success(`Inserted ${inserted} event${inserted !== 1 ? 's' : ''}${skipped > 0 ? `, skipped ${skipped} existing` : ''}.`)
      setDraft(null)
      router.push('/calendar')
    })
  }

  const acceptedCount = draft?.filter((i) => i.accepted).length ?? 0

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Week picker + generate */}
      <Card>
        <CardHeader><CardTitle className="text-base">Select week</CardTitle></CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="week-start">Week starts (Monday 00:00 UTC)</Label>
            <Input
              id="week-start"
              type="datetime-local"
              value={weekStart.replace('Z', '')}
              onChange={(e) => setWeekStart(e.target.value + ':00Z')}
              className="w-56"
            />
          </div>
          <Button onClick={generate} disabled={genPending}>
            <Sparkles className="h-4 w-4 mr-1.5" />
            {genPending ? 'Generating…' : 'Generate plan'}
          </Button>
        </CardContent>
      </Card>

      {/* Draft list */}
      {draft && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {acceptedCount} of {draft.length} accepted
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={acceptAll}>Accept all</Button>
              <Button variant="outline" size="sm" onClick={rejectAll}>Reject all</Button>
            </div>
          </div>

          <ul className="flex flex-col gap-2">
            {draft.map((item) => (
              <DraftCard
                key={item.id}
                item={item}
                catMap={catMap}
                isEditing={editingId === item.id}
                onToggleAccept={() => toggleAccept(item.id)}
                onEditStart={() => setEditingId(item.id)}
                onEditSave={(fields) => saveEdit(item.id, fields)}
                onEditCancel={() => setEditingId(null)}
              />
            ))}
          </ul>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDraft(null)}>Discard all</Button>
            <Button onClick={handleSave} disabled={savePending || acceptedCount === 0}>
              {savePending ? 'Saving…' : `Accept ${acceptedCount} event${acceptedCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface DraftCardProps {
  item: DraftItem
  catMap: Map<string, Category>
  isEditing: boolean
  onToggleAccept: () => void
  onEditStart: () => void
  onEditSave: (fields: { title: string; start_at: string; end_at: string }) => void
  onEditCancel: () => void
}

function DraftCard({ item, catMap, isEditing, onToggleAccept, onEditStart, onEditSave, onEditCancel }: DraftCardProps) {
  const cat = item.proposed.category_id ? catMap.get(item.proposed.category_id) : null
  const color = cat?.color ?? EVENT_TYPE_COLORS[item.proposed.event_type as EventType] ?? '#6b7280'
  const isFixtureExisting = item.proposed.source === 'fixture' && !!item.proposed.event_id

  const [editTitle, setEditTitle] = useState(item.title)
  const [editStart, setEditStart] = useState(localDT(item.start_at))
  const [editEnd, setEditEnd] = useState(localDT(item.end_at))

  if (isEditing) {
    return (
      <li className="rounded-xl border bg-card p-3 flex flex-col gap-3">
        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Start</Label>
            <Input type="datetime-local" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">End</Label>
            <Input type="datetime-local" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onEditCancel}>Cancel</Button>
          <Button size="sm" onClick={() => onEditSave({
            title: editTitle,
            start_at: editStart + ':00Z',
            end_at: editEnd + ':00Z',
          })}>Save</Button>
        </div>
      </li>
    )
  }

  return (
    <li
      className={`rounded-xl border p-3 transition-opacity ${item.accepted ? '' : 'opacity-50'}`}
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={onToggleAccept}
          className="flex-shrink-0 mt-0.5"
          title={item.accepted ? 'Click to reject' : 'Click to accept'}
        >
          {item.accepted ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm flex items-center gap-2">
            {item.title}
            {item.edited && <Badge variant="secondary" className="text-[10px]">Edited</Badge>}
            {isFixtureExisting && (
              <Badge variant="outline" className="text-[10px] flex items-center gap-0.5">
                <AlertCircle className="h-3 w-3" />Already exists
              </Badge>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(item.start_at).toLocaleString()} → {new Date(item.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {cat && <span> · {cat.name}</span>}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="secondary" className="text-[10px] capitalize">
              {EVENT_TYPE_LABELS[item.proposed.event_type as EventType]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {item.proposed.source === 'fixture' ? '📌 fixture' : '✨ generated'}
            </Badge>
          </div>
        </div>
        <button
          onClick={onEditStart}
          className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </li>
  )
}
