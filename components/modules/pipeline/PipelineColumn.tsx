'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { LeadCard } from './LeadCard'
import { cn } from '@/lib/utils'
import type { PipelineStage, Lead } from '@/types/database'

type LeadWithResponsible = Lead & {
  responsible: { id: string; full_name: string | null; avatar_url: string | null } | null
}

interface PipelineColumnProps {
  stage: PipelineStage
  leads: LeadWithResponsible[]
  onAddLead: () => void
}

export function PipelineColumn({ stage, leads, onAddLead }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const totalValue = leads.reduce((s, l) => s + (l.value ?? 0), 0)

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="font-semibold text-sm">{stage.name}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{leads.length}</span>
        </div>
        <button onClick={onAddLead} className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {totalValue > 0 && (
        <p className="text-xs text-muted-foreground mb-2.5 px-0.5">
          R$ {totalValue.toLocaleString('pt-BR')}
        </p>
      )}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 flex flex-col gap-2 p-2 rounded-xl min-h-[200px] transition-colors',
          isOver ? 'bg-[#5B8CFF]/8 ring-1 ring-[#5B8CFF]/30' : 'bg-muted/40'
        )}
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={onAddLead}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-8"
            >
              <Plus className="w-3 h-3" /> Adicionar lead
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
