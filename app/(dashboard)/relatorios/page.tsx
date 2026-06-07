import { createClient } from '@/lib/supabase/server'
import { RelatoriosClient } from '@/components/modules/relatorios/RelatoriosClient'

export default async function RelatoriosPage() {
  const supabase = await createClient()

  const [
    { data: clients },
    { data: leads },
    { data: contentItems },
    { data: approvals },
    { data: automations },
  ] = await Promise.all([
    supabase.from('clients').select('id, name, mrr, status, created_at').order('created_at'),
    supabase.from('leads').select('id, value, stage_id, won_at, lost_at, created_at').order('created_at'),
    supabase.from('content_items').select('id, status, channel, created_at').order('created_at'),
    supabase.from('approvals').select('id, status, created_at').order('created_at'),
    supabase.from('automations').select('id, runs_count, errors_count, status').order('runs_count', { ascending: false }),
  ])

  return (
    <RelatoriosClient
      clients={clients ?? []}
      leads={leads ?? []}
      contentItems={contentItems ?? []}
      approvals={approvals ?? []}
      automations={automations ?? []}
    />
  )
}
