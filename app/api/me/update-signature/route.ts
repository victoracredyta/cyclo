import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Updates the current user's email signature (text + image URL) using service role
 * to guarantee the write succeeds regardless of RLS state.
 */
export async function POST(req: Request) {
  try {
    const { signature, signatureImage } = await req.json() as {
      signature: string | null
      signatureImage: string | null
    }

    const serverClient = await createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const payload: Record<string, string | null> = {
      email_signature: signature?.trim() || null,
      email_signature_image: signatureImage?.trim() || null,
    }

    const { error } = await admin.from('users').update(payload as never).eq('id', user.id)
    if (error) return NextResponse.json({ error: `Erro: ${error.message}` }, { status: 500 })

    // Verify
    const { data: verify } = await admin
      .from('users')
      .select('email_signature, email_signature_image')
      .eq('id', user.id)
      .maybeSingle()

    return NextResponse.json({
      ok: true,
      saved_text_length: (verify as { email_signature?: string | null } | null)?.email_signature?.length ?? 0,
      saved_image: !!(verify as { email_signature_image?: string | null } | null)?.email_signature_image,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'desconhecido' }, { status: 500 })
  }
}
