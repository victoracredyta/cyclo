import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { userId, email, fullName, agencyName } = await req.json()

    if (!userId || !email || !fullName || !agencyName) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const slug = agencyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: agencyName, slug })
      .select()
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: orgError?.message ?? 'Erro ao criar organização' }, { status: 500 })
    }

    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        organization_id: org.id,
        full_name: fullName,
        email,
        role: 'Fundador',
        permission: 'Admin',
      })

    if (userError) {
      await supabase.from('organizations').delete().eq('id', org.id)
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
