'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function onboardingAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const full_name = (formData.get('full_name') as string).trim()
  if (!full_name) return { error: 'Display name is required.' }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }

  redirect('/calendar')
}
