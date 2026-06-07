import { NextResponse } from 'next/server'
import { sendMail } from '@/lib/email/sendMail'

export async function POST(req: Request) {
  try {
    const { to, subject, body, cc, bcc } = await req.json()
    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'to, subject e body são obrigatórios' }, { status: 400 })
    }
    await sendMail({ to, subject, body, cc, bcc })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
