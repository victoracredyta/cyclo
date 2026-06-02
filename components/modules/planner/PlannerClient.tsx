'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, LayoutGrid, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { ContentCard, CHANNEL_ICONS, type ContentItem } from './ContentCard'
import { NewContentModal } from './NewContentModal'
import { cn } from '@/lib/utils'

const STATUSES = ['producao', 'aguardando', 'ajuste', 'aprovado', 'publicado'] as const
const STATUS_LABELS: Record<string, string> = {
  producao: 'Produção', aguardando: 'Aguardando', ajuste: 'Ajuste', aprovado: 'Aprovado', publicado: 'Publicado',
}
const STATUS_COLORS: Record<string, string> = {
  producao: '#5B8CFF', aguardando: '#F59E0B', ajuste: '#e1493c', aprovado: '#12B981', publicado: '#6B7280',
}
const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

interface PlannerClientProps {
  items: ContentItem[]
  clients: Array<{ id: string; name: string }>
}

export function PlannerClient({ items: initialItems, clients }: PlannerClientProps) {
  const today = new Date()
  const [view, setView] = useState<'calendar' | 'kanban'>('calendar')
  const [calDate, setCalDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [filterClient, setFilterClient] = useState('all')
  const [filterChannel, setFilterChannel] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [newDate, setNewDate] = useState<string | undefined>()
  const [items, setItems] = useState(initialItems)

  const year = calDate.getFullYear()
  const month = calDate.getMonth()

  const calendarGrid = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const grid: (number | null)[] = []
    for (let i = 0; i < firstDow; i++) grid.push(null)
    for (let d = 1; d <= daysInMonth; d++) grid.push(d)
    return grid
  }, [year, month])

  const filtered = useMemo(() => items.filter(item => {
    if (filterClient !== 'all' && item.client?.id !== filterClient) return false
    if (filterChannel !== 'all' && item.channel !== filterChannel) return false
    return true
  }), [items, filterClient, filterChannel])

  const getItemsForDay = (day: number) =>
    filtered.filter(i => i.scheduled_date === toDateStr(year, month, day))

  const handleCreated = (item: ContentItem) => {
    setItems(prev => [...prev, item])
    setShowNew(false)
    setNewDate(undefined)
  }

  const openDay = (day: number) => {
    setNewDate(toDateStr(year, month, day))
    setShowNew(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Planner de Conteúdo</h2>
          <p className="text-sm text-muted-foreground">{items.length} peças programadas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
            <button
              onClick={() => setView('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                view === 'calendar' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Calendar className="w-3.5 h-3.5" /> Calendário
            </button>
            <button
              onClick={() => setView('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                view === 'kanban' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>
          <Button
            size="sm"
            className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-xs"
            onClick={() => setShowNew(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Nova peça
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {view === 'calendar' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCalDate(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold w-36 text-center">{MONTHS[month]} {year}</span>
            <button
              onClick={() => setCalDate(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          <Select value={filterClient} onValueChange={v => setFilterClient(v ?? 'all')}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterChannel} onValueChange={v => setFilterChannel(v ?? 'all')}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canais</SelectItem>
              {Object.entries(CHANNEL_ICONS).map(([ch, icon]) => (
                <SelectItem key={ch} value={ch}>{icon} {ch.charAt(0).toUpperCase() + ch.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {WEEK_DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground tracking-wide">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarGrid.map((day, i) => {
              if (!day) return (
                <div key={`e-${i}`} className="min-h-[100px] border-b border-r border-border bg-muted/10 last:border-r-0" />
              )
              const dayItems = getItemsForDay(day)
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
              const isWeekend = (i % 7 === 0 || i % 7 === 6)

              return (
                <div
                  key={day}
                  onClick={() => openDay(day)}
                  className={cn(
                    'min-h-[100px] border-b border-r border-border p-1.5 cursor-pointer transition-colors group',
                    'last:border-r-0 hover:bg-muted/20',
                    isToday && 'bg-[#5B8CFF]/5',
                    isWeekend && 'bg-muted/5',
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1',
                    isToday ? 'bg-[#5B8CFF] text-white' : 'text-muted-foreground',
                  )}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map(item => (
                      <div
                        key={item.id}
                        onClick={e => e.stopPropagation()}
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate leading-snug"
                        style={{
                          backgroundColor: `${STATUS_COLORS[item.status] ?? '#6B7280'}18`,
                          color: STATUS_COLORS[item.status] ?? '#6B7280',
                        }}
                      >
                        {item.channel && CHANNEL_ICONS[item.channel]} {item.title ?? 'Sem título'}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <p className="text-[10px] text-muted-foreground pl-1">+{dayItems.length - 3}</p>
                    )}
                    {dayItems.length === 0 && (
                      <p className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity pl-1 flex items-center gap-0.5">
                        <Plus className="w-2.5 h-2.5" /> Adicionar
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map(status => {
            const colItems = filtered.filter(item => item.status === status)
            return (
              <div key={status} className="flex flex-col w-60 shrink-0">
                <div className="flex items-center gap-2 mb-2.5 px-0.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[status] }} />
                  <span className="font-semibold text-sm">{STATUS_LABELS[status]}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full ml-auto">
                    {colItems.length}
                  </span>
                </div>
                <div className="flex-1 flex flex-col gap-2 p-2 rounded-xl bg-muted/40 min-h-[200px]">
                  {colItems.map(item => <ContentCard key={item.id} item={item} />)}
                  {colItems.length === 0 && (
                    <div className="flex-1 flex items-center justify-center py-10 text-xs text-muted-foreground">
                      Nenhuma peça
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNew && (
        <NewContentModal
          clients={clients}
          defaultDate={newDate}
          onClose={() => { setShowNew(false); setNewDate(undefined) }}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
