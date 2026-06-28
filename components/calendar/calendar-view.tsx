'use client'

import dynamic from 'next/dynamic'
import type { Category } from '@/lib/database.types'

// FullCalendar accesses DOM on import — disable SSR
const CalendarClient = dynamic(() => import('./calendar-client').then((m) => m.CalendarClient), {
  ssr: false,
  loading: () => (
    <div className="h-96 flex items-center justify-center text-muted-foreground text-sm">
      Loading calendar…
    </div>
  ),
})

interface Props {
  categories: Category[]
  ownerId: string
  canEdit: boolean
}

export function CalendarView({ categories, ownerId, canEdit }: Props) {
  return <CalendarClient categories={categories} ownerId={ownerId} canEdit={canEdit} />
}
