import { createClient } from '@/lib/supabase/server'
import { PipelineBoard } from '@/components/modules/pipeline/PipelineBoard'

export default async function PipelinePage() {
  const supabase = await createClient()

  const [{ data: stages }, { data: leads }, { data: users }] = await Promise.all([
    supabase.from('pipeline_stages').select('*').order('order_index'),
    supabase.from('leads').select('*, responsible:responsible_id(id, full_name, avatar_url)').is('won_at', null).is('lost_at', null).order('created_at'),
    supabase.from('users').select('id, full_name, avatar_url').eq('is_active', true),
  ])

  return <PipelineBoard initialStages={stages ?? []} initialLeads={leads ?? []} users={users ?? []} />
}
