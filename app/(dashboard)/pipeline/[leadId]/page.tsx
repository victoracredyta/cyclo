import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LeadDetailClient } from '@/components/modules/pipeline/LeadDetailClient'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  const { leadId } = await params
  const supabase = await createClient()

  const [
    { data: lead },
    { data: stages },
    { data: activities },
    { data: tasks },
    { data: users },
    { data: files },
    { data: emails },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*, responsible:responsible_id(id, full_name, avatar_url)')
      .eq('id', leadId)
      .single(),
    supabase.from('pipeline_stages').select('*').order('order_index'),
    supabase
      .from('activities')
      .select('*, user:user_id(id, full_name, avatar_url)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('lead_tasks')
      .select('*, user:user_id(id, full_name, avatar_url)')
      .eq('lead_id', leadId)
      .order('created_at')
      .limit(50),
    supabase.from('users').select('id, full_name, avatar_url').eq('is_active', true),
    supabase
      .from('lead_files')
      .select('*, uploader:uploaded_by(id, full_name, avatar_url)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('lead_emails')
      .select('*, sender:sent_by(id, full_name, avatar_url)')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(50),
  ])

  if (!lead) notFound()

  return (
    <LeadDetailClient
      lead={lead as Parameters<typeof LeadDetailClient>[0]['lead']}
      stages={stages ?? []}
      activities={(activities ?? []) as Parameters<typeof LeadDetailClient>[0]['activities']}
      tasks={(tasks ?? []) as Parameters<typeof LeadDetailClient>[0]['tasks']}
      users={users ?? []}
      files={(files ?? []) as Parameters<typeof LeadDetailClient>[0]['files']}
      emails={(emails ?? []) as Parameters<typeof LeadDetailClient>[0]['emails']}
    />
  )
}
