import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cnpj: string }> },
) {
  const { cnpj: raw } = await params
  const cnpj = raw.replace(/\D/g, '')

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ deve ter 14 dígitos' }, { status: 400 })
  }

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'CYCLO-CRM/1.0' },
    next: { revalidate: 86400 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'CNPJ não encontrado na Receita Federal' }, { status: 404 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
