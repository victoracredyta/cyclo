import { createClient } from '@/lib/supabase/server'
import { EmailClient } from '@/components/modules/email/EmailClient'

export default async function EmailPage() {
  const supabase = await createClient()

  const [{ data: clients }, { data: leads }, { data: orgUser }] = await Promise.all([
    supabase.from('clients').select('id, name, email').order('name'),
    supabase.from('leads').select('id, name, email, company').is('won_at', null).is('lost_at', null).order('name'),
    supabase.from('users').select('full_name, email, organization_id').single(),
  ])

  return (
    <EmailClient
      clients={clients ?? []}
      leads={leads ?? []}
      senderName={orgUser?.full_name ?? 'Agência'}
      senderEmail={orgUser?.email ?? ''}
    />
  )
}
