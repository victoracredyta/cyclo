import { createClient } from '@/lib/supabase/server'
import { AtendimentoClient } from '@/components/modules/atendimento/AtendimentoClient'

export default async function AtendimentoPage() {
  const supabase = await createClient()

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*, client:client_id(id, name, logo_url)')
    .order('created_at', { ascending: false })

  return <AtendimentoClient conversations={conversations ?? []} />
}
