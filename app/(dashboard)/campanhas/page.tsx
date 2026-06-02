import { createClient } from '@/lib/supabase/server'
import { CampanhasClient } from '@/components/modules/campanhas/CampanhasClient'

export default async function CampanhasPage() {
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('email_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  return <CampanhasClient campaigns={campaigns ?? []} />
}
