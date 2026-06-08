import { createClient } from '@/lib/supabase/server'

export type AIProvider = 'anthropic' | 'openai' | 'google'

/**
 * Resolves the API key for the requested provider in this order:
 *   1. The org's saved key in ai_settings (set by the user in Integrações)
 *   2. The platform-wide env var (fallback for trial / demo)
 *
 * Throws a clear error if neither exists.
 */
export async function getAIKey(provider: AIProvider): Promise<string> {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('ai_settings')
    .select('anthropic_api_key, openai_api_key, google_api_key')
    .maybeSingle()

  const orgKey =
    provider === 'anthropic' ? settings?.anthropic_api_key :
    provider === 'openai'    ? settings?.openai_api_key    :
    settings?.google_api_key

  if (orgKey && orgKey.trim()) return orgKey.trim()

  const envKey =
    provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY :
    provider === 'openai'    ? process.env.OPENAI_API_KEY    :
    process.env.GOOGLE_API_KEY

  if (envKey && envKey.trim()) return envKey.trim()

  const providerLabel =
    provider === 'anthropic' ? 'Anthropic (Claude)' :
    provider === 'openai'    ? 'OpenAI (ChatGPT)'   :
    'Google (Gemini)'

  throw new Error(
    `Nenhuma chave de API ${providerLabel} configurada. ` +
    `Vá em Integrações → CYCLO IA — Chaves API e adicione a sua chave.`,
  )
}
