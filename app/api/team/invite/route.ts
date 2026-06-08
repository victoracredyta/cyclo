import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMail } from '@/lib/email/sendMail'

const ROLE_LABELS: Record<string, string> = {
  Admin:        'Administrador',
  Gestor:       'Gestor',
  Vendedor:     'Vendedor',
  Visualizador: 'Visualizador',
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Get current user info (need org_id and permission)
    const { data: me } = await supabase
      .from('users')
      .select('organization_id, full_name, permission, email')
      .eq('id', authUser.id)
      .single()

    if (!me?.organization_id) return NextResponse.json({ error: 'Organização não encontrada' }, { status: 400 })
    if (me.permission !== 'Admin' && me.permission !== 'Gestor') {
      return NextResponse.json({ error: 'Apenas Admin e Gestor podem convidar membros' }, { status: 403 })
    }

    const { email, full_name, role, permission } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    // Check if email already belongs to another user in this org
    const { data: existing } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .eq('organization_id', me.organization_id)
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'Esse email já pertence à equipe' }, { status: 400 })

    // Create invite record
    const { data: invite, error: inviteErr } = await supabase
      .from('team_invites')
      .insert({
        organization_id: me.organization_id,
        email: email.toLowerCase().trim(),
        full_name: full_name?.trim() || null,
        role: role?.trim() || null,
        permission: permission || 'Vendedor',
        invited_by: authUser.id,
      })
      .select()
      .single()

    if (inviteErr || !invite) {
      return NextResponse.json({ error: `Erro ao criar convite: ${inviteErr?.message ?? 'desconhecido'}` }, { status: 500 })
    }

    // Try to send invite email — if SMTP not configured, return invite link anyway
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cyclo-beta.vercel.app'
    const acceptUrl = `${baseUrl}/accept-invite/${invite.token}`
    const fromName = me.full_name?.trim() || 'Sua equipe'
    const permLabel = ROLE_LABELS[invite.permission] ?? invite.permission

    const emailBody = [
      `Olá${full_name ? ` ${full_name}` : ''}!`,
      '',
      `${fromName} convidou você para fazer parte da equipe no CYCLO como ${permLabel}.`,
      '',
      `Clique no link abaixo para criar sua conta e começar a usar:`,
      acceptUrl,
      '',
      `O convite expira em 7 dias.`,
      '',
      'Bem-vindo(a) ao time! 🚀',
      '— CYCLO',
    ].join('\n')

    let emailSent = false
    let emailError: string | undefined
    try {
      await sendMail({
        to: invite.email,
        subject: `${fromName} convidou você para o CYCLO`,
        body: emailBody,
      })
      emailSent = true
    } catch (e) {
      emailError = e instanceof Error ? e.message : 'erro desconhecido'
    }

    return NextResponse.json({
      ok: true,
      invite_id: invite.id,
      accept_url: acceptUrl,
      email_sent: emailSent,
      email_error: emailError,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro desconhecido' }, { status: 500 })
  }
}
