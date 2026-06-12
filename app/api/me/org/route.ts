import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Returns the current user's organization_id using service role (bypasses RLS).
 * Used by client modals to guarantee org lookup succeeds.
 */
export async function GET() {
  try {
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
      .select('id, organization_id, email, full_name, role')
      .eq('id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 500 })
    if (!row) {
      return NextResponse.json({
        error: 'Sua conta não tem registro na tabela users. Contate o administrador.',
        auth_user_id: user.id,
        auth_email: user.email,
      }, { status: 404 })
    }

    const r = row as { id: string; organization_id: string | null; email: string | null; full_name: string | null; role: string | null }
    if (!r.organization_id) {
      return NextResponse.json({
        error: 'Sua conta não está vinculada a uma organização.',
        auth_user_id: user.id,
      }, { status: 400 })
    }

    return NextResponse.json({
      user_id: r.id,
      organization_id: r.organization_id,
      email: r.email,
      full_name: r.full_name,
      role: r.role,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'desconhecido' }, { status: 500 })
  }
}
