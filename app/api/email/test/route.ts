import { NextResponse } from 'next/server'
import { verifySmtpConnection } from '@/lib/email/sendMail'

export async function POST() {
  try {
    await verifySmtpConnection()
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
