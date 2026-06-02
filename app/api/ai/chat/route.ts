import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `Você é o CYCLO AI, assistente estratégico especializado em agências de marketing digital brasileiras.

Você domina:
- Estratégia de conteúdo e calendário editorial
- Copywriting para redes sociais, e-mail e anúncios
- Análise de métricas, relatórios e insights de performance
- Gestão de clientes, churn e health score
- Pipeline comercial e técnicas de fechamento
- Automações, processos e gestão de equipes de agência
- Briefings, apresentações e propostas comerciais
- Meta Ads, Google Ads e estratégias de tráfego pago

Responda sempre em português brasileiro. Seja direto, estratégico e prático.
Use formatação Markdown quando útil: **negrito**, listas com -, títulos com ##.
Seja conciso mas completo. Priorize ação.`

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages } = await req.json() as { messages: Array<{ role: 'user' | 'assistant'; content: string }> }

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('Bad Request', { status: 400 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
}
