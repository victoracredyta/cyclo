import { AcceptInviteForm } from '@/components/modules/team/AcceptInviteForm'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Look up the invite using service role (since invitee isn't logged in yet)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  let invite: { email: string; full_name: string | null; permission: string; expires_at: string; accepted_at: string | null; organization_id: string } | null = null
  let orgName: string | null = null
  let configError = false

  if (!supabaseUrl || !serviceKey) {
    configError = true
  } else {
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const { data } = await admin.from('team_invites').select('*').eq('token', token).maybeSingle()
    if (data) {
      invite = data
      const { data: org } = await admin.from('organizations').select('name').eq('id', data.organization_id).single()
      orgName = org?.name ?? null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#07111F] via-[#0d1e38] to-[#0a1628] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#5B8CFF] to-[#8B5CF6] p-6 text-white text-center">
          <svg viewBox="0 0 40 40" className="w-12 h-12 mx-auto mb-2">
            <circle cx="20" cy="20" r="16" stroke="#fff" strokeWidth="3" fill="none"/>
            <path d="M20 4 A16 16 0 0 1 36 20" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <circle cx="20" cy="20" r="3" fill="#fff"/>
          </svg>
          <h1 className="text-xl font-bold">Convite para o CYCLO</h1>
          <p className="text-sm text-white/80 mt-1">
            {orgName ? `Equipe ${orgName}` : 'Aceite seu convite'}
          </p>
        </div>

        <div className="p-6">
          <AcceptInviteForm token={token} invite={invite} configError={configError} />
        </div>
      </div>
    </div>
  )
}
