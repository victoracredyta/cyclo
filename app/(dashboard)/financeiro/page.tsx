import { createClient } from '@/lib/supabase/server'
import { FinanceiroClient } from '@/components/modules/financeiro/FinanceiroClient'

export default async function FinanceiroPage() {
  const supabase = await createClient()

  const [{ data: invoices }, { data: clients }, { data: org }] = await Promise.all([
    supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name, mrr, status').order('mrr', { ascending: false }),
    supabase.from('organizations').select('plan, stripe_customer_id, stripe_subscription_id').single(),
  ])

  return (
    <FinanceiroClient
      invoices={invoices ?? []}
      clients={clients ?? []}
      plan={org?.plan ?? 'free'}
      hasStripe={!!org?.stripe_customer_id}
    />
  )
}
