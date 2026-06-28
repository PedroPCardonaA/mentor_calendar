'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, Check, Calendar } from 'lucide-react'
import { setActiveCalendarAction } from '@/app/(app)/actions'
import type { CalendarOption } from '@/lib/active-calendar'
import { cn } from '@/lib/utils'

interface Props {
  calendars: CalendarOption[]
  activeOwnerId: string
}

const PERMISSION_LABELS: Record<string, string> = {
  owner: 'mine',
  editor: 'editor',
  viewer: 'viewer',
}

export function CalendarSwitcher({ calendars, activeOwnerId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const active = calendars.find((c) => c.ownerId === activeOwnerId) ?? calendars[0]

  function switchTo(ownerId: string) {
    startTransition(async () => {
      await setActiveCalendarAction(ownerId)
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors outline-none',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          pending && 'opacity-60 pointer-events-none'
        )}
      >
        <Calendar className="h-4 w-4" />
        <span className="max-w-[140px] truncate">{active?.label ?? 'Calendar'}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {calendars.map((cal, i) => (
          <div key={cal.ownerId}>
            {i > 0 && i === calendars.findIndex((c) => c.permission !== 'owner') && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem
              className="flex items-center justify-between gap-2 cursor-pointer"
              onClick={() => switchTo(cal.ownerId)}
            >
              <span className="truncate">{cal.label}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge variant="outline" className="text-[10px] capitalize">
                  {PERMISSION_LABELS[cal.permission] ?? cal.permission}
                </Badge>
                {cal.ownerId === activeOwnerId && <Check className="h-3.5 w-3.5 text-primary" />}
              </div>
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
