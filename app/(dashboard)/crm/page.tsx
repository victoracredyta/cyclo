import { createClient } from '@/lib/supabase/server'
import { CRMList } from '@/components/modules/crm/CRMList'

export const dynamic = 'force-dynamic'

export default async function CRMPage() {
  const supabase = await createClient()

  const [
    { data: clients },
    { data: users },
    { data: segments },
    { data: contacts },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('*, responsible:responsible_id(id, full_name, avatar_url), segment:segment_id(id, name, color)')
      .order('name'),
    supabase.from('users').select('id, full_name, avatar_url').eq('is_active', true),
    supabase.from('segments').select('id, name, color').order('name'),
    supabase.from('client_contacts').select('id, client_id, name, is_primary').order('is_primary', { ascending: false }),
  ])

  return (
    <CRMList
      clients={clients ?? []}
      users={users ?? []}
      segments={segments ?? []}
      contacts={contacts ?? []}
    />
  )
}
