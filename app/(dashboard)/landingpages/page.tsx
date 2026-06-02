import { createClient } from '@/lib/supabase/server'
import { LandingPagesClient } from '@/components/modules/landingpages/LandingPagesClient'

export default async function LandingPagesPage() {
  const supabase = await createClient()

  const [{ data: pages }, { data: clients }] = await Promise.all([
    supabase.from('landing_pages').select('*, client:client_id(id, name)').order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name').order('name'),
  ])

  return <LandingPagesClient pages={pages ?? []} clients={clients ?? []} />
}
