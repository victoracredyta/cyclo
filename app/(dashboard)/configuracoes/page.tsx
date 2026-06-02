import { createClient } from '@/lib/supabase/server'
import { ConfiguracoesClient } from '@/components/modules/configuracoes/ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: appUser }, { data: orgUsers }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user?.id ?? '').single(),
    supabase.from('users').select('id, full_name, email, role, permission, is_active, avatar_url, created_at').order('created_at'),
  ])

  return <ConfiguracoesClient appUser={appUser} orgUsers={orgUsers ?? []} />
}
