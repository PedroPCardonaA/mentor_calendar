'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/database.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface ShareWithOwner {
  id: string
  owner_id: string
  invitee_email: string
  collaborator_id: string | null
  permission: string
  status: string
  created_at: string
  updated_at: string
  owner_profile: Pick<Profile, 'id' | 'full_name' | 'email'>
}

interface Props {
  me: string
  initialShares: ShareWithOwner[]
}

export function InvitationsView({ me, initialShares }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [shares, setShares] = useState<ShareWithOwner[]>(initialShares)
  const [pending, startTransition] = useTransition()

  function accept(shareId: string) {
    startTransition(async () => {
      const { data, error } = await supabase
        .from('calendar_shares')
        .update({
          status: 'accepted',
          collaborator_id: me,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shareId)
        .select()
        .single()

      if (error) { toast.error(error.message); return }
      setShares((prev) =>
        prev.map((s) => s.id === shareId ? { ...s, ...data } : s)
      )
      toast.success('Invitation accepted! Calendar added to your switcher.')
      // Refresh layout so CalendarSwitcher picks up the new entry
      router.refresh()
    })
  }

  function decline(shareId: string) {
    startTransition(async () => {
      const { data, error } = await supabase
        .from('calendar_shares')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', shareId)
        .select()
        .single()

      if (error) { toast.error(error.message); return }
      setShares((prev) =>
        prev.map((s) => s.id === shareId ? { ...s, ...data } : s)
      )
      toast.success('Invitation declined.')
      router.refresh()
    })
  }

  if (shares.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No invitations yet. When someone shares their calendar with you it will appear here.
      </p>
    )
  }

  const pending_ = shares.filter((s) => s.status === 'pending')
  const others = shares.filter((s) => s.status !== 'pending')

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      {pending_.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Pending</p>
          {pending_.map((share) => (
            <InviteCard key={share.id} share={share} onAccept={accept} onDecline={decline} disabled={pending} />
          ))}
        </div>
      )}
      {others.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Past</p>
          {others.map((share) => (
            <InviteCard key={share.id} share={share} onAccept={accept} onDecline={decline} disabled={pending} />
          ))}
        </div>
      )}
    </div>
  )
}

function InviteCard({
  share,
  onAccept,
  onDecline,
  disabled,
}: {
  share: ShareWithOwner
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  disabled: boolean
}) {
  const ownerName = share.owner_profile?.full_name ?? share.owner_profile?.email ?? share.owner_id.slice(0, 8)

  return (
    <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
      <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{ownerName}&apos;s calendar</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <Badge variant="outline" className="text-[10px] capitalize">{share.permission}</Badge>
          {share.status === 'pending' && (
            <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 flex items-center gap-0.5">
              <Clock className="h-3 w-3" />pending
            </Badge>
          )}
          {share.status === 'accepted' && (
            <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 flex items-center gap-0.5">
              <CheckCircle2 className="h-3 w-3" />accepted
            </Badge>
          )}
          {share.status === 'declined' && (
            <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700 flex items-center gap-0.5">
              <XCircle className="h-3 w-3" />declined
            </Badge>
          )}
        </div>
      </div>
      {share.status === 'pending' && (
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={() => onAccept(share.id)}
            disabled={disabled}
            className="gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Accept
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDecline(share.id)}
            disabled={disabled}
            className="text-destructive border-destructive/40 hover:bg-destructive/10 gap-1"
          >
            <XCircle className="h-3.5 w-3.5" />
            Decline
          </Button>
        </div>
      )}
    </div>
  )
}
