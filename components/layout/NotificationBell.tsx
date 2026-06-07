'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, Loader2, ArrowRight, UserPlus, Activity, Mail, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

const ICONS: Record<string, { Icon: React.ElementType; color: string }> = {
  transferencia: { Icon: UserPlus, color: '#0EA5E9' },
  atividade:     { Icon: Activity, color: '#F59E0B' },
  email:         { Icon: Mail,     color: '#5B8CFF' },
  alerta:        { Icon: AlertCircle, color: '#e1493c' },
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const dd = Math.floor(h / 24)
  return `${dd}d`
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = items.filter(i => !i.is_read).length

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setItems((data ?? []) as Notification[])
    setLoading(false)
  }

  // Initial + periodic refresh
  useEffect(() => {
    load()
    const id = setInterval(load, 30000) // refresh every 30s
    return () => clearInterval(id)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAllRead = async () => {
    if (unread === 0) return
    const supabase = createClient()
    const unreadIds = items.filter(i => !i.is_read).map(i => i.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    setItems(prev => prev.map(i => ({ ...i, is_read: true })))
  }

  const openOne = async (n: Notification) => {
    if (!n.is_read) {
      const supabase = createClient()
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      setItems(prev => prev.map(i => i.id === n.id ? { ...i, is_read: true } : i))
    }
    if (n.link) router.push(n.link)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
        onClick={() => setOpen(o => !o)}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-[#e1493c] border-0">
            {unread > 9 ? '9+' : unread}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div>
              <p className="text-sm font-bold">Notificações</p>
              <p className="text-[11px] text-muted-foreground">
                {unread === 0 ? 'Tudo lido' : `${unread} não lida${unread > 1 ? 's' : ''}`}
              </p>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#5B8CFF] hover:underline font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> Marcar tudo
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                <p className="text-xs">Carregando...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground px-4">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">Nenhuma notificação ainda</p>
                <p className="text-xs mt-1">Atribuições de lead, lembretes e alertas aparecem aqui.</p>
              </div>
            ) : (
              items.map(n => {
                const cfg = ICONS[n.type] ?? ICONS.alerta
                const Icon = cfg.Icon
                return (
                  <button
                    key={n.id}
                    onClick={() => openOne(n)}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors hover:bg-muted/40 flex gap-3',
                      !n.is_read && 'bg-[#5B8CFF]/5'
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cfg.color}15` }}>
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 justify-between">
                        <p className={cn('text-sm leading-tight truncate', !n.is_read ? 'font-bold' : 'font-medium')}>{n.title}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.message && <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.message}</p>}
                      {n.link && (
                        <p className="text-[10px] text-[#5B8CFF] mt-1 flex items-center gap-0.5">
                          Ver detalhes <ArrowRight className="w-2.5 h-2.5" />
                        </p>
                      )}
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#5B8CFF] shrink-0 mt-1.5" />}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 bg-muted/30">
            <button
              onClick={() => { router.push('/configuracoes?tab=notificacoes'); setOpen(false) }}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-center"
            >
              Configurar preferências de notificação →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
