import { createClient } from '@/lib/supabase/server'
import { CRMList } from '@/components/modules/crm/CRMList'

export default async function CRMPage() {
  const supabase = await createClient()

  const [{ data: clients }, { data: users }] = await Promise.all([
    supabase.from('clients').select('*, responsible:responsible_id(id, full_name, avatar_url)').order('name'),
    supabase.from('users').select('id, full_name, avatar_url').eq('is_active', true),
  ])

  return <CRMList clients={clients ?? []} users={users ?? []} />
}
