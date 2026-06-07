import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientProfile } from '@/components/modules/crm/ClientProfile'

export default async function ClientProfilePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*, responsible:responsible_id(id, full_name, avatar_url)')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const [
    { data: contacts },
    { data: activities },
    { data: approvals },
    { data: contentItems },
    { data: conversations },
    { data: users },
  ] = await Promise.all([
    supabase.from('client_contacts').select('*').eq('client_id', clientId).order('is_primary', { ascending: false }),
    supabase.from('activities').select('*, user:user_id(full_name, avatar_url)').eq('client_id', clientId).order('created_at', { ascending: false }).limit(50),
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
