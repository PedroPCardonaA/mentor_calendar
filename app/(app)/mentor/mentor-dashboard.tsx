'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Calendar, BarChart2, GitCompare, UserPlus, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface StudentEntry {
  mentorshipId: string
  profile: Profile
}

interface Props {
  mentorId: string
  students: StudentEntry[]
}

export function MentorDashboard({ mentorId, students: initial }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [students, setStudents] = useState<StudentEntry[]>(initial)
  const [addOpen, setAddOpen] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [pending, startTransition] = useTransition()
  const [removeTarget, setRemoveTarget] = useState<StudentEntry | null>(null)

  function handleAdd() {
    if (!emailInput.trim()) { toast.error('Enter a student email'); return }
    startTransition(async () => {
      // Look up the student's profile by email
      const { data: found, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', emailInput.trim())
        .eq('role', 'student')
        .single()

      if (error || !found) {
        toast.error('No student found with that email.')
        return
      }

      // Check if already linked
      if (students.some((s) => s.profile.id === found.id)) {
        toast.error('Already linked to this student.')
        return
      }

      const { data: ms, error: msErr } = await supabase
        .from('mentorships')
        .insert({ mentor_id: mentorId, student_id: found.id })
        .select()
        .single()

      if (msErr) { toast.error(msErr.message); return }

      setStudents((prev) => [...prev, { mentorshipId: ms.id, profile: found as Profile }])
      setEmailInput('')
      setAddOpen(false)
      toast.success(`Linked to ${found.full_name ?? found.email}`)
      router.refresh()
    })
  }

  function handleRemove(entry: StudentEntry) {
    startTransition(async () => {
      const { error } = await supabase
        .from('mentorships')
        .delete()
        .eq('id', entry.mentorshipId)

      if (error) { toast.error(error.message); return }

      setStudents((prev) => prev.filter((s) => s.mentorshipId !== entry.mentorshipId))
      setRemoveTarget(null)
      toast.success('Mentorship removed')
      router.refresh()
    })
  }

  return (
    <>
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {students.length} {students.length === 1 ? 'student' : 'students'}
          </span>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add student
          </Button>
        </div>
        <Separator />
        {students.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No students yet. Add one by email to get started.
          </div>
        ) : (
          <ul className="divide-y">
            {students.map((entry) => (
              <li key={entry.mentorshipId} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {(entry.profile.full_name ?? entry.profile.email ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {entry.profile.full_name ?? entry.profile.email ?? entry.profile.id}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{entry.profile.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/mentor/student/${entry.profile.id}/calendar`}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="View calendar"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Calendar</span>
                    </Link>
                    <Link
                      href={`/mentor/student/${entry.profile.id}/compare`}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Compare"
                    >
                      <GitCompare className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Compare</span>
                    </Link>
                    <Link
                      href={`/stats?student=${entry.profile.id}`}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Stats"
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Stats</span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive ml-1"
                      onClick={() => setRemoveTarget(entry)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add student dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a student</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Enter the student&apos;s email. They must already have a Mentor Calendar account.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="student-email">Student email</Label>
              <Input
                id="student-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="student@example.com"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={handleAdd} disabled={pending}>
              {pending ? 'Linking…' : 'Add student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove mentorship?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You will lose access to{' '}
            <strong>{removeTarget?.profile.full_name ?? removeTarget?.profile.email}</strong>
            &apos;s data. This can be re-added later.
          </p>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={() => removeTarget && handleRemove(removeTarget)}
              disabled={pending}
            >
              {pending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
