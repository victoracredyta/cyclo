import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Diagnostic endpoint — tells the user which providers have keys configured.
 * Does NOT return the actual key values, just booleans + char counts.
 */
export async function GET() {
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: me } = await serverClient
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!me?.organization_id) {
    return NextResponse.json({
      error: 'Sua conta não está vinculada a uma organização',
      authenticated: true,
      user_id: user.id,
    })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY não configurado no Vercel',
      authenticated: true,
      user_id: user.id,
      organization_id: me.organization_id,
    })
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: settings, error } = await admin
    .from('ai_settings')
    .select('anthropic_api_key, openai_api_key, google_api_key, updated_at')
    .eq('organization_id', me.organization_id)
    .maybeSingle()

  return NextResponse.json({
    authenticated: true,
    user_id: user.id,
    organization_id: me.organization_id,
    has_row: !!settings,
    error: error?.message ?? null,
    anthropic: {
      configured: !!settings?.anthropic_api_key,
      length: settings?.anthropic_api_key?.length ?? 0,
    },
    openai: {
      configured: !!settings?.openai_api_key,
      length: settings?.openai_api_key?.length ?? 0,
    },
    google: {
      configured: !!settings?.google_api_key,
      length: settings?.google_api_key?.length ?? 0,
    },
    updated_at: settings?.updated_at ?? null,
    env_fallback: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
    },
  })
}
