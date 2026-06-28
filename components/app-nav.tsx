'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/(app)/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { CalendarSwitcher } from '@/components/calendar-switcher'
import type { Profile } from '@/lib/database.types'
import type { CalendarOption } from '@/lib/active-calendar'
import {
  Calendar,
  BarChart2,
  GitCompare,
  Sparkles,
  Share2,
  Bell,
  Settings,
  User,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  profile: Profile
  calendars: CalendarOption[]
  activeOwnerId: string
  pendingInviteCount: number
}

const NAV_ITEMS = [
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/compare', label: 'Compare', icon: GitCompare },
  { href: '/stats', label: 'Stats', icon: BarChart2 },
  { href: '/plan/generate', label: 'Generate Plan', icon: Sparkles },
  { href: '/sharing', label: 'Sharing', icon: Share2 },
  { href: '/invitations', label: 'Invitations', icon: Bell },
]

export function AppNav({ profile, calendars, activeOwnerId, pendingInviteCount }: Props) {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarSwitcher calendars={calendars} activeOwnerId={activeOwnerId} />

          <div className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors relative',
                  pathname.startsWith(href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{label}</span>
                {href === '/invitations' && pendingInviteCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                    {pendingInviteCount > 9 ? '9+' : pendingInviteCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Account dropdown — base-ui DropdownMenu: no asChild, style trigger directly */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline max-w-[120px] truncate">
              {profile.full_name ?? profile.email ?? 'Account'}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="p-0">
              <Link
                href="/settings/categories"
                className="flex items-center gap-2 w-full px-1.5 py-1"
              >
                <Settings className="h-4 w-4" />
                Categories
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" className="p-0">
              <form action={logoutAction} className="w-full">
                <button
                  type="submit"
                  className="flex items-center gap-2 w-full px-1.5 py-1 text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
