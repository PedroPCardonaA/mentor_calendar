'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signupAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const full_name = (formData.get('full_name') as string).trim()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = (formData.get('role') as string) || 'student'

  if (!full_name) return { error: 'Full name is required.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // The DB trigger reads role and full_name from raw_user_meta_data
      data: { role, full_name },
    },
  })

  if (error) return { error: error.message }

  // Email confirmation is disabled → session is live; go to onboarding
  redirect('/onboarding')
}
