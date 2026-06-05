import { createClient } from '@/lib/supabase/server'
import { IntegracoesClient } from '@/components/modules/integracoes/IntegracoesClient'

export default async function IntegracoesPage() {
  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .single()

  return <IntegracoesClient orgId={org?.id ?? ''} orgSlug={org?.slug ?? ''} />
}
