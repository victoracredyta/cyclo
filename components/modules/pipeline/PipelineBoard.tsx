'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
  closestCorners,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Filter, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PipelineColumn } from './PipelineColumn'
import { LeadCard } from './LeadCard'
import { NewLeadModal } from './NewLeadModal'
import type { PipelineStage, Lead } from '@/types/database'

type LeadWithResponsible = Lead & {
  responsible: { id: string; full_name: string | null; avatar_url: string | null } | null
}

interface PipelineBoardProps {
  initialStages: PipelineStage[]
  initialLeads: LeadWithResponsible[]
  users: Array<{ id: string; full_name: string | null; avatar_url: string | null }>
}

export function PipelineBoard({ initialStages, initialLeads, users }: PipelineBoardProps) {
  const router = useRouter()
  const [stages] = useState(initialStages)
  const [leads, setLeads] = useState(initialLeads)
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showNewLead, setShowNewLead] = useState(false)
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const filteredLeads = useMemo(() => {
    if (!search) return leads
    const q = search.toLowerCase()
    return leads.filter(l => l.name.toLowerCase().includes(q) || (l.company ?? '').toLowerCase().includes(q))
  }, [leads, search])

  const leadsByStage = useMemo(() => {
    const map: Record<string, LeadWithResponsible[]> = {}
    stages.forEach(s => { map[s.id] = [] })
    filteredLeads.forEach(l => {
      if (l.stage_id && map[l.stage_id]) map[l.stage_id].push(l)
    })
    return map
  }, [filteredLeads, stages])

  const totalValue = leads.reduce((s, l) => s + (l.value ?? 0), 0)

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id))
  }, [])

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return

    const leadId = String(active.id)
    // over could be a column id or another card id
    const overId = String(over.id)

    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    // Determine target stage
    let targetStageId: string | null = null
    if (stages.find(s => s.id === overId)) {
      targetStageId = overId
    } else {
      const overLead = leads.find(l => l.id === overId)
      if (overLead) targetStageId = overLead.stage_id
    }

    if (!targetStageId || targetStageId === lead.stage_id) return

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: targetStageId } : l))

    const supabase = createClient()
    const { error } = await supabase.from('leads').update({ stage_id: targetStageId }).eq('id', leadId)
    if (error) {
      toast.error('Erro ao mover lead')
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: lead.stage_id } : l))
    }
  }, [leads, stages])

  const handleDragOver = useCallback((e: DragOverEvent) => {
    // Visual feedback handled by CSS
  }, [])

  const handleLeadCreated = (newLead: LeadWithResponsible) => {
    setLeads(prev => [...prev, newLead])
    setShowNewLead(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1">
          <h2 className="text-xl font-bold">Pipeline de Vendas</h2>
          <p className="text-sm text-muted-foreground">
            {leads.length} oportunidades · R$ {totalValue.toLocaleString('pt-BR')} em aberto
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 w-48 text-sm"
            />
          </div>
          <Button
            size="sm"
            className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-xs"
            onClick={() => { setDefaultStageId(stages[0]?.id); setShowNewLead(true) }}
          >
            <Plus className="w-3.5 h-3.5" /> Novo lead
          </Button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="flex gap-3 h-full pb-4 min-w-max">
            {stages.map(stage => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                leads={leadsByStage[stage.id] ?? []}
                onAddLead={() => { setDefaultStageId(stage.id); setShowNewLead(true) }}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? (
              <div className="rotate-2 opacity-90">
                <LeadCard lead={activeLead} isDragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {showNewLead && (
        <NewLeadModal
          stages={stages}
          users={users}
          defaultStageId={defaultStageId}
          onClose={() => setShowNewLead(false)}
          onCreated={handleLeadCreated}
        />
      )}
    </div>
  )
}
