import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/modules/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: clients },
    { data: leads },
    { data: approvals },
    { data: stages },
    { data: goals },
    { data: automations },
  ] = await Promise.all([
    supabase.from('clients').select('id, name, mrr, health_score, status').order('mrr', { ascending: false }),
    supabase.from('leads').select('id, name, value, stage_id, won_at, lost_at, created_at').is('won_at', null).is('lost_at', null),
    supabase.from('approvals').select('id, status, client_id').in('status', ['aguardando']),
    supabase.from('pipeline_stages').select('id, name, color, order_index').order('order_index'),
    supabase.from('goals').select('*').eq('period', 'mensal'),
    supabase.from('automations').select('*').eq('status', 'ativo'),
  ])

  const activeClients = clients?.filter(c => c.status === 'Ativo') ?? []
  const riskClients = clients?.filter(c => c.health_score < 50) ?? []
  const mrr = activeClients.reduce((s, c) => s + (c.mrr ?? 0), 0)
  const pipelineValue = leads?.reduce((s, l) => s + (l.value ?? 0), 0) ?? 0

  // Build pipeline by stage
  const pipelineByStage = (stages ?? []).map(stage => ({
    ...stage,
    leads: leads?.filter(l => l.stage_id === stage.id) ?? [],
    value: leads?.filter(l => l.stage_id === stage.id).reduce((s, l) => s + (l.value ?? 0), 0) ?? 0,
  }))

  return (
    <DashboardClient
      mrr={mrr}
      activeClientsCount={activeClients.length}
      riskClients={riskClients}
      pendingApprovals={approvals?.length ?? 0}
      pipelineValue={pipelineValue}
      openLeadsCount={leads?.length ?? 0}
      pipelineByStage={pipelineByStage}
      goals={goals ?? []}
      automations={automations ?? []}
    />
  )
}
