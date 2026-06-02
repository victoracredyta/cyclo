import { createClient } from '@/lib/supabase/server'
import { PesquisaClient } from '@/components/modules/pesquisa/PesquisaClient'

export default async function PesquisaPage() {
  const supabase = await createClient()

  const { data: competitors } = await supabase
    .from('competitors')
    .select('*')
    .order('score', { ascending: false })

  return <PesquisaClient competitors={competitors ?? []} />
}
