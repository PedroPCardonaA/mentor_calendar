import { rrulestr } from 'rrule'
import type { Event, EventException } from './database.types'

export interface Occurrence {
  event: Event
  /** The canonical start of this occurrence per the RRULE expansion */
  occurrenceStart: Date
  /** Effective start (may be overridden by an event_exception) */
  start: Date
  /** Effective end, or null for open-ended events */
  end: Date | null
  isException: boolean
  isCancelled: boolean
  title: string
}

/** Convert an ISO 8601 string to an iCalendar DTSTART value (YYYYMMDDTHHMMSSZ). */
function toICAL(isoString: string): string {
  return isoString.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Expand a list of events (and their exceptions) into concrete occurrences
 * within [rangeStart, rangeEnd] (inclusive).
 *
 * Single events are included when `start_at` falls in the range.
 * Recurring events are expanded via the stored RRULE; exceptions are applied
 * (cancelled occurrences dropped, overridden fields substituted).
 */
export function expandOccurrences(
  events: Event[],
  exceptions: EventException[],
  rangeStart: Date,
  rangeEnd: Date,
): Occurrence[] {
  // Build lookup by (event_id, occurrence_start ISO string)
  const exceptionMap = new Map<string, EventException>()
  for (const exc of exceptions) {
    exceptionMap.set(`${exc.event_id}::${exc.occurrence_start}`, exc)
  }

  const result: Occurrence[] = []

  for (const event of events) {
    if (event.is_recurring && event.rrule) {
      const dtstart = toICAL(event.start_at)
      let rule
      try {
        rule = rrulestr(`DTSTART:${dtstart}\nRRULE:${event.rrule}`)
      } catch {
        // Malformed rrule — skip silently, treat as non-recurring
        const eventStart = new Date(event.start_at)
        if (eventStart >= rangeStart && eventStart <= rangeEnd) {
          result.push(makeSingleOccurrence(event, eventStart))
        }
        continue
      }

      const occurrenceDates = rule.between(rangeStart, rangeEnd, true)

      for (const occ of occurrenceDates) {
        const occKey = `${event.id}::${occ.toISOString()}`
        const exc = exceptionMap.get(occKey)

        if (exc?.is_cancelled) continue

        const originalDuration =
          event.end_at != null
            ? new Date(event.end_at).getTime() - new Date(event.start_at).getTime()
            : null

        const effectiveStart = exc?.start_at ? new Date(exc.start_at) : occ
        const effectiveEnd =
          exc?.end_at != null
            ? new Date(exc.end_at)
            : originalDuration !== null
              ? new Date(effectiveStart.getTime() + originalDuration)
              : null

        result.push({
          event,
          occurrenceStart: occ,
          start: effectiveStart,
          end: effectiveEnd,
          isException: !!exc,
          isCancelled: false,
          title: exc?.title ?? event.title,
        })
      }
    } else {
      const eventStart = new Date(event.start_at)
      if (eventStart >= rangeStart && eventStart <= rangeEnd) {
        result.push(makeSingleOccurrence(event, eventStart))
      }
    }
  }

  return result.sort((a, b) => a.start.getTime() - b.start.getTime())
}

function makeSingleOccurrence(event: Event, start: Date): Occurrence {
  return {
    event,
    occurrenceStart: start,
    start,
    end: event.end_at ? new Date(event.end_at) : null,
    isException: false,
    isCancelled: false,
    title: event.title,
  }
}
