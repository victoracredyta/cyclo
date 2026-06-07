'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
  closestCorners,
} from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Filter, X, Users, CalendarDays, Kanban, ChevronDown, Check, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PipelineColumn } from './PipelineColumn'
import { LeadCard, type LeadTag } from './LeadCard'
import { NewLeadModal } from './NewLeadModal'
import type { PipelineStage, Lead } from '@/types/database'
import Link from 'next/link'

const LOCAL_TAGS_KEY = 'cyclo_lead_tags'

type DBFunnel = { id: string; name: string; description: string | null; is_default: boolean; created_at: string }

export type LeadWithResponsible = Lead & {
  responsible: { id: string; full_name: string | null; avatar_url: string | null } | null
}

interface PipelineBoardProps {
  initialStages: PipelineStage[]
  initialLeads: LeadWithResponsible[]
  users: Array<{ id: string; full_name: string | null; avatar_url: string | null }>
  initialFunnels: DBFunnel[]
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

export function PipelineBoard({ initialStages, initialLeads, users, initialFunnels }: PipelineBoardProps) {
  const router = useRouter()
  const [stages] = useState(initialStages)
  const [leads, setLeads] = useState(initialLeads)
  const [funnels] = useState(initialFunnels)
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

  // Funnels
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(() => {
    const def = initialFunnels.find(f => f.is_default)
    return def ? def.id : (initialFunnels[0]?.id ?? 'all')
  })
  const [showFunnelDropdown, setShowFunnelDropdown] = useState(false)

  // Tags from localStorage
  const [availableTags, setAvailableTags] = useState<LeadTag[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    try {
      const t = localStorage.getItem(LOCAL_TAGS_KEY)
      if (t) setAvailableTags(JSON.parse(t))
    } catch {}
  }, [])

  const visibleStages = useMemo(() => {
    if (selectedFunnelId === 'all') return stages
    return stages.filter(s => (s as PipelineStage & { funnel_id?: string | null }).funnel_id === selectedFunnelId)
  }, [stages, selectedFunnelId])

  const handleTagChange = useCallback(async (leadId: string, tagName: string | null) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tag: tagName } : l))
    const supabase = createClient()
    const { error } = await supabase.from('leads').update({ tag: tagName }).eq('id', leadId)
    if (error) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tag: leads.find(x => x.id === leadId)?.tag ?? null } : l))
      toast.error('Erro ao salvar tag')
    }
  }, [leads])

  const activeFiltersCount = [
    filterSeller !== 'all', filterPeriod !== 'all',
    filterTemp !== 'all', filterOrigin !== 'all',
  ].filter(Boolean).length

  const filteredLeads = useMemo(() => {
    let result = leads
    // Filter by funnel
    if (selectedFunnelId !== 'all') {
      const stageIds = new Set(visibleStages.map(s => s.id))
      result = result.filter(l => l.stage_id && stageIds.has(l.stage_id))
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l => l.name.toLowerCase().includes(q) || (l.company ?? '').toLowerCase().includes(q))
    }
    if (filterSeller !== 'all') result = result.filter(l => l.responsible_id === filterSeller)
    if (filterPeriod !== 'all') {
      const days = filterPeriod === '7d' ? 7 : filterPeriod === '30d' ? 30 : 90
      const cutoff = Date.now() - days * 864e5
      result = result.filter(l => new Date(l.created_at).getTime() >= cutoff)
    }
    if (filterTemp !== 'all') result = result.filter(l => l.priority === filterTemp)
    if (filterOrigin !== 'all') result = result.filter(l => l.origin === filterOrigin)
    return result
  }, [leads, search, filterSeller, filterPeriod, filterTemp, filterOrigin, selectedFunnelId, visibleStages])

  const leadsByStage = useMemo(() => {
    const map: Record<string, LeadWithResponsible[]> = {}
    visibleStages.forEach(s => { map[s.id] = [] })
    filteredLeads.forEach(l => {
      if (l.stage_id && map[l.stage_id]) map[l.stage_id].push(l)
    })
    return map
  }, [filteredLeads, visibleStages])

  const totalValue = filteredLeads.reduce((s, l) => s + (l.value ?? 0), 0)
  const hotCount = filteredLeads.filter(l => l.priority === 'alta').length
  const warmCount = filteredLeads.filter(l => l.priority === 'media').length
  const coldCount = filteredLeads.filter(l => l.priority === 'baixa').length

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null

  const handleDragStart = useCallback((e: DragStartEvent) => { setActiveId(String(e.active.id)) }, [])

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
    setFilterSeller('all'); setFilterPeriod('all'); setFilterTemp('all'); setFilterOrigin('all')
  }

  const selectedFunnel = funnels.find(f => f.id === selectedFunnelId)

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold">Pipeline de Vendas</h2>

            {/* Funnel selector */}
            {funnels.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowFunnelDropdown(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors"
                >
                  <Kanban className="w-3.5 h-3.5" />
                  {selectedFunnelId === 'all' ? 'Todos os funis' : (selectedFunnel?.name ?? 'Funil')}
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showFunnelDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFunnelDropdown(false)} />
                    <div className="absolute left-0 top-8 z-50 bg-card border border-border rounded-xl shadow-lg p-1.5 min-w-[200px]">
                      <button
                        onClick={() => { setSelectedFunnelId('all'); setShowFunnelDropdown(false) }}
                        className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors hover:bg-muted', selectedFunnelId === 'all' && 'font-semibold text-[#5B8CFF]')}
                      >
                        {selectedFunnelId === 'all' ? <Check className="w-3 h-3 text-[#5B8CFF]" /> : <span className="w-3" />}
                        Todos os funis
                      </button>
                      {funnels.map(f => (
                        <button
                          key={f.id}
                          onClick={() => { setSelectedFunnelId(f.id); setShowFunnelDropdown(false) }}
                          className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors hover:bg-muted', selectedFunnelId === f.id && 'font-semibold text-[#5B8CFF]')}
                        >
                          {selectedFunnelId === f.id ? <Check className="w-3 h-3 text-[#5B8CFF]" /> : <span className="w-3" />}
                          {f.name}
                          {f.is_default && <span className="ml-auto text-[9px] text-[#12B981] font-semibold">padrão</span>}
                        </button>
                      ))}
                      <div className="border-t border-border mt-1 pt-1">
                        <Link href="/configuracoes" onClick={() => setShowFunnelDropdown(false)}>
                          <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left text-muted-foreground hover:bg-muted transition-colors">
                            <Settings className="w-3 h-3" /> Gerenciar funis
                          </button>
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
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
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 w-44 text-sm" />
          </div>
          <Button
            size="sm" variant="outline"
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
            size="sm" className="text-white gap-1.5 text-xs bg-[#5B8CFF] hover:bg-[#4a7aee]"
            onClick={() => { setDefaultStageId(visibleStages[0]?.id ?? stages[0]?.id); setShowNewLead(true) }}
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
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.id}</SelectItem>)}
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
                <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterOrigin} onValueChange={v => v && setFilterOrigin(v)}>
                <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as origens</SelectItem>
                  {ALL_ORIGINS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>

              {activeFiltersCount > 0 && (
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground gap-1" onClick={clearFilters}>
                  <X className="w-3 h-3" /> Limpar
                </Button>
              )}
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
            {visibleStages.map(stage => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                leads={leadsByStage[stage.id] ?? []}
                onAddLead={() => { setDefaultStageId(stage.id); setShowNewLead(true) }}
                availableTags={availableTags}
                onTagChange={handleTagChange}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? (
              <div className="rotate-2 opacity-90">
                <LeadCard lead={activeLead} isDragging availableTags={availableTags} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {showNewLead && (
        <NewLeadModal
          stages={visibleStages.length > 0 ? visibleStages : stages}
          users={users}
          defaultStageId={defaultStageId}
          defaultFunnelId={selectedFunnelId !== 'all' ? selectedFunnelId : undefined}
          funnels={funnels}
          onClose={() => setShowNewLead(false)}
          onCreated={handleLeadCreated}
        />
      )}
    </div>
  )
}
