import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Diagnostic endpoint — returns current user info including signature config.
 * Uses service role to bypass RLS — only the authenticated user can see their own data.
 */
export async function GET() {
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: row, error } = await admin
    .from('users')
    .select('id, full_name, email, role, permission, email_signature, email_signature_image, organization_id')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    authenticated: true,
    auth_user_id: user.id,
    public_users_row_found: !!row,
    error: error?.message ?? null,
    full_name: row?.full_name ?? null,
    email: row?.email ?? null,
    role: row?.role ?? null,
    permission: row?.permission ?? null,
    organization_id: row?.organization_id ?? null,
    signature_text: {
      configured: !!row?.email_signature,
      length: row?.email_signature?.length ?? 0,
      preview: row?.email_signature?.slice(0, 50) ?? null,
    },
    signature_image: {
      configured: !!row?.email_signature_image,
      url: row?.email_signature_image ?? null,
    },
  })
}
