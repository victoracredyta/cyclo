'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Building2, Phone, Clock, GripVertical, Tag, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Lead } from '@/types/database'

type LeadWithResponsible = Lead & {
  responsible: { id: string; full_name: string | null; avatar_url: string | null } | null
}

export type LeadTag = { id: string; name: string; color: string }

const TEMP_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  alta:  { emoji: '🔥', color: '#e1493c', bg: '#e1493c15' },
  media: { emoji: '🌡️', color: '#F59E0B', bg: '#F59E0B15' },
  baixa: { emoji: '❄️', color: '#5B8CFF', bg: '#5B8CFF15' },
}

const ORIGIN_COLOR: Record<string, string> = {
  'Google Ads': '#4285F4', 'Meta Ads': '#1877F2', 'LinkedIn Ads': '#0A66C2',
  'LinkedIn': '#0A66C2', 'Instagram Orgânico': '#E4405F', 'Instagram': '#E4405F',
  'TikTok Ads': '#010101', 'WhatsApp': '#25D366', 'Indicação': '#12B981',
  'Prospecção Ativa': '#F59E0B', 'Prospecção': '#F59E0B', 'Evento': '#8B5CF6',
  'E-mail Marketing': '#EC4899', 'Orgânico / SEO': '#6B7280', 'Orgânico': '#6B7280',
  'Referral': '#14B8A6',
}

function daysAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 864e5)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

interface LeadCardProps {
  lead: LeadWithResponsible
  isDragging?: boolean
  availableTags?: LeadTag[]
  onTagChange?: (leadId: string, tagName: string | null) => void
}

export function LeadCard({ lead, isDragging = false, availableTags = [], onTagChange }: LeadCardProps) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: lead.id })
  const [showTagPicker, setShowTagPicker] = useState(false)

  const style = { transform: CSS.Transform.toString(transform), transition }
  const days = daysAgo(lead.created_at)
  const temp = TEMP_CONFIG[lead.priority] ?? TEMP_CONFIG.media
  const oc = ORIGIN_COLOR[lead.origin ?? ''] ?? '#6B7280'
  const stuck = days >= 21 ? 'danger' : days >= 14 ? 'warn' : 'ok'
  const currentTag = availableTags.find(t => t.name === lead.tag)

  const applyTag = async (tagName: string | null) => {
    setShowTagPicker(false)
    if (onTagChange) {
      onTagChange(lead.id, tagName)
    } else {
      const supabase = createClient()
      await supabase.from('leads').update({ tag: tagName }).eq('id', lead.id)
    }
  }

  const navigate = () => router.push(`/pipeline/${lead.id}`)

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderColor: (isSortableDragging || isDragging)
          ? 'var(--brand-primary,#5B8CFF)'
          : stuck === 'danger' ? '#e1493c60' : stuck === 'warn' ? '#F59E0B40' : undefined,
      }}
      className={cn(
        'bg-card border border-border rounded-xl cursor-pointer select-none group relative overflow-hidden',
        'hover:shadow-sm transition-all',
        stuck === 'danger' && 'border-red-500/40 bg-red-500/[0.02]',
        stuck === 'warn' && 'border-yellow-500/30',
        (isSortableDragging || isDragging) && 'opacity-50 shadow-lg',
      )}
    >
      {/* Origin color bar */}
      {lead.origin && (
        <div className="h-0.5 w-full" style={{ background: oc }} />
      )}

      <div className="p-3 space-y-2">
        {/* Row 1: drag handle + name + tag button */}
        <div className="flex items-start gap-1.5">
          <button
            {...listeners} {...attributes}
            className="mt-0.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 min-w-0" onClick={navigate}>
            <p className="font-semibold text-sm leading-snug truncate">{lead.name}</p>
          </div>
          {availableTags.length > 0 && (
            <div className="relative shrink-0">
              <button
                onClick={e => { e.stopPropagation(); setShowTagPicker(v => !v) }}
                className={cn(
                  'p-1 rounded transition-colors',
                  showTagPicker || lead.tag ? 'opacity-100 text-[#5B8CFF]' : 'opacity-0 group-hover:opacity-60 text-muted-foreground hover:text-foreground',
                )}
              >
                <Tag className="w-3 h-3" />
              </button>
              {showTagPicker && (
                <div
                  className="absolute right-0 top-6 z-50 bg-card border border-border rounded-xl shadow-lg p-2 min-w-[160px] space-y-1"
                  onClick={e => e.stopPropagation()}
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-1">Tags</p>
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => applyTag(lead.tag === tag.name ? null : tag.name)}
                      className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-muted text-left')}
                      style={lead.tag === tag.name ? { outline: `2px solid ${tag.color}` } : {}}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tag.color }} />
                      {tag.name}
                      {lead.tag === tag.name && <X className="w-2.5 h-2.5 ml-auto text-muted-foreground" />}
                    </button>
                  ))}
                  {lead.tag && (
                    <button onClick={() => applyTag(null)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors">
                      <X className="w-2.5 h-2.5" /> Remover tag
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 2: empresa */}
        {lead.company && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground" onClick={navigate}>
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.company}</span>
          </div>
        )}

        {/* Row 3: valor + telefone */}
        <div className="flex items-center gap-2" onClick={navigate}>
          {lead.value != null && (
            <span className="font-bold text-sm" style={{ color: 'var(--brand-primary,#5B8CFF)' }}>
              R$ {lead.value.toLocaleString('pt-BR')}
            </span>
          )}
          {lead.phone && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
              <Phone className="w-2.5 h-2.5" />
              {lead.phone}
            </span>
          )}
        </div>

        {/* Row 4: badges — origem + temperatura + tag */}
        <div className="flex items-center gap-1.5 flex-wrap" onClick={navigate}>
          {lead.origin && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: `${oc}18`, color: oc }}>
              {lead.origin}
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: temp.bg, color: temp.color }}>
            {temp.emoji}
          </span>
          {currentTag && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-white" style={{ background: currentTag.color }}>
              {currentTag.name}
            </span>
          )}
          {lead.tag && !currentTag && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
              {lead.tag}
            </span>
          )}
        </div>

        {/* Row 5: próxima ação */}
        {lead.next_action && (
          <p className="text-[10px] text-muted-foreground truncate leading-snug" onClick={navigate}>
            → {lead.next_action}
          </p>
        )}

        {/* Row 6: meta — dias + data + responsável */}
        <div className="flex items-center gap-1.5 pt-0.5" onClick={navigate}>
          <div className={cn(
            'flex items-center gap-0.5 text-[10px]',
            stuck === 'danger' ? 'text-red-500 font-semibold' : stuck === 'warn' ? 'text-yellow-500' : 'text-muted-foreground'
          )}>
            <Clock className="w-2.5 h-2.5" />
            {days}d{stuck !== 'ok' && <span className="ml-0.5">{stuck === 'danger' ? '⚠️' : '!'}</span>}
          </div>
          <span className="text-[10px] text-muted-foreground">{formatDate(lead.created_at)}</span>
          {lead.responsible && (
            <Avatar className="h-5 w-5 ml-auto shrink-0">
              <AvatarImage src={lead.responsible.avatar_url ?? undefined} />
              <AvatarFallback className="text-[8px] text-white" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                {(lead.responsible.full_name ?? 'U').charAt(0)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      {showTagPicker && <div className="fixed inset-0 z-40" onClick={() => setShowTagPicker(false)} />}
    </div>
  )
}
