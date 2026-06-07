import { NextResponse } from 'next/server'
import { sendMail } from '@/lib/email/sendMail'
import { createClient } from '@/lib/supabase/server'

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

    const subject = `Você recebeu um lead — ${leadName}`
    const body = [
      `Olá ${target.full_name ?? ''},`,
      '',
      `${fromName ?? 'Alguém da sua equipe'} transferiu um lead para você no CYCLO:`,
      '',
      `• Lead: ${leadName}`,
      leadCompany ? `• Empresa: ${leadCompany}` : '',
      '',
      `Acesse a oportunidade para dar continuidade:`,
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://cyclo-beta.vercel.app'}/pipeline/${leadId}`,
      '',
      'Boa venda! 🚀',
      '— CYCLO',
    ].filter(Boolean).join('\n')

    await sendMail({ to: target.email, subject, body })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
