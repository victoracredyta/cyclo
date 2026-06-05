'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ChevronLeft, ChevronRight, Clock, Building2 } from 'lucide-react'
import { NewEventModal, type CalEvent } from './NewEventModal'
import { cn } from '@/lib/utils'

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_LABELS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  meeting:  { label: 'Reunião',  color: '#5B8CFF' },
  call:     { label: 'Ligação',  color: '#12B981' },
  task:     { label: 'Tarefa',   color: '#F59E0B' },
  deadline: { label: 'Prazo',    color: '#e1493c' },
  reminder: { label: 'Lembrete', color: '#8B5CF6' },
}

// Brazilian national holidays — covers current year ± 2
const BR_HOLIDAYS: Record<string, string> = {
  // 2025
  '2025-01-01': 'Confraternização Universal',
  '2025-03-03': 'Carnaval',
  '2025-03-04': 'Carnaval',
  '2025-03-05': 'Quarta-feira de Cinzas',
  '2025-04-18': 'Paixão de Cristo',
  '2025-04-21': 'Tiradentes',
  '2025-05-01': 'Dia do Trabalhador',
  '2025-06-19': 'Corpus Christi',
  '2025-09-07': 'Independência do Brasil',
  '2025-10-12': 'Nossa Senhora Aparecida',
  '2025-11-02': 'Finados',
  '2025-11-15': 'Proclamação da República',
  '2025-11-20': 'Consciência Negra',
  '2025-12-25': 'Natal',
  // 2026
  '2026-01-01': 'Confraternização Universal',
  '2026-02-16': 'Carnaval',
  '2026-02-17': 'Carnaval',
  '2026-02-18': 'Quarta-feira de Cinzas',
  '2026-04-03': 'Paixão de Cristo',
  '2026-04-21': 'Tiradentes',
  '2026-05-01': 'Dia do Trabalhador',
  '2026-06-04': 'Corpus Christi',
  '2026-09-07': 'Independência do Brasil',
  '2026-10-12': 'Nossa Senhora Aparecida',
  '2026-11-02': 'Finados',
  '2026-11-15': 'Proclamação da República',
  '2026-11-20': 'Consciência Negra',
  '2026-12-25': 'Natal',
  // 2027
  '2027-01-01': 'Confraternização Universal',
  '2027-02-08': 'Carnaval',
  '2027-02-09': 'Carnaval',
  '2027-02-10': 'Quarta-feira de Cinzas',
  '2027-03-26': 'Paixão de Cristo',
  '2027-04-21': 'Tiradentes',
  '2027-05-01': 'Dia do Trabalhador',
  '2027-05-27': 'Corpus Christi',
  '2027-09-07': 'Independência do Brasil',
  '2027-10-12': 'Nossa Senhora Aparecida',
  '2027-11-02': 'Finados',
  '2027-11-15': 'Proclamação da República',
  '2027-11-20': 'Consciência Negra',
  '2027-12-25': 'Natal',
}

const HOUR_START = 7
const HOUR_END = 21
const PX_PER_HOUR = 64

type View = 'week' | 'month' | 'year'

function getWeekDays(date: Date): Date[] {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getEventPosition(event: CalEvent) {
  const start = new Date(event.start_at)
  const end = new Date(event.end_at)
  const startMins = (start.getHours() - HOUR_START) * 60 + start.getMinutes()
  const endMins = (end.getHours() - HOUR_START) * 60 + end.getMinutes()
  const durationMins = Math.max(endMins - startMins, 30)
  return {
    top: (startMins / 60) * PX_PER_HOUR,
    height: (durationMins / 60) * PX_PER_HOUR,
  }
}

interface AgendaClientProps {
  events: CalEvent[]
  clients: Array<{ id: string; name: string }>
}

export function AgendaClient({ events: initialEvents, clients }: AgendaClientProps) {
  const today = new Date()
  const [view, setView] = useState<View>('week')
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay())
    return d
  })
  const [events, setEvents] = useState(initialEvents)
  const [showNew, setShowNew] = useState(false)
  const [newStart, setNewStart] = useState<string | undefined>()
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)

  // For month view — currentDate represents the 1st of current month
  const currentMonth = view === 'month' || view === 'year' ? currentDate.getMonth() : new Date(currentDate).getMonth()
  const currentYear = currentDate.getFullYear()

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])
  const hours = useMemo(() => Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START), [])

  // Navigation
  const goPrev = () => {
    const d = new Date(currentDate)
    if (view === 'week') d.setDate(d.getDate() - 7)
    else if (view === 'month') d.setMonth(d.getMonth() - 1)
    else d.setFullYear(d.getFullYear() - 1)
    setCurrentDate(d)
  }

  const goNext = () => {
    const d = new Date(currentDate)
    if (view === 'week') d.setDate(d.getDate() + 7)
    else if (view === 'month') d.setMonth(d.getMonth() + 1)
    else d.setFullYear(d.getFullYear() + 1)
    setCurrentDate(d)
  }

  const goToday = () => {
    const d = new Date(today)
    if (view === 'week') d.setDate(today.getDate() - today.getDay())
    else if (view === 'month') d.setDate(1)
    else d.setMonth(0, 1)
    setCurrentDate(d)
  }

  const handleCreated = (e: CalEvent) => {
    setEvents(prev => [...prev, e])
    setShowNew(false)
    setNewStart(undefined)
  }

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    events.forEach(e => {
      const key = new Date(e.start_at).toISOString().split('T')[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    })
    return map
  }, [events])

  const weekLabel = (() => {
    if (view === 'week') {
      const start = weekDays[0]
      const end = weekDays[6]
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} – ${end.getDate()} ${MONTH_SHORT[start.getMonth()]} ${start.getFullYear()}`
      }
      return `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`
    }
    if (view === 'month') return `${MONTH_LABELS[currentMonth]} ${currentYear}`
    return String(currentYear)
  })()

  // Month grid
  function renderMonthView() {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startPad = firstDay.getDay()
    const totalCells = startPad + lastDay.getDate()
    const rows = Math.ceil(totalCells / 7)
    const cells: Array<Date | null> = []

    for (let i = 0; i < startPad; i++) cells.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push(new Date(currentYear, currentMonth, d))
    }
    while (cells.length % 7 !== 0) cells.push(null)

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAY_LABELS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
          ))}
        </div>
        {/* Cells */}
        <div className="flex-1 grid grid-cols-7 overflow-y-auto" style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} className="border-b border-r border-border/50 bg-muted/10" />
            const ds = dateStr(day)
            const holiday = BR_HOLIDAYS[ds]
            const dayEvents = eventsByDay.get(ds) ?? []
            const isToday = dateStr(day) === dateStr(today)
            const isSun = day.getDay() === 0
            const isSat = day.getDay() === 6

            return (
              <div
                key={idx}
                className={cn(
                  'border-b border-r border-border/50 p-1.5 cursor-pointer hover:bg-muted/30 transition-colors min-h-[80px]',
                  (isSun || isSat) && 'bg-muted/10',
                  holiday && 'bg-green-500/5',
                )}
                onClick={() => {
                  const dt = new Date(day)
                  dt.setHours(9, 0)
                  setNewStart(dt.toISOString().slice(0, 16))
                  setShowNew(true)
                }}
              >
                <div className="flex items-start justify-between">
                  <div className={cn(
                    'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold',
                    isToday ? 'text-white' : (isSun ? 'text-red-500' : 'text-foreground'),
                  )} style={isToday ? { background: 'var(--brand-primary,#5B8CFF)' } : undefined}>
                    {day.getDate()}
                  </div>
                  {holiday && (
                    <span className="text-[8px] text-green-600 font-medium leading-tight text-right max-w-[70%]">{holiday}</span>
                  )}
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      className="text-[9px] font-medium px-1 py-0.5 rounded truncate"
                      style={{ background: `${ev.color}20`, color: ev.color }}
                      onClick={e => { e.stopPropagation(); setSelectedEvent(ev) }}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[8px] text-muted-foreground pl-1">+{dayEvents.length - 3}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Year view — 12 mini months
  function renderYearView() {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-4 p-2">
          {Array.from({ length: 12 }, (_, m) => {
            const firstDay = new Date(currentYear, m, 1)
            const lastDay = new Date(currentYear, m + 1, 0)
            const startPad = firstDay.getDay()
            const cells: Array<number | null> = []
            for (let i = 0; i < startPad; i++) cells.push(null)
            for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d)
            while (cells.length % 7 !== 0) cells.push(null)
            const hasEvents = events.some(ev => {
              const d = new Date(ev.start_at)
              return d.getMonth() === m && d.getFullYear() === currentYear
            })

            return (
              <div
                key={m}
                className="border border-border rounded-xl p-3 cursor-pointer hover:border-[--brand-primary,#5B8CFF] transition-colors"
                onClick={() => {
                  const d = new Date(currentYear, m, 1)
                  setCurrentDate(d)
                  setView('month')
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold">{MONTH_SHORT[m]}</p>
                  {hasEvents && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--brand-primary,#5B8CFF)' }} />}
                </div>
                <div className="grid grid-cols-7 gap-0">
                  {DAY_LABELS.map(d => (
                    <div key={d} className="text-[7px] text-muted-foreground text-center py-0.5">{d[0]}</div>
                  ))}
                  {cells.map((day, idx) => {
                    if (!day) return <div key={idx} />
                    const ds = `${currentYear}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const isToday = ds === dateStr(today)
                    const holiday = !!BR_HOLIDAYS[ds]
                    const hasEv = (eventsByDay.get(ds)?.length ?? 0) > 0
                    const isSun = new Date(currentYear, m, day).getDay() === 0

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'text-[8px] text-center py-0.5 rounded-sm relative',
                          isSun ? 'text-red-400' : 'text-muted-foreground',
                          holiday && 'text-green-600',
                          isToday && 'text-white font-bold rounded-full',
                        )}
                        style={isToday ? { background: 'var(--brand-primary,#5B8CFF)' } : undefined}
                      >
                        {day}
                        {hasEv && !isToday && (
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full" style={{ background: 'var(--brand-primary,#5B8CFF)' }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Week view (existing)
  const weekEventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    weekDays.forEach(d => map.set(dateStr(d), []))
    events.forEach(e => {
      const key = new Date(e.start_at).toISOString().split('T')[0]
      if (map.has(key)) map.get(key)!.push(e)
    })
    return map
  }, [events, weekDays])

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold min-w-52 text-center">{weekLabel}</span>
          <button onClick={goNext} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <Button variant="outline" size="sm" onClick={goToday} className="text-xs h-8">Hoje</Button>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            {(['week', 'month', 'year'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  view === v ? 'text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
                style={view === v ? { background: 'var(--brand-primary,#5B8CFF)' } : undefined}
              >
                {v === 'week' ? 'Semana' : v === 'month' ? 'Mês' : 'Ano'}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            className="text-white gap-1.5 text-xs"
            style={{ background: 'var(--brand-primary,#5B8CFF)' }}
            onClick={() => setShowNew(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Novo evento
          </Button>
        </div>
      </div>

      {/* Month view */}
      {view === 'month' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderMonthView()}
        </div>
      )}

      {/* Year view */}
      {view === 'year' && renderYearView()}

      {/* Week view */}
      {view === 'week' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Day headers */}
          <div className="flex border-b border-border shrink-0">
            <div className="w-14 shrink-0" />
            {weekDays.map((day, i) => {
              const isToday = dateStr(day) === dateStr(today)
              const ds = dateStr(day)
              const holiday = BR_HOLIDAYS[ds]
              return (
                <div key={i} className={cn('flex-1 text-center py-2 border-l border-border', holiday && 'bg-green-500/5')}>
                  <p className="text-xs text-muted-foreground">{DAY_LABELS[day.getDay()]}</p>
                  <div className={cn(
                    'text-sm font-semibold mx-auto w-8 h-8 flex items-center justify-center rounded-full mt-0.5',
                    isToday ? 'text-white' : 'text-foreground',
                  )} style={isToday ? { background: 'var(--brand-primary,#5B8CFF)' } : undefined}>
                    {day.getDate()}
                  </div>
                  {holiday && (
                    <p className="text-[8px] text-green-600 font-medium px-1 truncate">{holiday}</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Scrollable time grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex" style={{ height: `${(HOUR_END - HOUR_START) * PX_PER_HOUR}px` }}>
              {/* Time labels */}
              <div className="w-14 shrink-0 relative">
                {hours.map(h => (
                  <div
                    key={h}
                    className="absolute w-full pr-2 flex justify-end"
                    style={{ top: (h - HOUR_START) * PX_PER_HOUR - 8 }}
                  >
                    <span className="text-[10px] text-muted-foreground">
                      {h.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, di) => {
                const dayEvents = weekEventsByDay.get(dateStr(day)) ?? []
                return (
                  <div
                    key={di}
                    className="flex-1 border-l border-border relative cursor-pointer"
                    onClick={() => {
                      const dt = new Date(day)
                      dt.setHours(9, 0)
                      const iso = dt.toISOString().slice(0, 16)
                      setNewStart(iso)
                      setShowNew(true)
                    }}
                  >
                    {hours.map(h => (
                      <div
                        key={h}
                        className="absolute w-full border-t border-border/50"
                        style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
                      />
                    ))}

                    {dayEvents.map(event => {
                      const { top, height } = getEventPosition(event)
                      return (
                        <div
                          key={event.id}
                          onClick={e => { e.stopPropagation(); setSelectedEvent(event) }}
                          className="absolute left-0.5 right-0.5 rounded-lg px-2 py-1 overflow-hidden cursor-pointer hover:brightness-95 transition-all z-10"
                          style={{
                            top,
                            height: Math.max(height, 28),
                            backgroundColor: `${event.color}20`,
                            borderLeft: `3px solid ${event.color}`,
                          }}
                        >
                          <p className="text-[10px] font-semibold truncate leading-tight" style={{ color: event.color }}>
                            {event.title}
                          </p>
                          {height > 40 && event.client && (
                            <p className="text-[9px] truncate opacity-70 mt-0.5" style={{ color: event.color }}>
                              {event.client.name}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Event detail popover */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: selectedEvent.color }} />
              <div className="flex-1">
                <p className="font-semibold">{selectedEvent.title}</p>
                {selectedEvent.client && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5" /> {selectedEvent.client.name}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Clock className="w-3 h-3" />
                  {new Date(selectedEvent.start_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {new Date(selectedEvent.end_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {selectedEvent.event_type && (
                  <Badge className="mt-2 text-xs" style={{ backgroundColor: `${selectedEvent.color}15`, color: selectedEvent.color, borderColor: `${selectedEvent.color}30` }}>
                    {EVENT_TYPE_CONFIG[selectedEvent.event_type]?.label ?? selectedEvent.event_type}
                  </Badge>
                )}
                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground mt-2">{selectedEvent.description}</p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setSelectedEvent(null)}>
              Fechar
            </Button>
          </div>
        </div>
      )}

      {showNew && (
        <NewEventModal
          clients={clients}
          defaultStart={newStart}
          onClose={() => { setShowNew(false); setNewStart(undefined) }}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
