import { createClient } from '@/lib/supabase/server'
import { WhiteLabelClient } from '@/components/modules/whitelabel/WhiteLabelClient'

export default async function WhiteLabelPage() {
  const supabase = await createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .single()

  return <WhiteLabelClient org={org} />
}
