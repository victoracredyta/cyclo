import { createClient } from '@/lib/supabase/server'
import { ApprovalsClient } from '@/components/modules/approvals/ApprovalsClient'

export default async function AprovacoesPage() {
  const supabase = await createClient()

  const [{ data: approvals }, { data: clients }] = await Promise.all([
    supabase
      .from('approvals')
      .select('*, client:client_id(id, name), comments:approval_comments(id)')
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name').order('name'),
  ])

  return <ApprovalsClient approvals={approvals ?? []} clients={clients ?? []} />
}
