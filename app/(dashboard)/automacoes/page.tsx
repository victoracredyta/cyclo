import { createClient } from '@/lib/supabase/server'
import { AutomacoesClient } from '@/components/modules/automacoes/AutomacoesClient'

export default async function AutomacoesPage() {
  const supabase = await createClient()

  const { data: automations } = await supabase
    .from('automations')
    .select('*')
    .order('created_at', { ascending: false })

  return <AutomacoesClient automations={automations ?? []} />
}
