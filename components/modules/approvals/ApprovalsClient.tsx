'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Plus, Search, MessageSquare, Clock, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { NewApprovalModal } from './NewApprovalModal'
import { cn } from '@/lib/utils'

type Row = {
  id: string
  title: string
  status: string
  channel: string | null
  type: string | null
  due_date: string | null
  created_at: string
  current_version: number
  client: { id: string; name: string } | null
  comments: { id: string }[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aguardando: { label: 'Aguardando', color: '#F59E0B', icon: Clock },
  aprovado:   { label: 'Aprovado',   color: '#12B981', icon: CheckCircle },
  ajuste:     { label: 'Ajuste',     color: '#e1493c', icon: RefreshCw },
  reprovado:  { label: 'Reprovado',  color: '#6B7280', icon: XCircle },
}

const CHANNEL_ICONS: Record<string, string> = {
  instagram: '📷', facebook: '👤', linkedin: '💼', tiktok: '🎵',
  youtube: '▶️', twitter: '🐦', email: '✉️', outro: '📄',
}

function isDueSoon(d: string | null) {
  if (!d) return false
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 864e5)
  return days >= 0 && days <= 2
}

function isOverdue(d: string | null) {
  if (!d) return false
  return new Date(d).getTime() < Date.now()
}

interface ApprovalsClientProps {
  approvals: Row[]
  clients: Array<{ id: string; name: string }>
}

export function ApprovalsClient({ approvals: initial, clients }: ApprovalsClientProps) {
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [activeStatus, setActiveStatus] = useState('all')
  const [filterClient, setFilterClient] = useState('all')
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)

  const filtered = useMemo(() => rows.filter(a => {
    if (activeStatus !== 'all' && a.status !== activeStatus) return false
    if (filterClient !== 'all' && a.client?.id !== filterClient) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [rows, activeStatus, filterClient, search])

  const counts = useMemo(() => ({
    all: rows.length,
    aguardando: rows.filter(a => a.status === 'aguardando').length,
    ajuste: rows.filter(a => a.status === 'ajuste').length,
    aprovado: rows.filter(a => a.status === 'aprovado').length,
    reprovado: rows.filter(a => a.status === 'reprovado').length,
  }), [rows])

  const handleCreated = (a: Row) => {
    setRows(prev => [a, ...prev])
    setShowNew(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Aprovações</h2>
          <p className="text-sm text-muted-foreground">{counts.aguardando} aguardando resposta</p>
        </div>
        <Button
          size="sm"
          className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-xs"
          onClick={() => setShowNew(true)}
        >
          <Plus className="w-3.5 h-3.5" /> Nova aprovação
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {(['all', 'aguardando', 'ajuste', 'aprovado', 'reprovado'] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveStatus(s)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0',
              activeStatus === s
                ? 'border-[#5B8CFF] text-[#5B8CFF]'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {s === 'all' ? 'Todas' : STATUS_CONFIG[s].label}
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-medium',
              activeStatus === s ? 'bg-[#5B8CFF]/10 text-[#5B8CFF]' : 'bg-muted text-muted-foreground',
            )}>
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar aprovação..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={filterClient} onValueChange={v => setFilterClient(v ?? 'all')}>
          <SelectTrigger className="h-9 text-sm w-44">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Nenhuma aprovação encontrada.
          </div>
        ) : (
          filtered.map((row, i) => {
            const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.aguardando
            const StatusIcon = cfg.icon
            const overdue = isOverdue(row.due_date)
            const soon = isDueSoon(row.due_date)

            return (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => router.push(`/aprovacoes/${row.id}`)}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl cursor-pointer hover:border-[#5B8CFF]/40 hover:shadow-sm transition-all"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cfg.color}18` }}
                >
                  <StatusIcon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{row.title}</p>
                    {row.channel && (
                      <span className="text-sm shrink-0">{CHANNEL_ICONS[row.channel] ?? '📄'}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    {row.client && <span>{row.client.name}</span>}
                    {row.type && <><span>·</span><span>{row.type}</span></>}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {row.comments.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {row.comments.length}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">v{row.current_version}</span>
                  {row.due_date && (
                    <div className={cn(
                      'flex items-center gap-1 text-xs',
                      overdue ? 'text-red-500' : soon ? 'text-[#F59E0B]' : 'text-muted-foreground',
                    )}>
                      {(overdue || soon) && <AlertCircle className="w-3 h-3" />}
                      {new Date(row.due_date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                  <Badge
                    className="text-[11px] px-2 py-0.5 border font-medium"
                    style={{ backgroundColor: `${cfg.color}12`, color: cfg.color, borderColor: `${cfg.color}30` }}
                  >
                    {cfg.label}
                  </Badge>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {showNew && (
        <NewApprovalModal clients={clients} onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
