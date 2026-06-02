import { createClient } from '@/lib/supabase/server'
import { PlannerClient } from '@/components/modules/planner/PlannerClient'

export default async function PlannerPage() {
  const supabase = await createClient()

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split('T')[0]

  const [{ data: items }, { data: clients }] = await Promise.all([
    supabase
      .from('content_items')
      .select('*, client:client_id(id, name)')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .order('scheduled_date'),
    supabase.from('clients').select('id, name').order('name'),
  ])

  return <PlannerClient items={items ?? []} clients={clients ?? []} />
}
