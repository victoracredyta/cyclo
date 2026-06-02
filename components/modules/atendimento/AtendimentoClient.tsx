'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Search, MessageCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Conversation = {
  id: string
  status: string
  channel: string
  last_message: string | null
  unread_count: number
  created_at: string
  client: { id: string; name: string; logo_url: string | null } | null
}

const STATUS_CONFIG = {
  aberto:   { label: 'Aberto',    color: '#5B8CFF' },
  resolvido:{ label: 'Resolvido', color: '#6B7280' },
}

const CHANNEL_ICONS: Record<string, string> = {
  chat: '💬', whatsapp: '📱', email: '✉️',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

interface AtendimentoClientProps {
  conversations: Conversation[]
}

export function AtendimentoClient({ conversations: initial }: AtendimentoClientProps) {
  const router = useRouter()
  const [convs, setConvs] = useState(initial)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const filtered = convs.filter(c =>
    !search || c.client?.name.toLowerCase().includes(search.toLowerCase()) || (c.last_message ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const openCount = convs.filter(c => c.status === 'aberto').length

  const newConversation = async () => {
    setCreating(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { setCreating(false); return }
    const { data: conv, error } = await supabase.from('conversations').insert({
      organization_id: me.organization_id,
      channel: 'chat',
      status: 'aberto',
    }).select('*, client:client_id(id, name, logo_url)').single()
    if (error || !conv) { toast.error('Erro ao criar conversa'); setCreating(false); return }
    const newConv = conv as unknown as Conversation
    setConvs(prev => [newConv, ...prev])
    router.push(`/atendimento/${newConv.id}`)
    setCreating(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Atendimento</h2>
          <p className="text-sm text-muted-foreground">{openCount} conversas abertas</p>
        </div>
        <Button
          size="sm"
          className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-xs"
          onClick={newConversation}
          disabled={creating}
        >
          <Plus className="w-3.5 h-3.5" /> Nova conversa
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar conversa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            Nenhuma conversa encontrada.
          </div>
        ) : (
          filtered.map((conv, i) => {
            const cfg = STATUS_CONFIG[conv.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.aberto
            return (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => router.push(`/atendimento/${conv.id}`)}
                className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl cursor-pointer hover:border-[#5B8CFF]/40 hover:shadow-sm transition-all"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-[#5B8CFF]/10 text-[#5B8CFF] font-semibold text-sm">
                    {conv.client?.name.charAt(0) ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {conv.client?.name ?? 'Conversa sem cliente'}
                    </p>
                    <span className="text-sm shrink-0">{CHANNEL_ICONS[conv.channel] ?? '💬'}</span>
                  </div>
                  <p className={cn(
                    'text-xs truncate mt-0.5',
                    conv.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}>
                    {conv.last_message ?? 'Nenhuma mensagem'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {timeAgo(conv.created_at)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {conv.unread_count > 0 && (
                      <span className="bg-[#5B8CFF] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {conv.unread_count}
                      </span>
                    )}
                    <Badge
                      className="text-[10px] px-1.5 py-0 h-4 border font-medium"
                      style={{ backgroundColor: `${cfg.color}12`, color: cfg.color, borderColor: `${cfg.color}25` }}
                    >
                      {cfg.label}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
