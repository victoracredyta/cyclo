import { createClient } from '@/lib/supabase/server'
import { PipelineBoard } from '@/components/modules/pipeline/PipelineBoard'

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: stages },
    { data: leads },
    { data: users },
    { data: funnelRows },
    { data: funnel_users },
  ] = await Promise.all([
    supabase.from('pipeline_stages').select('*').order('order_index'),
    supabase.from('leads').select('*, responsible:responsible_id(id, full_name, avatar_url)').is('won_at', null).is('lost_at', null).order('created_at'),
    supabase.from('users').select('id, full_name, avatar_url').eq('is_active', true),
    supabase.from('funnels').select('*').order('created_at'),
    supabase.from('funnel_users').select('funnel_id, user_id'),
  ])

  // Filter funnels visible to the current user
  const visibleFunnelIds = new Set(
    (funnel_users ?? []).filter(fu => fu.user_id === user?.id).map(fu => fu.funnel_id)
  )

  // If a funnel has no funnel_users entries at all, show it to everyone
  const funnelsWithUsers = new Set((funnel_users ?? []).map(fu => fu.funnel_id))
  const funnels = (funnelRows ?? [])
    // hide funnels flagged as hidden by the user in Configurações
    .filter(f => !(f as { is_hidden?: boolean }).is_hidden)
    .filter(f => visibleFunnelIds.has(f.id) || !funnelsWithUsers.has(f.id))

  return (
    <PipelineBoard
      initialStages={stages ?? []}
      initialLeads={leads ?? []}
      users={users ?? []}
      initialFunnels={funnels}
    />
  )
}
