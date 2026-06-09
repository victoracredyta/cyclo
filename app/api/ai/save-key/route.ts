import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Saves an AI provider API key for the user's organization.
 * Uses service role to bypass any RLS issues and guarantees the row exists.
 */
export async function POST(req: Request) {
  try {
    const { provider, key } = await req.json() as {
      provider: 'anthropic' | 'openai' | 'google'
      key: string
    }

    if (!provider || !['anthropic', 'openai', 'google'].includes(provider)) {
      return NextResponse.json({ error: 'Provider inválido' }, { status: 400 })
    }

    // Get authenticated user + their org
    const serverClient = await createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: me } = await serverClient
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!me?.organization_id) {
      return NextResponse.json({ error: 'Sua conta não tem organização vinculada' }, { status: 400 })
    }

    // Upsert with service role (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        error: 'SUPABASE_SERVICE_ROLE_KEY não configurado no Vercel',
      }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const field = `${provider}_api_key` as 'anthropic_api_key' | 'openai_api_key' | 'google_api_key'
    const payload: Record<string, string | null> = {
      organization_id: me.organization_id,
      [field]: key?.trim() || null,
    }

    const { error: upsertErr } = await admin
      .from('ai_settings')
      .upsert(payload as never, { onConflict: 'organization_id' })

    if (upsertErr) {
      return NextResponse.json({ error: `Erro ao salvar: ${upsertErr.message}` }, { status: 500 })
    }

    // Verify the write
    const { data: verify } = await admin
      .from('ai_settings')
      .select(field)
      .eq('organization_id', me.organization_id)
      .maybeSingle()

    const savedValue = (verify as Record<string, string | null> | null)?.[field]
    const savedLength = typeof savedValue === 'string' ? savedValue.length : 0

    return NextResponse.json({
      ok: true,
      provider,
      organization_id: me.organization_id,
      saved_length: savedLength,
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    }, { status: 500 })
  }
}
