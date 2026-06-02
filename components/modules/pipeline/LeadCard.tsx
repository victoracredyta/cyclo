'use client'

import { useRouter } from 'next/navigation'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Clock, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lead } from '@/types/database'

type LeadWithResponsible = Lead & {
  responsible: { id: string; full_name: string | null; avatar_url: string | null } | null
}

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-red-500/10 text-red-500 border-red-500/20',
  media: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  baixa: 'bg-muted text-muted-foreground border-border',
}

function daysInStage(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 864e5)
}

interface LeadCardProps {
  lead: LeadWithResponsible
  isDragging?: boolean
}

export function LeadCard({ lead, isDragging = false }: LeadCardProps) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: lead.id })

  const style = { transform: CSS.Transform.toString(transform), transition }
  const days = daysInStage(lead.created_at)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card border border-border rounded-xl p-3 cursor-pointer select-none group',
        'hover:border-[#5B8CFF]/40 hover:shadow-sm transition-all',
        (isSortableDragging || isDragging) && 'opacity-50 shadow-lg border-[#5B8CFF]/60',
      )}
    >
      {/* Drag handle + title row */}
      <div className="flex items-start gap-1.5">
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0" onClick={() => router.push(`/pipeline/${lead.id}`)}>
          <p className="font-medium text-sm leading-snug truncate">{lead.name}</p>
          {lead.company && <p className="text-xs text-muted-foreground truncate">{lead.company}</p>}
        </div>
      </div>

      {/* Value */}
      {lead.value && (
        <div className="mt-2 font-bold text-sm text-[#5B8CFF]" onClick={() => router.push(`/pipeline/${lead.id}`)}>
          R$ {lead.value.toLocaleString('pt-BR')}
        </div>
      )}

      {/* Tags + meta */}
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap" onClick={() => router.push(`/pipeline/${lead.id}`)}>
        {lead.tag && (
          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-[#5B8CFF]/10 text-[#5B8CFF] border-0">{lead.tag}</Badge>
        )}
        <Badge className={cn('text-[10px] px-1.5 py-0 h-4 border', PRIORITY_COLORS[lead.priority])}>
          {lead.priority}
        </Badge>
        <div className={cn(
          'flex items-center gap-0.5 text-[10px] ml-auto',
          days > 10 ? 'text-red-500' : 'text-muted-foreground'
        )}>
          <Clock className="w-2.5 h-2.5" />
          {days}d
        </div>
        {lead.responsible && (
          <Avatar className="h-5 w-5 ml-0.5">
            <AvatarImage src={lead.responsible.avatar_url ?? undefined} />
            <AvatarFallback className="text-[8px] bg-[#5B8CFF] text-white">
              {(lead.responsible.full_name ?? 'U').charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Next action */}
      {lead.next_action && (
        <p className="mt-1.5 text-[10px] text-muted-foreground truncate" onClick={() => router.push(`/pipeline/${lead.id}`)}>
          → {lead.next_action}
        </p>
      )}
    </div>
  )
}
