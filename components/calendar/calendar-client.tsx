'use client'

import { useState, useCallback, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import type { EventClickArg, DateSelectArg, DatesSetArg } from '@fullcalendar/core'
import { createClient } from '@/lib/supabase/client'
import { expandOccurrences } from '@/lib/recurrence'
import type { Occurrence } from '@/lib/recurrence'
import { EVENT_TYPE_COLORS } from '@/lib/format'
import type { Category, Event, EventException, EventType } from '@/lib/database.types'
import { EventModal, type ModalMode } from './event-modal'
import { LogModal } from './log-modal'
import { Button } from '@/components/ui/button'
import { ClipboardList } from 'lucide-react'

interface Props {
  categories: Category[]
  ownerId: string
  canEdit: boolean
}

interface CalEvent {
  id: string
  title: string
  start: Date
  end?: Date
  backgroundColor: string
  borderColor: string
  extendedProps: { occurrence: Occurrence }
}

export function CalendarClient({ categories, ownerId, canEdit }: Props) {
  const supabase = createClient()
  const catMap = new Map(categories.map((c) => [c.id, c]))

  const [calEvents, setCalEvents] = useState<CalEvent[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>({ type: 'create' })
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [logOccurrence, setLogOccurrence] = useState<Occurrence | null>(null)

  const currentRangeRef = useRef<{ start: Date; end: Date } | null>(null)

  const fetchAndExpand = useCallback(
    async (rangeStart: Date, rangeEnd: Date) => {
      const start = rangeStart.toISOString()
      const end = rangeEnd.toISOString()

      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('owner_id', ownerId)
        .or(
          `and(is_recurring.eq.false,start_at.gte.${start},start_at.lte.${end}),` +
            `and(is_recurring.eq.true,start_at.lte.${end},or(recurrence_until.is.null,recurrence_until.gte.${start}))`
        )

      const events: Event[] = eventsData ?? []

      if (events.length === 0) {
        setCalEvents([])
        return
      }

      const { data: excData } = await supabase
        .from('event_exceptions')
        .select('*')
        .in('event_id', events.map((e) => e.id))

      const exceptions: EventException[] = excData ?? []
      const occurrences = expandOccurrences(events, exceptions, rangeStart, rangeEnd)

      const mapped: CalEvent[] = occurrences.map((occ) => {
        const cat = occ.event.category_id ? catMap.get(occ.event.category_id) : null
        const color = cat?.color ?? EVENT_TYPE_COLORS[occ.event.event_type as EventType] ?? '#6b7280'
        return {
          id: `${occ.event.id}::${occ.occurrenceStart.toISOString()}`,
          title: occ.title,
          start: occ.start,
          end: occ.end ?? undefined,
          backgroundColor: color,
          borderColor: color,
          extendedProps: { occurrence: occ },
        }
      })

      setCalEvents(mapped)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ownerId, categories]
  )

  function handleDatesSet({ start, end }: DatesSetArg) {
    currentRangeRef.current = { start, end }
    fetchAndExpand(start, end)
  }

  function handleEventClick({ event }: EventClickArg) {
    const occ: Occurrence = event.extendedProps.occurrence
    setModalMode({ type: 'edit-occurrence', occurrence: occ })
    setModalOpen(true)
  }

  function handleDateSelect({ start }: DateSelectArg) {
    if (!canEdit) return
    setModalMode({ type: 'create', defaultStart: start })
    setModalOpen(true)
  }

  function handleSuccess() {
    if (currentRangeRef.current) {
      fetchAndExpand(currentRangeRef.current.start, currentRangeRef.current.end)
    }
  }

  function openUnplannedLog() {
    setLogOccurrence(null)
    setLogModalOpen(true)
  }

  return (
    <>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={openUnplannedLog}>
            <ClipboardList className="h-4 w-4 mr-1.5" />
            Add unplanned log
          </Button>
        </div>
      )}

      <div className="fc-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          selectable={canEdit}
          selectMirror={canEdit}
          dayMaxEvents
          events={calEvents}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          select={handleDateSelect}
          height="auto"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          eventContent={(arg) => {
            const occ: Occurrence = arg.event.extendedProps.occurrence
            return (
              <div className="flex items-center gap-1 w-full overflow-hidden px-1">
                <span className="flex-1 truncate text-xs font-medium">{arg.event.title}</span>
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setLogOccurrence(occ)
                      setLogModalOpen(true)
                    }}
                    title="Log actual time"
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity"
                    style={{ fontSize: 10, lineHeight: 1 }}
                  >
                    📋
                  </button>
                )}
              </div>
            )
          }}
        />
      </div>

      {modalOpen && (
        <EventModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          mode={modalMode}
          categories={categories}
          ownerId={ownerId}
          canEdit={canEdit}
          onSuccess={handleSuccess}
        />
      )}

      {canEdit && (
        <LogModal
          open={logModalOpen}
          onOpenChange={setLogModalOpen}
          occurrence={logOccurrence}
          categories={categories}
          ownerId={ownerId}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
