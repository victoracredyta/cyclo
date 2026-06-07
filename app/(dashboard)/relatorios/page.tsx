import { createClient } from '@/lib/supabase/server'
import { RelatoriosClient } from '@/components/modules/relatorios/RelatoriosClient'

export const dynamic = 'force-dynamic'

export default async function RelatoriosPage() {
  const supabase = await createClient()

  const [
    { data: clients },
    { data: leads },
    { data: stages },
    { data: goals },
    { data: users },
    { data: funnels },
  ] = await Promise.all([
    supabase.from('clients').select('id, name, mrr, status, responsible_id, created_at').order('created_at'),
    supabase.from('leads').select('id, name, value, stage_id, funnel_id, responsible_id, origin, won_at, lost_at, lost_reason, created_at').order('created_at'),
    supabase.from('pipeline_stages').select('id, name, color, order_index, funnel_id').order('order_index'),
    supabase.from('goals').select('id, label, target_value, current_value, unit, period, color').order('created_at', { ascending: false }),
    supabase.from('users').select('id, full_name, avatar_url').eq('is_active', true),
    supabase.from('funnels').select('id, name, is_default').order('created_at'),
  ])

  return (
    <RelatoriosClient
      clients={clients ?? []}
      leads={leads ?? []}
      stages={stages ?? []}
      goals={goals ?? []}
      users={users ?? []}
      funnels={funnels ?? []}
    />
  )
}
