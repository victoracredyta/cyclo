import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { resolveAIKey } from '@/lib/ai/getApiKey'

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

type Msg = { role: 'user' | 'assistant'; content: string }

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return jsonError('Não autenticado', 401)
  }

  const { messages, preferProvider } = await req.json() as { messages: Msg[]; preferProvider?: 'anthropic' | 'openai' | 'google' }
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError('Mensagens inválidas', 400)
  }

  // Resolve which provider+key to use (uses preferProvider if given, else anthropic → openai → google → env)
  let resolved
  try {
    resolved = await resolveAIKey(preferProvider)
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Erro ao buscar chave de API', 400)
  }

  try {
    const stream = await streamFor(resolved.provider, resolved.key, messages)
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
        'X-CYCLO-Provider': resolved.provider,
      },
    })
  } catch (err) {
    return jsonError(
      err instanceof Error ? `${resolved.provider}: ${err.message}` : 'Erro desconhecido',
      500,
    )
  }
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function streamFor(provider: 'anthropic' | 'openai' | 'google', key: string, messages: Msg[]): Promise<ReadableStream> {
  const encoder = new TextEncoder()

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey: key })
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
      stream: true,
    })
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`\n\n[ERRO: ${err instanceof Error ? err.message : 'streaming'}]`))
        } finally {
          controller.close()
        }
      },
    })
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey: key })
    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
      max_tokens: 2048,
    })
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content
            if (delta) controller.enqueue(encoder.encode(delta))
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`\n\n[ERRO: ${err instanceof Error ? err.message : 'streaming'}]`))
        } finally {
          controller.close()
        }
      },
    })
  }

  // google (Gemini)
  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: SYSTEM_PROMPT })

  // Convert OpenAI-style messages → Gemini's chat history format
  // Gemini expects role 'user' or 'model' (not 'assistant')
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const lastMessage = messages[messages.length - 1].content

  const chat = model.startChat({ history })
  const result = await chat.sendMessageStream(lastMessage)

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) controller.enqueue(encoder.encode(text))
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n[ERRO: ${err instanceof Error ? err.message : 'streaming'}]`))
      } finally {
        controller.close()
      }
    },
  })
}
