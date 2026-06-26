import { format, formatDuration, intervalToDuration } from 'date-fns'
import type { EventType, CategoryKind } from './database.types'

// ─── Domain labels ────────────────────────────────────────────────────────────

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  deadline: 'Deadline',
  lecture: 'Lecture',
  lab: 'Lab',
  study: 'Study',
  other: 'Other',
}

/** Default colors for event_type when no category color is available */
export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  deadline: '#ef4444',
  lecture: '#3b82f6',
  lab: '#8b5cf6',
  study: '#10b981',
  other: '#6b7280',
}

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  deadline: '🔴',
  lecture: '📖',
  lab: '🧪',
  study: '📚',
  other: '📌',
}

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  course: 'Course',
  project: 'Project',
  other: 'Other',
}

// ─── Date / time formatting ────────────────────────────────────────────────────

export function formatDateShort(date: Date): string {
  return format(date, 'MMM d, yyyy')
}

export function formatDateTime(date: Date): string {
  return format(date, 'PPp')
}

export function formatDateRange(start: Date, end: Date | null): string {
  if (!end) return format(start, 'PPp')
  // Same day: show date once
  if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
    return `${format(start, 'PPp')} – ${format(end, 'p')}`
  }
  return `${format(start, 'PPp')} – ${format(end, 'PPp')}`
}

// ─── Duration helpers ──────────────────────────────────────────────────────────

/** Round minutes from two Date values. */
export function minutesFromRange(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000)
}

/** Human-readable duration string from a minute count. */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0 min'
  const dur = intervalToDuration({ start: 0, end: minutes * 60_000 })
  return formatDuration(dur, { format: ['hours', 'minutes'] }) || '0 min'
}

/** Hours as a decimal, rounded to 2 decimal places. */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100
}

// ─── Color helpers ─────────────────────────────────────────────────────────────

/** Parse a #rrggbb hex string to RGB components. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

/** Return a CSS rgba string from a hex color and alpha [0–1]. */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/** Determine whether white or black text has better contrast on a given bg. */
export function contrastColor(bgHex: string): '#ffffff' | '#000000' {
  const rgb = hexToRgb(bgHex)
  if (!rgb) return '#ffffff'
  // Perceived luminance (sRGB)
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}
