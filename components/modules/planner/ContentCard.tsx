'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type ContentItem = {
  id: string
  title: string | null
  channel: string | null
  format: string | null
  objective: string | null
  status: string
  scheduled_date: string | null
  client: { id: string; name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  producao: '#5B8CFF',
  aguardando: '#F59E0B',
  ajuste: '#e1493c',
  aprovado: '#12B981',
  publicado: '#6B7280',
}

export const CHANNEL_ICONS: Record<string, string> = {
  instagram: '📷',
  facebook: '👤',
  linkedin: '💼',
  tiktok: '🎵',
  youtube: '▶️',
  twitter: '🐦',
}

interface ContentCardProps {
  item: ContentItem
  onClick?: () => void
}

export function ContentCard({ item, onClick }: ContentCardProps) {
  const color = STATUS_COLORS[item.status] ?? '#6B7280'

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-[#5B8CFF]/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="font-medium text-sm leading-snug line-clamp-2 flex-1">{item.title ?? 'Sem título'}</p>
        {item.channel && (
          <span className="text-base shrink-0 leading-none mt-0.5">{CHANNEL_ICONS[item.channel] ?? '📄'}</span>
        )}
      </div>
      {item.client && (
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.client.name}</p>
      )}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {item.format && (
          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-muted text-muted-foreground border-0">{item.format}</Badge>
        )}
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          {item.scheduled_date && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(item.scheduled_date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
