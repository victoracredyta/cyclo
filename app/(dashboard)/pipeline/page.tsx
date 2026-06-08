import { createClient } from '@/lib/supabase/server'
import { PipelineBoard } from '@/components/modules/pipeline/PipelineBoard'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Check current user's permission level — Admin/Gestor see everything
  const { data: me } = await supabase
    .from('users')
    .select('permission')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  const isPrivileged = me?.permission === 'Admin' || me?.permission === 'Gestor'

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

  // Map funnel → assigned user ids
  const funnelMembers = (funnel_users ?? []).reduce<Record<string, string[]>>((acc, fu) => {
    if (!acc[fu.funnel_id]) acc[fu.funnel_id] = []
    acc[fu.funnel_id].push(fu.user_id)
    return acc
  }, {})

  // Funnels user has WRITE access to:
  //   - Admin/Gestor: ALL funnels
  //   - Others: only funnels they're listed in (funnel_users) OR funnels with no members defined
  const myFunnelAccess = new Set<string>()
  ;(funnelRows ?? []).forEach(f => {
    if (isPrivileged) {
      myFunnelAccess.add(f.id)
      return
    }
    const members = funnelMembers[f.id] ?? []
    if (members.length === 0) {
      // funnel with no assigned users → open to everyone
      myFunnelAccess.add(f.id)
    } else if (members.includes(user?.id ?? '')) {
      myFunnelAccess.add(f.id)
    }
  })

  // Show ALL funnels in dropdown (so user knows they exist),
  // but flag which ones they have access to. Hide funnels marked as hidden.
  const funnels = (funnelRows ?? [])
    .filter(f => !(f as { is_hidden?: boolean }).is_hidden)
    .map(f => ({ ...f, has_access: myFunnelAccess.has(f.id) }))

  // Stages: send ALL (user can see kanban structure even of funnels without access).
  // Drag/edit is blocked client-side via has_access flag on the funnel.
  const visibleStages = stages ?? []

  // Leads: hide opportunities in funnels user doesn't have access to.
  // "Todos os funis" → only leads from accessible funnels
  const visibleLeads = (leads ?? []).filter(l => {
    const fid = (l as { funnel_id: string | null }).funnel_id
    if (!fid) return true
    return myFunnelAccess.has(fid)
  })

  return (
    <PipelineBoard
      initialStages={visibleStages}
      initialLeads={visibleLeads}
      users={users ?? []}
      initialFunnels={funnels}
      funnelMembers={funnelMembers}
    />
  )
}
