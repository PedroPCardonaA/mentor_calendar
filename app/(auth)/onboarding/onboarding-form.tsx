'use client'

import { useActionState } from 'react'
import { onboardingAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type OnboardingState = { error?: string } | null

interface Props {
  defaultName: string
}

export function OnboardingForm({ defaultName }: Props) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(onboardingAction, null)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Display name</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          defaultValue={defaultName}
          required
          placeholder="Your full name"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : "Let's go →"}
      </Button>
    </form>
  )
}
