import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { token, full_name, password } = await req.json()
    if (!token || !full_name || !password) {
      return NextResponse.json({ error: 'token, full_name e password são obrigatórios' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 })
    }

    // 1. Validate invite token (use service-like access via unscoped supabase client)
    // Since RLS only allows reading invites within an org, we need to use server client without auth
    // OR query via a known function. For simplicity, we use the standard server client.
    // But the invite is meant for someone NOT yet in the org — RLS will block.
    // Workaround: use a dedicated admin client with the service role key.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        error: 'Sistema de convites não configurado. Adicione SUPABASE_SERVICE_ROLE_KEY no Vercel.',
      }, { status: 500 })
    }

    const admin = createBrowserClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: invite, error: inviteErr } = await admin
      .from('team_invites')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (inviteErr || !invite) return NextResponse.json({ error: 'Convite inválido ou expirado' }, { status: 404 })
    if (invite.accepted_at) return NextResponse.json({ error: 'Esse convite já foi aceito' }, { status: 400 })
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Esse convite expirou' }, { status: 400 })
    }

    // 2. Create auth user (using admin API)
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })
    if (authErr || !authData.user) {
      return NextResponse.json({ error: `Erro ao criar usuário: ${authErr?.message ?? 'desconhecido'}` }, { status: 500 })
    }

    // 3. Create users row linked to org
    const { error: userRowErr } = await admin.from('users').insert({
      id: authData.user.id,
      organization_id: invite.organization_id,
      email: invite.email,
      full_name,
      role: invite.role,
      permission: invite.permission,
      is_active: true,
      onboarding_completed: true,
    })
    if (userRowErr) {
      // rollback auth user if users insert fails
      await admin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: `Erro ao criar perfil: ${userRowErr.message}` }, { status: 500 })
    }

    // 4. Mark invite accepted
    await admin.from('team_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

    return NextResponse.json({ ok: true, email: invite.email })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro desconhecido' }, { status: 500 })
  }
}
