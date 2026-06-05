import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WhiteLabelClient } from '@/components/modules/whitelabel/WhiteLabelClient'

export default async function WhiteLabelPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: appUser } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', appUser?.organization_id ?? '')
    .single()

  return <WhiteLabelClient org={org} />
}
