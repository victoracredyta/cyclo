'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ChevronLeft, ChevronRight, Clock, Building2 } from 'lucide-react'
import { NewEventModal, type CalEvent } from './NewEventModal'
import { cn } from '@/lib/utils'

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  meeting:  { label: 'Reunião',  color: '#5B8CFF' },
  call:     { label: 'Ligação',  color: '#12B981' },
  task:     { label: 'Tarefa',   color: '#F59E0B' },
  deadline: { label: 'Prazo',    color: '#e1493c' },
  reminder: { label: 'Lembrete', color: '#8B5CF6' },
}

const HOUR_START = 7
const HOUR_END = 21
const PX_PER_HOUR = 64

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
  return d.toISOString().split('T')[0]
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
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay())
    return d
  })
  const [events, setEvents] = useState(initialEvents)
  const [showNew, setShowNew] = useState(false)
  const [newStart, setNewStart] = useState<string | undefined>()
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)

  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart])
  const hours = useMemo(() => Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START), [])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    weekDays.forEach(d => map.set(dateStr(d), []))
    events.forEach(e => {
      const key = new Date(e.start_at).toISOString().split('T')[0]
      if (map.has(key)) map.get(key)!.push(e)
    })
    return map
  }, [events, weekDays])

  const prevWeek = () => {
    const d = new Date(currentWeekStart)
    d.setDate(d.getDate() - 7)
    setCurrentWeekStart(d)
  }

  const nextWeek = () => {
    const d = new Date(currentWeekStart)
    d.setDate(d.getDate() + 7)
    setCurrentWeekStart(d)
  }

  const goToday = () => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay())
    setCurrentWeekStart(d)
  }

  const handleCreated = (e: CalEvent) => {
    setEvents(prev => [...prev, e])
    setShowNew(false)
    setNewStart(undefined)
  }

  const weekLabel = (() => {
    const start = weekDays[0]
    const end = weekDays[6]
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} – ${end.getDate()} de ${MONTH_LABELS[start.getMonth()]} ${start.getFullYear()}`
    }
    return `${start.getDate()} ${MONTH_LABELS[start.getMonth()]} – ${end.getDate()} ${MONTH_LABELS[end.getMonth()]} ${end.getFullYear()}`
  })()

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold min-w-56 text-center">{weekLabel}</span>
          <button onClick={nextWeek} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <Button variant="outline" size="sm" onClick={goToday} className="text-xs h-8">Hoje</Button>
        </div>
        <Button
          size="sm"
          className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-xs"
          onClick={() => setShowNew(true)}
        >
          <Plus className="w-3.5 h-3.5" /> Novo evento
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Day headers */}
        <div className="flex border-b border-border shrink-0">
          <div className="w-14 shrink-0" />
          {weekDays.map((day, i) => {
            const isToday = dateStr(day) === dateStr(today)
            return (
              <div key={i} className="flex-1 text-center py-2 border-l border-border">
                <p className="text-xs text-muted-foreground">{DAY_LABELS[day.getDay()]}</p>
                <div className={cn(
                  'text-sm font-semibold mx-auto w-8 h-8 flex items-center justify-center rounded-full mt-0.5',
                  isToday ? 'bg-[#5B8CFF] text-white' : 'text-foreground',
                )}>
                  {day.getDate()}
                </div>
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
              const dayEvents = eventsByDay.get(dateStr(day)) ?? []
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
                  {/* Hour grid lines */}
                  {hours.map(h => (
                    <div
                      key={h}
                      className="absolute w-full border-t border-border/50"
                      style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
                    />
                  ))}

                  {/* Events */}
                  {dayEvents.map(event => {
                    const { top, height } = getEventPosition(event)
                    const cfg = EVENT_TYPE_CONFIG[event.event_type ?? 'meeting'] ?? EVENT_TYPE_CONFIG.meeting
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
