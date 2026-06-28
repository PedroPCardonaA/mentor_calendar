import Link from 'next/link'
import { Calendar, ClipboardList, BarChart2, Sparkles, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    icon: Calendar,
    title: 'Plan your week',
    description: 'Schedule study sessions on a weekly, daily, or monthly calendar view.',
  },
  {
    icon: ClipboardList,
    title: 'Log what you did',
    description: 'Record time spent on each session so your effort is always counted.',
  },
  {
    icon: BarChart2,
    title: 'Planned vs. actual',
    description: 'See how your planned hours compare to what you actually logged, by category.',
  },
  {
    icon: Sparkles,
    title: 'Auto-generate a plan',
    description: 'Let AI draft a balanced weekly plan based on your goals and past patterns.',
  },
  {
    icon: Share2,
    title: 'Share with your mentor',
    description: 'Invite viewers or editors to your calendar so your mentor stays in the loop.',
  },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col min-h-screen">
      {/* nav */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-sm tracking-tight">Mentor Calendar</span>
          <nav className="flex items-center gap-2">
            {user ? (
              <Link href="/calendar" className={cn(buttonVariants({ size: 'sm' }))}>
                Go to app
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                >
                  Log in
                </Link>
                <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className="flex flex-col items-center justify-center text-center px-6 py-28">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight max-w-2xl leading-tight">
            Study smarter, together.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-lg leading-relaxed">
            Plan your week on a calendar, log what you actually did, and share your progress with
            your mentor — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            {user ? (
              <Link href="/calendar" className={cn(buttonVariants({ size: 'lg' }))}>
                Go to app →
              </Link>
            ) : (
              <>
                <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
                  Get started free
                </Link>
                <Link
                  href="/login"
                  className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </section>

        {/* features */}
        <section className="bg-muted border-t border-border py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-12">Everything you need</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <Card key={title}>
                  <CardHeader>
                    <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/8">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle>{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="border-t border-border py-6 px-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Mentor Calendar
      </footer>
    </div>
  )
}
