import { createClient } from '@/lib/supabase/server'

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
 * Priority:
 *   1. The org's saved key for the requested provider (or first available)
 *   2. The platform env var fallback
 *
 * If `preferred` is omitted, tries providers in this order: anthropic → openai → google.
 */
export async function resolveAIKey(preferred?: AIProvider): Promise<ResolvedKey> {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('ai_settings')
    .select('anthropic_api_key, openai_api_key, google_api_key')
    .maybeSingle()

  const order: AIProvider[] = preferred
    ? [preferred, ...(['anthropic', 'openai', 'google'] as AIProvider[]).filter(p => p !== preferred)]
    : ['anthropic', 'openai', 'google']

  // 1. Try org keys in priority order
  for (const provider of order) {
    const key = settings?.[FIELD[provider]]?.trim()
    if (key) return { provider, key, source: 'org' }
  }

  // 2. Try env vars in priority order
  for (const provider of order) {
    const key = process.env[ENV_VAR[provider]]?.trim()
    if (key) return { provider, key, source: 'env' }
  }

  throw new Error(
    `Nenhuma chave de IA configurada. Vá em Integrações → CYCLO IA — Chaves API e ` +
    `adicione uma chave de qualquer provedor: ${Object.values(LABEL).join(', ')}.`,
  )
}
