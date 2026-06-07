'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, Sparkles, RefreshCw, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Message = { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  { label: '📋 Estratégia de conteúdo', prompt: 'Crie uma estratégia de conteúdo para redes sociais para uma empresa de e-commerce. Inclua pilares de conteúdo, frequência de postagem e KPIs.' },
  { label: '✍️ Copy para Instagram', prompt: 'Escreva 5 legendas para posts de Instagram para uma academia de ginástica. Tom motivacional, CTA para aula experimental.' },
  { label: '📊 Análise de métricas', prompt: 'Quais são as métricas mais importantes para acompanhar em uma campanha de tráfego pago? Como interpretar ROAS, CPA e CTR?' },
  { label: '📧 Proposta comercial', prompt: 'Me ajude a estruturar uma proposta comercial para um cliente do setor de saúde interessado em gestão de redes sociais + tráfego pago.' },
  { label: '🎯 Ideias de campanha', prompt: 'Gere 10 ideias criativas de campanhas para o Dia dos Namorados para uma joalheria. Inclua formato, canal e conceito criativo.' },
  { label: '📈 Retenção de cliente', prompt: 'Um cliente está com health score baixo e reclamando dos resultados. Como devo conduzir a reunião de alinhamento? Dê um script.' },
]

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-base font-bold mt-3 mb-1">{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-sm font-semibold mt-2 mb-0.5">{line.slice(4)}</h3>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex items-start gap-1.5 py-0.5">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-current shrink-0 opacity-60" />
          <span>{formatInline(line.slice(2))}</span>
        </div>
      )
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)?.[1]
      elements.push(
        <div key={i} className="flex items-start gap-1.5 py-0.5">
          <span className="text-xs font-bold opacity-50 shrink-0 mt-0.5 w-4 text-right">{num}.</span>
          <span>{formatInline(line.replace(/^\d+\. /, ''))}</span>
        </div>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(<p key={i} className="leading-relaxed">{formatInline(line)}</p>)
    }
    i++
  }
  return elements
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

function MessageBubble({ msg, isLast }: { msg: Message; isLast: boolean }) {
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'

  const copy = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={cn('flex gap-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
        isUser ? 'bg-[#5B8CFF] text-white' : 'bg-gradient-to-br from-[#5B8CFF] to-[#8B5CF6] text-white',
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={cn('flex-1 max-w-[80%]', isUser && 'flex flex-col items-end')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'bg-[#5B8CFF] text-white rounded-tr-sm'
            : 'bg-card border border-border rounded-tl-sm',
        )}>
          {isUser ? (
            <p className="leading-relaxed">{msg.content}</p>
          ) : (
            <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
          )}
          {!msg.content && !isUser && (
            <div className="flex gap-1 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" />
            </div>
          )}
        </div>
        {!isUser && msg.content && (
          <button
            onClick={copy}
            className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-1"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        )}
      </div>
    </div>
  )
}

export function AIClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok || !res.body) throw new Error('Falha na resposta')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let aiText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        aiText += decoder.decode(value, { stream: true })
        const captured = aiText
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: captured }
          return updated
        })
      }
    } catch {
      toast.error('Erro ao conectar com o CYCLO IA')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const reset = () => { setMessages([]); setInput('') }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5B8CFF] to-[#8B5CF6] flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold leading-none">CYCLO IA</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Assistente estratégico · Configure sua chave em Integrações</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={reset} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted">
            <RefreshCw className="w-3.5 h-3.5" /> Nova conversa
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5B8CFF] to-[#8B5CF6] flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold mb-1">Como posso ajudar?</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-sm">
              Estratégia, copy, análise de dados, planejamento — sua assistente de operação. Pergunte o que precisar.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full max-w-2xl">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(qp.prompt)}
                  className="text-left px-3 py-2.5 rounded-xl border border-border bg-card hover:border-[#5B8CFF]/40 hover:bg-[#5B8CFF]/5 transition-all text-xs font-medium"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} isLast={i === messages.length - 1} />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="pt-4 border-t border-border mt-4 shrink-0">
        <div className="relative flex items-end gap-2 bg-card border border-border rounded-2xl p-3 focus-within:border-[#5B8CFF]/60 transition-colors">
          <Textarea
            ref={textareaRef}
            placeholder="Pergunte qualquer coisa sobre marketing, estratégia, copy..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[24px] max-h-32 overflow-y-auto"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <Button
            size="sm"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            className="h-8 w-8 p-0 rounded-xl bg-[#5B8CFF] hover:bg-[#4a7aee] text-white shrink-0 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}
