import { NextResponse } from 'next/server'
import { sendMail } from '@/lib/email/sendMail'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_SUBJECT = 'Você recebeu um lead — {lead}'
const DEFAULT_BODY = '{remetente} transferiu o lead "{lead}" para você. Acesse o CYCLO para dar continuidade.'

function render(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), template)
}

export async function POST(req: Request) {
  try {
    const { toUserId, leadId, leadName, leadCompany, fromName } = await req.json()
    if (!toUserId || !leadId || !leadName) {
      return NextResponse.json({ error: 'parâmetros faltando' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: target } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', toUserId)
      .maybeSingle()

    if (!target?.email) {
      return NextResponse.json({ skipped: 'usuário sem email' }, { status: 200 })
    }

    // Check user prefs for this event
    const { data: pref } = await supabase
      .from('notification_prefs')
      .select('*')
      .eq('user_id', toUserId)
      .eq('event_type', 'lead_transfer')
      .maybeSingle()

    // If user explicitly disabled email for this event, skip
    if (pref && pref.email_enabled === false) {
      return NextResponse.json({ skipped: 'email desativado pelo usuário' }, { status: 200 })
    }

    const to = pref?.email_to || target.email
    const subjectTpl = pref?.email_subject || DEFAULT_SUBJECT
    const bodyTpl = pref?.email_body || DEFAULT_BODY

    const vars = {
      lead: leadName + (leadCompany ? ` — ${leadCompany}` : ''),
      remetente: fromName ?? 'Alguém da sua equipe',
      cliente: leadName,
      de: '',
      para: '',
      meta: '',
    }

    const subject = render(subjectTpl, vars)
    const baseBody = render(bodyTpl, vars)
    const linkUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://cyclo.acredyta.com.br'}/pipeline/${leadId}`
    const body = `Olá ${target.full_name ?? ''},\n\n${baseBody}\n\nAcessar oportunidade:\n${linkUrl}\n\n— CYCLO`

    await sendMail({ to, subject, body })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
