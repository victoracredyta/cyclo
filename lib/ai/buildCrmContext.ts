import { createClient } from '@supabase/supabase-js'

/**
 * Loads a snapshot of the user's CRM (leads, clients, stages, recent activity)
 * and formats it as a context block for the AI system prompt.
 *
 * Uses service role to bypass RLS — the orgId must already be verified upstream.
 */
export async function buildCrmContext(orgId: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!supabaseUrl || !serviceKey) return ''

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const [leadsRes, clientsRes, stagesRes, usersRes] = await Promise.all([
    admin.from('leads')
      .select('id, name, company, value, priority, origin, referred_by, next_action, stage_id, responsible_id, created_at, won_at, lost_at, lost_reason')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100),
    admin.from('clients')
      .select('id, name, sector, mrr, status, services, origin, referred_by, responsible_id, created_at, contract_since')
      .eq('organization_id', orgId)
      .order('mrr', { ascending: false })
      .limit(50),
    admin.from('pipeline_stages')
      .select('id, name, order_index, funnel_id')
      .eq('organization_id', orgId)
      .order('order_index'),
    admin.from('users')
      .select('id, full_name')
      .eq('organization_id', orgId),
  ])

  const leads = (leadsRes.data ?? []) as Array<{
    id: string; name: string; company: string | null; value: number | null
    priority: string | null; origin: string | null; referred_by: string | null
    next_action: string | null; stage_id: string | null; responsible_id: string | null
    created_at: string; won_at: string | null; lost_at: string | null; lost_reason: string | null
  }>
  const clients = (clientsRes.data ?? []) as Array<{
    id: string; name: string; sector: string | null; mrr: number; status: string
    services: string[] | null; origin: string | null; referred_by: string | null
    responsible_id: string | null; created_at: string; contract_since: string | null
  }>
  const stages = (stagesRes.data ?? []) as Array<{ id: string; name: string; order_index: number; funnel_id: string | null }>
  const users = (usersRes.data ?? []) as Array<{ id: string; full_name: string | null }>

  const stageName = (id: string | null) => stages.find(s => s.id === id)?.name ?? '—'
  const userName = (id: string | null) => users.find(u => u.id === id)?.full_name ?? '—'
  const daysAgo = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)

  const openLeads = leads.filter(l => !l.won_at && !l.lost_at)
  const wonLeads = leads.filter(l => !!l.won_at)
  const lostLeads = leads.filter(l => !!l.lost_at)

  const totalOpenValue = openLeads.reduce((s, l) => s + (l.value ?? 0), 0)
  const totalWonValue = wonLeads.reduce((s, l) => s + (l.value ?? 0), 0)
  const totalMRR = clients.filter(c => c.status === 'ativo').reduce((s, c) => s + (c.mrr ?? 0), 0)

  const formatBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  const openLeadsBlock = openLeads.slice(0, 30).map(l => {
    const parts = [
      `- ${l.name}${l.company ? ` (${l.company})` : ''}`,
      `valor: ${l.value ? formatBRL(l.value) : '—'}`,
      `etapa: ${stageName(l.stage_id)}`,
      `prioridade: ${l.priority ?? '—'}`,
      `origem: ${l.origin ?? '—'}${l.referred_by ? ` (indicado por: ${l.referred_by})` : ''}`,
      `responsável: ${userName(l.responsible_id)}`,
      `há ${daysAgo(l.created_at)} dias no pipeline`,
      l.next_action ? `próxima ação: ${l.next_action}` : '',
    ].filter(Boolean)
    return parts.join(' | ')
  }).join('\n')

  const clientsBlock = clients.slice(0, 20).map(c => {
    const parts = [
      `- ${c.name}${c.sector ? ` (${c.sector})` : ''}`,
      `MRR: ${formatBRL(c.mrr ?? 0)}`,
      `status: ${c.status}`,
      c.services?.length ? `serviços: ${c.services.join(', ')}` : '',
      `origem: ${c.origin ?? '—'}${c.referred_by ? ` (indicado por: ${c.referred_by})` : ''}`,
      `responsável: ${userName(c.responsible_id)}`,
    ].filter(Boolean)
    return parts.join(' | ')
  }).join('\n')

  const lostBlock = lostLeads.slice(0, 10).map(l =>
    `- ${l.name}${l.company ? ` (${l.company})` : ''} | valor: ${l.value ? formatBRL(l.value) : '—'} | motivo: ${l.lost_reason ?? '—'}`
  ).join('\n')

  return `

═══════════════════════════════════════════
📊 CONTEXTO DO CRM DO USUÁRIO (snapshot atual)
═══════════════════════════════════════════

RESUMO:
- Leads em aberto: ${openLeads.length} (valor total potencial: ${formatBRL(totalOpenValue)})
- Leads ganhos: ${wonLeads.length} (receita: ${formatBRL(totalWonValue)})
- Leads perdidos: ${lostLeads.length}
- Clientes ativos: ${clients.filter(c => c.status === 'ativo').length}
- MRR total: ${formatBRL(totalMRR)}
- Etapas do pipeline: ${stages.map(s => s.name).join(' → ')}
- Vendedores: ${users.map(u => u.full_name).filter(Boolean).join(', ')}

LEADS EM ABERTO (top 30 mais recentes):
${openLeadsBlock || '(nenhum)'}

CLIENTES ATIVOS (top 20 por MRR):
${clientsBlock || '(nenhum)'}

LEADS PERDIDOS RECENTES (últimos 10):
${lostBlock || '(nenhum)'}

═══════════════════════════════════════════

INSTRUÇÕES IMPORTANTES:
- VOCÊ JÁ TEM acesso aos dados acima. Use-os ativamente em vez de perguntar.
- Quando o usuário falar "minha pipeline", "meus leads", "meus clientes" → consulte o contexto acima.
- Para escolher "oportunidade com maior chance de fechar", analise: prioridade alta, valor maior, etapa avançada, dias no pipeline, próxima ação clara.
- Cite nomes específicos (ex: "O lead João da Empresa X..."), valores em R$, e etapas reais.
- Se faltar info muito específica (ex: "qual foi o último email enviado"), aí sim peça — mas NUNCA peça dados que já estão acima.
`
}
