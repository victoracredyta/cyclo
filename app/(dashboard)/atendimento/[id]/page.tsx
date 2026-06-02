import { createClient } from '@/lib/supabase/server'
import { ConversationView } from '@/components/modules/atendimento/ConversationView'
import { notFound } from 'next/navigation'

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: conversation }, { data: messages }] = await Promise.all([
    supabase
      .from('conversations')
      .select('*, client:client_id(id, name, logo_url)')
      .eq('id', id)
      .single(),
    supabase
      .from('messages')
      .select('*, user:user_id(full_name, avatar_url)')
      .eq('conversation_id', id)
      .order('created_at'),
  ])

  if (!conversation) notFound()

  return <ConversationView conversation={conversation} messages={messages ?? []} />
}
