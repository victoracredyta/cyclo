import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/components/modules/crm/ClientProfile'

export default async function ClientProfilePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*, responsible:responsible_id(id, full_name, avatar_url), origin_lead:originated_from_lead_id(id, name, company)')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  // Include activities from the originating lead so the client inherits full history
  const leadId = (client as { originated_from_lead_id?: string | null }).originated_from_lead_id ?? null
  const activitiesQuery = leadId
    ? supabase.from('activities').select('*, user:user_id(full_name, avatar_url)').or(`client_id.eq.${clientId},lead_id.eq.${leadId}`).order('created_at', { ascending: false }).limit(100)
    : supabase.from('activities').select('*, user:user_id(full_name, avatar_url)').eq('client_id', clientId).order('created_at', { ascending: false }).limit(100)

  const [
    { data: contacts },
    { data: activities },
    { data: approvals },
    { data: contentItems },
    { data: conversations },
    { data: users },
  ] = await Promise.all([
    supabase.from('client_contacts').select('*').eq('client_id', clientId).order('is_primary', { ascending: false }),
    activitiesQuery,
    supabase.from('approvals').select('id, title, status, due_date, channel, type, created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(10),
    supabase.from('content_items').select('id, title, status, channel, scheduled_date, created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(10),
    supabase.from('conversations').select('id, channel, status, last_message, created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(5),
    supabase.from('users').select('id, full_name, avatar_url').eq('is_active', true),
  ])

  return (
    <ClientProfile
      client={client}
      contacts={contacts ?? []}
      activities={activities ?? []}
      approvals={approvals ?? []}
      contentItems={contentItems ?? []}
      conversations={conversations ?? []}
      users={users ?? []}
    />
  )
}
