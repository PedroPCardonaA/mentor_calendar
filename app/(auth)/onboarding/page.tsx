import { OnboardingForm } from './onboarding-form'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Almost there 👋</CardTitle>
        <CardDescription>Confirm your display name to finish setting up.</CardDescription>
      </CardHeader>
      <CardContent>
        <OnboardingForm
          defaultName={profile?.full_name ?? user.user_metadata?.full_name ?? ''}
          role={(profile?.role ?? user.user_metadata?.role ?? 'student') as 'student' | 'mentor'}
        />
      </CardContent>
    </Card>
  )
}
