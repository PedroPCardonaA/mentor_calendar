'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CalendarShare, SharePermission, ShareStatus } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Mail, UserCheck, Clock, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  me: string
  initialShares: CalendarShare[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  accepted: <UserCheck className="h-3 w-3" />,
  declined: <XCircle className="h-3 w-3" />,
}

export function SharingView({ me, initialShares }: Props) {
  const supabase = createClient()
  const [shares, setShares] = useState<CalendarShare[]>(initialShares)
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<SharePermission>('editor')
  const [invitePending, startInvite] = useTransition()

  function invite() {
    if (!email.trim()) return
    startInvite(async () => {
      const { data, error } = await supabase
        .from('calendar_shares')
        .insert({
          owner_id: me,
          invitee_email: email.trim().toLowerCase(),
          permission,
          status: 'pending' satisfies ShareStatus,
        })
        .select()
        .single()

      if (error) {
        toast.error(error.message)
        return
      }
      setShares((prev) => [...prev, data])
      setEmail('')
      toast.success(`Invitation sent to ${email.trim()}`)
    })
  }

  async function changePermission(shareId: string, newPerm: SharePermission) {
    const { data, error } = await supabase
      .from('calendar_shares')
      .update({ permission: newPerm, updated_at: new Date().toISOString() })
      .eq('id', shareId)
      .eq('owner_id', me)
      .select()
      .single()

    if (error) {
      toast.error(error.message)
      return
    }
    setShares((prev) => prev.map((s) => (s.id === shareId ? data : s)))
    toast.success('Permission updated')
  }

  async function revoke(shareId: string) {
    const { error } = await supabase
      .from('calendar_shares')
      .delete()
      .eq('id', shareId)
      .eq('owner_id', me)

    if (error) {
      toast.error(error.message)
      return
    }
    setShares((prev) => prev.filter((s) => s.id !== shareId))
    toast.success('Share revoked')
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Invite form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite someone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="collaborator@example.com"
              onKeyDown={(e) => e.key === 'Enter' && invite()}
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>Permission</Label>
              <Select
                value={permission}
                onValueChange={(v) => v && setPermission(v as SharePermission)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor — can create, edit, log</SelectItem>
                  <SelectItem value="viewer">Viewer — read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={invite} disabled={invitePending || !email.trim()}>
              <Mail className="h-4 w-4 mr-1.5" />
              {invitePending ? 'Inviting…' : 'Invite'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing shares */}
      {shares.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No active shares yet. Invite someone above.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shares.map((share) => (
            <li key={share.id} className="rounded-xl border bg-card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{share.invitee_email}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] flex items-center gap-0.5 ${STATUS_COLORS[share.status] ?? ''}`}
                  >
                    {STATUS_ICONS[share.status]}
                    {share.status}
                  </Badge>
                </div>
              </div>
              <Select
                value={share.permission}
                onValueChange={(v) => v && changePermission(share.id, v as SharePermission)}
              >
                <SelectTrigger className="w-28 text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => revoke(share.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                title="Revoke share"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
