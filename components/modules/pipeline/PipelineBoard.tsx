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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Filter, X, Users, CalendarDays, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PipelineColumn } from './PipelineColumn'
import { LeadCard } from './LeadCard'
import { NewLeadModal } from './NewLeadModal'
import type { PipelineStage, Lead } from '@/types/database'
import Link from 'next/link'

export type LeadWithResponsible = Lead & {
  responsible: { id: string; full_name: string | null; avatar_url: string | null } | null
}

interface PipelineBoardProps {
  initialStages: PipelineStage[]
  initialLeads: LeadWithResponsible[]
  users: Array<{ id: string; full_name: string | null; avatar_url: string | null }>
}

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todos os períodos' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
]

const TEMP_OPTIONS = [
  { value: 'all', label: 'Qualquer temperatura' },
  { value: 'alta', label: '🔥 Quente (Alta)' },
  { value: 'media', label: '🌡️ Morno (Média)' },
  { value: 'baixa', label: '❄️ Frio (Baixa)' },
]

const ALL_ORIGINS = [
  'Google Ads', 'Meta Ads', 'LinkedIn Ads', 'Instagram Orgânico',
  'TikTok Ads', 'WhatsApp', 'Indicação', 'Prospecção Ativa',
  'Evento', 'E-mail Marketing', 'Orgânico / SEO', 'Referral',
]

export function PipelineBoard({ initialStages, initialLeads, users }: PipelineBoardProps) {
  const router = useRouter()
  const [stages] = useState(initialStages)
  const [leads, setLeads] = useState(initialLeads)
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showNewLead, setShowNewLead] = useState(false)
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>()
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [filterSeller, setFilterSeller] = useState('all')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [filterTemp, setFilterTemp] = useState('all')
  const [filterOrigin, setFilterOrigin] = useState('all')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const activeFiltersCount = [
    filterSeller !== 'all', filterPeriod !== 'all',
    filterTemp !== 'all', filterOrigin !== 'all',
  ].filter(Boolean).length

  const filteredLeads = useMemo(() => {
    let result = leads
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l => l.name.toLowerCase().includes(q) || (l.company ?? '').toLowerCase().includes(q))
    }
    if (filterSeller !== 'all') {
      result = result.filter(l => l.responsible_id === filterSeller)
    }
    if (filterPeriod !== 'all') {
      const days = filterPeriod === '7d' ? 7 : filterPeriod === '30d' ? 30 : 90
      const cutoff = Date.now() - days * 864e5
      result = result.filter(l => new Date(l.created_at).getTime() >= cutoff)
    }
    if (filterTemp !== 'all') {
      result = result.filter(l => l.priority === filterTemp)
    }
    if (filterOrigin !== 'all') {
      result = result.filter(l => l.origin === filterOrigin)
    }
    return result
  }, [leads, search, filterSeller, filterPeriod, filterTemp, filterOrigin])

  const leadsByStage = useMemo(() => {
    const map: Record<string, LeadWithResponsible[]> = {}
    stages.forEach(s => { map[s.id] = [] })
    filteredLeads.forEach(l => {
      if (l.stage_id && map[l.stage_id]) map[l.stage_id].push(l)
    })
    return map
  }, [filteredLeads, stages])

  const totalValue = filteredLeads.reduce((s, l) => s + (l.value ?? 0), 0)

  const hotCount = filteredLeads.filter(l => l.priority === 'alta').length
  const warmCount = filteredLeads.filter(l => l.priority === 'media').length
  const coldCount = filteredLeads.filter(l => l.priority === 'baixa').length

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id))
  }, [])

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const leadId = String(active.id)
    const overId = String(over.id)
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return
    let targetStageId: string | null = null
    if (stages.find(s => s.id === overId)) {
      targetStageId = overId
    } else {
      const overLead = leads.find(l => l.id === overId)
      if (overLead) targetStageId = overLead.stage_id
    }
    if (!targetStageId || targetStageId === lead.stage_id) return
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: targetStageId } : l))
    const supabase = createClient()
    const { error } = await supabase.from('leads').update({ stage_id: targetStageId }).eq('id', leadId)
    if (error) {
      toast.error('Erro ao mover lead')
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: lead.stage_id } : l))
    }
  }, [leads, stages])

  const handleDragOver = useCallback((_e: DragOverEvent) => {}, [])

  const handleLeadCreated = (newLead: LeadWithResponsible) => {
    setLeads(prev => [...prev, newLead])
    setShowNewLead(false)
    router.refresh()
  }

  const clearFilters = () => {
    setFilterSeller('all')
    setFilterPeriod('all')
    setFilterTemp('all')
    setFilterOrigin('all')
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1">
          <h2 className="text-xl font-bold">Pipeline de Vendas</h2>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{filteredLeads.length} oportunidades · R$ {totalValue.toLocaleString('pt-BR')}</span>
            {hotCount > 0 && <span className="text-red-500">🔥 {hotCount} quente{hotCount > 1 ? 's' : ''}</span>}
            {warmCount > 0 && <span className="text-yellow-500">🌡️ {warmCount} morno{warmCount > 1 ? 's' : ''}</span>}
            {coldCount > 0 && <span className="text-blue-500">❄️ {coldCount} frio{coldCount > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 w-44 text-sm"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className={cn('gap-1.5 text-xs h-9 relative', showFilters && 'border-[#5B8CFF] text-[#5B8CFF]')}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#5B8CFF] text-white text-[9px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
          <Button
            size="sm"
            className="text-white gap-1.5 text-xs bg-[#5B8CFF] hover:bg-[#4a7aee]"
            onClick={() => { setDefaultStageId(stages[0]?.id); setShowNewLead(true) }}
          >
            <Plus className="w-3.5 h-3.5" /> Novo lead
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-xl border border-border">
              <Select value={filterSeller} onValueChange={v => v && setFilterSeller(v)}>
                <SelectTrigger className="h-8 text-xs w-44 gap-1">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterPeriod} onValueChange={v => v && setFilterPeriod(v)}>
                <SelectTrigger className="h-8 text-xs w-44 gap-1">
                  <CalendarDays className="w-3 h-3 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterTemp} onValueChange={v => v && setFilterTemp(v)}>
                <SelectTrigger className="h-8 text-xs w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterOrigin} onValueChange={v => v && setFilterOrigin(v)}>
                <SelectTrigger className="h-8 text-xs w-44">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as origens</SelectItem>
                  {ALL_ORIGINS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>

              {activeFiltersCount > 0 && (
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground gap-1" onClick={clearFilters}>
                  <X className="w-3 h-3" /> Limpar filtros
                </Button>
              )}

              <div className="ml-auto flex items-center gap-2">
                <Link href="/configuracoes">
                  <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground gap-1">
                    <Settings className="w-3 h-3" /> Configurar acesso por vendedor
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
