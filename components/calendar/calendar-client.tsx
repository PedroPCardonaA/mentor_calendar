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

interface Props {
  categories: Category[]
  studentId: string
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

export function CalendarClient({ categories, studentId }: Props) {
  const supabase = createClient()
  const catMap = new Map(categories.map((c) => [c.id, c]))

  const [calEvents, setCalEvents] = useState<CalEvent[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>({ type: 'create' })

  // Track current date range to re-fetch on changes
  const currentRangeRef = useRef<{ start: Date; end: Date } | null>(null)

  const fetchAndExpand = useCallback(
    async (rangeStart: Date, rangeEnd: Date) => {
      const start = rangeStart.toISOString()
      const end = rangeEnd.toISOString()

      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('student_id', studentId)
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
    [studentId, categories]
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
    setModalMode({ type: 'create', defaultStart: start })
    setModalOpen(true)
  }

  function handleSuccess() {
    if (currentRangeRef.current) {
      fetchAndExpand(currentRangeRef.current.start, currentRangeRef.current.end)
    }
  }

  return (
    <>
      <div className="fc-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          selectable
          selectMirror
          dayMaxEvents
          events={calEvents}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          select={handleDateSelect}
          height="auto"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
        />
      </div>

      {modalOpen && (
        <EventModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          mode={modalMode}
          categories={categories}
          studentId={studentId}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
