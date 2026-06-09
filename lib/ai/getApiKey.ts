import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export type AIProvider = 'anthropic' | 'openai' | 'google'

export type ResolvedKey = {
  provider: AIProvider
  key: string
  source: 'org' | 'env'
}

const ENV_VAR: Record<AIProvider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai:    'OPENAI_API_KEY',
  google:    'GOOGLE_API_KEY',
}

const FIELD: Record<AIProvider, 'anthropic_api_key' | 'openai_api_key' | 'google_api_key'> = {
  anthropic: 'anthropic_api_key',
  openai:    'openai_api_key',
  google:    'google_api_key',
}

const LABEL: Record<AIProvider, string> = {
  anthropic: 'Anthropic (Claude)',
  openai:    'OpenAI (ChatGPT)',
  google:    'Google (Gemini)',
}

/**
 * Resolves the API key to use for AI calls.
 *
 * Robust strategy:
 *   1. Get the authenticated user's organization_id from the server session
 *   2. Look up ai_settings using service role (bypasses RLS — works even if
 *      get_my_org_id() Postgres helper is missing or returning null)
 *   3. Try preferred provider, then fall back through the priority chain
 *   4. Finally try env vars
 */
export async function resolveAIKey(preferred?: AIProvider): Promise<ResolvedKey> {
  // 1. Authenticated context for the user
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }

  // 2. Get the user's organization_id (RLS-protected on users table — should work)
  const { data: me } = await serverClient
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!me?.organization_id) {
    throw new Error('Sua conta não está vinculada a uma organização. Contate o suporte.')
  }

  const order: AIProvider[] = preferred
    ? [preferred, ...(['anthropic', 'openai', 'google'] as AIProvider[]).filter(p => p !== preferred)]
    : ['anthropic', 'openai', 'google']

  // 3. Look up ai_settings using service role to bypass RLS issues
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  if (supabaseUrl && serviceKey) {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: settings } = await admin
      .from('ai_settings')
      .select('anthropic_api_key, openai_api_key, google_api_key')
      .eq('organization_id', me.organization_id)
      .maybeSingle()

    if (settings) {
      for (const provider of order) {
        const key = settings[FIELD[provider]]?.trim()
        if (key) return { provider, key, source: 'org' }
      }
    }
  }

  // 4. Fallback to env vars (platform-wide demo key)
  for (const provider of order) {
    const key = process.env[ENV_VAR[provider]]?.trim()
    if (key) return { provider, key, source: 'env' }
  }

  throw new Error(
    `Nenhuma chave de IA configurada. Vá em Integrações → CYCLO IA — Chaves API e ` +
    `adicione uma chave de qualquer provedor: ${Object.values(LABEL).join(', ')}.`,
  )
}
