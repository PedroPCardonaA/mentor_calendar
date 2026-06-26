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
import type { Profile } from '@/lib/database.types'
import { Calendar, BarChart2, GitCompare, Users, Sparkles, Settings, User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  profile: Profile
}

const STUDENT_NAV = [
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/compare', label: 'Compare', icon: GitCompare },
  { href: '/stats', label: 'Stats', icon: BarChart2 },
  { href: '/plan/generate', label: 'Generate Plan', icon: Sparkles },
]

const MENTOR_NAV = [
  { href: '/mentor', label: 'Students', icon: Users },
  { href: '/stats', label: 'Stats', icon: BarChart2 },
]

export function AppNav({ profile }: Props) {
  const pathname = usePathname()
  const navItems = profile.role === 'mentor' ? MENTOR_NAV : STUDENT_NAV

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={profile.role === 'mentor' ? '/mentor' : '/calendar'} className="font-semibold text-base">
            Mentor Calendar
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Account dropdown — base-ui/react doesn't use asChild; style the trigger directly */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline max-w-[120px] truncate">
              {profile.full_name ?? profile.email ?? 'Account'}
            </span>
            <Badge variant="outline" className="hidden sm:inline-flex text-xs capitalize">
              {profile.role}
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* base-ui Menu.Item accepts children; Link inside renders fine */}
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
