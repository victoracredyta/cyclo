'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Send, Building2, CheckCheck, Bot } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Message = {
  id: string
  content: string
  is_from_client: boolean
  created_at: string
  user: { full_name: string | null; avatar_url: string | null } | null
}

type Conversation = {
  id: string
  status: string
  channel: string
  client: { id: string; name: string; logo_url: string | null } | null
}

interface ConversationViewProps {
  conversation: Conversation
  messages: Message[]
}

export function ConversationView({ conversation, messages: initial }: ConversationViewProps) {
  const router = useRouter()
  const [messages, setMessages] = useState(initial)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(conversation.status)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!reply.trim() || sending) return
    setSending(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('id, full_name, avatar_url').single()

    const { data: msg, error } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      user_id: me?.id,
      content: reply.trim(),
      is_from_client: false,
    }).select('*, user:user_id(full_name, avatar_url)').single()

    if (error) { toast.error('Erro ao enviar'); setSending(false); return }
    await supabase.from('conversations').update({ last_message: reply.trim() }).eq('id', conversation.id)
    setMessages(prev => [...prev, msg as Message])
    setReply('')
    setSending(false)
  }

  const toggleStatus = async () => {
    const next = status === 'aberto' ? 'resolvido' : 'aberto'
    const supabase = createClient()
    await supabase.from('conversations').update({ status: next }).eq('id', conversation.id)
    setStatus(next)
    toast.success(next === 'resolvido' ? 'Conversa resolvida' : 'Conversa reaberta')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border shrink-0">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Avatar className="h-9 w-9">
          <AvatarImage src={conversation.client?.logo_url ?? undefined} />
          <AvatarFallback className="bg-[#5B8CFF]/10 text-[#5B8CFF] font-semibold text-sm">
            {conversation.client?.name.charAt(0) ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {conversation.client?.name ?? 'Conversa'}
          </p>
          <p className="text-xs text-muted-foreground capitalize">{conversation.channel}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={toggleStatus}
          className={cn('text-xs gap-1.5', status === 'aberto' ? 'text-[#12B981] border-[#12B981]/30' : '')}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          {status === 'aberto' ? 'Resolver' : 'Reabrir'}
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Nenhuma mensagem ainda. Inicie a conversa!
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-2.5', !msg.is_from_client ? 'flex-row-reverse' : 'flex-row')}>
            <Avatar className="h-7 w-7 shrink-0 mt-0.5">
              <AvatarImage src={msg.user?.avatar_url ?? undefined} />
              <AvatarFallback className={cn('text-[9px]', !msg.is_from_client ? 'bg-[#5B8CFF] text-white' : 'bg-muted')}>
                {msg.is_from_client ? (conversation.client?.name.charAt(0) ?? 'C') : (msg.user?.full_name?.charAt(0) ?? 'A')}
              </AvatarFallback>
            </Avatar>
            <div className={cn('max-w-[70%]', !msg.is_from_client && 'items-end flex flex-col')}>
              <div className={cn(
                'rounded-2xl px-3 py-2 text-sm',
                !msg.is_from_client
                  ? 'bg-[#5B8CFF] text-white rounded-tr-sm'
                  : 'bg-muted rounded-tl-sm',
              )}>
                {msg.content}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 px-1">
                {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                {!msg.is_from_client && msg.user?.full_name && ` · ${msg.user.full_name.split(' ')[0]}`}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <div className="border-t border-border pt-3 shrink-0">
        <div className="relative flex items-end gap-2 bg-card border border-border rounded-2xl p-3 focus-within:border-[#5B8CFF]/60 transition-colors">
          <Textarea
            placeholder="Escreva uma mensagem..."
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            rows={1}
            disabled={status === 'resolvido'}
            className="flex-1 resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            size="sm"
            onClick={send}
            disabled={!reply.trim() || sending || status === 'resolvido'}
            className="h-8 w-8 p-0 rounded-xl bg-[#5B8CFF] hover:bg-[#4a7aee] text-white shrink-0 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        {status === 'resolvido' && (
          <p className="text-xs text-muted-foreground text-center mt-2">Conversa resolvida · clique em Reabrir para responder</p>
        )}
      </div>
    </div>
  )
}
