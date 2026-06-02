import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AgencyOnboarding } from '@/components/onboarding/AgencyOnboarding'

export default async function AgencyOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, primary_color, secondary_color, tagline, logo_url')
    .eq('id', (await supabase.from('users').select('organization_id').eq('id', user.id).single()).data?.organization_id ?? '')
    .single()

  return <AgencyOnboarding initialOrgName={org?.name ?? ''} orgId={org?.id ?? ''} />
}
