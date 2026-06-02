import { createClient } from '@/lib/supabase/server'
import { AgendaClient } from '@/components/modules/agenda/AgendaClient'

export default async function AgendaPage() {
  const supabase = await createClient()

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() - 7)
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + (7 - now.getDay()) + 14)

  const [{ data: events }, { data: clients }] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('*, client:client_id(id, name)')
      .gte('start_at', weekStart.toISOString())
      .lte('start_at', weekEnd.toISOString())
      .order('start_at'),
    supabase.from('clients').select('id, name').order('name'),
  ])

  return <AgendaClient events={events ?? []} clients={clients ?? []} />
}
