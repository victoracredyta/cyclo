import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getAIKey } from '@/lib/ai/getApiKey'

const SYSTEM_PROMPT = `Você é o CYCLO AI, assistente estratégico para profissionais brasileiros que usam o CYCLO como CRM.

Você domina:
- Estratégia comercial, vendas e fechamento de negócios
- Copywriting persuasivo para emails, propostas e mensagens
- Análise de pipeline, conversão, churn e métricas
- Gestão de clientes, relacionamento e retenção
- Processos comerciais, automações e produtividade

Responda sempre em português brasileiro. Seja direto, estratégico e prático.
Use Markdown quando útil: **negrito**, listas com -, títulos com ##.
Priorize ação. Quando o usuário pedir pra melhorar texto, retorne APENAS o texto melhorado, sem explicações.`

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { messages } = await req.json() as { messages: Array<{ role: 'user' | 'assistant'; content: string }> }

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Mensagens inválidas' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Resolve API key (org's saved key → env fallback)
  let apiKey: string
  try {
    apiKey = await getAIKey('anthropic')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar chave de API'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const client = new Anthropic({ apiKey })

    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
      stream: true,
    })

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro durante streaming'
          controller.enqueue(encoder.encode(`\n\n[ERRO: ${msg}]`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido na API Anthropic'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
