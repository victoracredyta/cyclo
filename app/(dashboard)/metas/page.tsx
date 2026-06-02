import { createClient } from '@/lib/supabase/server'
import { MetasClient } from '@/components/modules/metas/MetasClient'

export default async function MetasPage() {
  const supabase = await createClient()

  const [{ data: goals }, { data: users }] = await Promise.all([
    supabase.from('goals').select('*').order('created_at', { ascending: false }),
    supabase.from('users').select('id, full_name, avatar_url').eq('is_active', true),
  ])

  return <MetasClient goals={goals ?? []} users={users ?? []} />
}
