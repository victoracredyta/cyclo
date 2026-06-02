'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Search, Plus, Download, ArrowUpDown, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NewClientModal } from './NewClientModal'

const STATUS_COLORS: Record<string, string> = {
  'Ativo': 'bg-[#12B981]/10 text-[#12B981] border-[#12B981]/20',
  'Em negociação': 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
  'Em risco': 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20',
  'Inativo': 'bg-muted text-muted-foreground border-border',
}

function healthColor(score: number) {
  if (score >= 70) return '#12B981'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function avatarBg(name: string) {
  const colors = ['#5B8CFF', '#12B981', '#F59E0B', '#8B5CF6', '#e1493c', '#2563EB']
  return colors[name.charCodeAt(0) % colors.length]
}

interface CRMListProps {
  clients: Array<Record<string, unknown>>
  users: Array<{ id: string; full_name: string | null; avatar_url: string | null }>
}

export function CRMList({ clients: initialClients, users }: CRMListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'mrr' | 'health_score'>('mrr')
  const [showNewClient, setShowNewClient] = useState(false)

  const filtered = useMemo(() => {
    return (initialClients as Array<{
      id: string; name: string; sector: string | null; mrr: number; health_score: number;
      status: string; email: string | null; responsible: { full_name: string | null; avatar_url: string | null } | null
    }>)
      .filter(c => {
        const q = search.toLowerCase()
        const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q)
        const matchStatus = statusFilter === 'all' || c.status === statusFilter
        return matchSearch && matchStatus
      })
      .sort((a, b) => {
        if (sortBy === 'mrr') return (b.mrr ?? 0) - (a.mrr ?? 0)
        if (sortBy === 'health_score') return (b.health_score ?? 0) - (a.health_score ?? 0)
        return a.name.localeCompare(b.name)
      })
  }, [initialClients, search, statusFilter, sortBy])

  const exportCSV = () => {
    const rows = [['Nome', 'Setor', 'MRR', 'Status', 'Health Score', 'Email']]
    filtered.forEach(c => rows.push([c.name, c.sector ?? '', String(c.mrr), c.status, String(c.health_score), c.email ?? '']))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'clientes.csv'; a.click()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Clientes</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} de {initialClients.length} clientes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
          <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-xs" onClick={() => setShowNewClient(true)}>
            <Plus className="w-3.5 h-3.5" /> Novo cliente
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Em negociação">Em negociação</SelectItem>
            <SelectItem value="Em risco">Em risco</SelectItem>
            <SelectItem value="Inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mrr">Ordenar por MRR</SelectItem>
            <SelectItem value="health_score">Ordenar por Saúde</SelectItem>
            <SelectItem value="name">Ordenar por Nome</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border shadow-none overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_0.8fr] gap-4 px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Cliente</span>
          <span>MRR</span>
          <span>Health Score</span>
          <span>Status</span>
          <span>Responsável</span>
          <span></span>
        </div>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {search || statusFilter !== 'all' ? 'Nenhum cliente encontrado com esses filtros.' : 'Nenhum cliente cadastrado ainda.'}
            </div>
          ) : (
            filtered.map((client, i) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => router.push(`/crm/${client.id}`)}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_0.8fr] gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer items-center transition-colors"
              >
                {/* Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: avatarBg(client.name) }}>
                    {getInitials(client.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{client.name}</p>
                    {client.sector && <p className="text-xs text-muted-foreground truncate">{client.sector}</p>}
                  </div>
                </div>
                {/* MRR */}
                <span className="font-semibold text-sm">R$ {(client.mrr ?? 0).toLocaleString('pt-BR')}</span>
                {/* Health */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: healthColor(client.health_score ?? 0) }} className="font-medium">{client.health_score}%</span>
                  </div>
                  <Progress
                    value={client.health_score ?? 0}
                    className="h-1.5 bg-muted"
                    style={{ '--tw-bg-opacity': '1' } as React.CSSProperties}
                  />
                </div>
                {/* Status */}
                <Badge className={cn('text-xs border font-medium w-fit', STATUS_COLORS[client.status] ?? STATUS_COLORS['Inativo'])}>
                  {client.status}
                </Badge>
                {/* Responsible */}
                <div className="flex items-center gap-1.5">
                  {client.responsible ? (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={(client.responsible as {avatar_url?: string | null}).avatar_url ?? undefined} />
                        <AvatarFallback className="text-[9px] bg-[#5B8CFF] text-white">
                          {((client.responsible as {full_name?: string | null}).full_name ?? 'U').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate">
                        {(client.responsible as {full_name?: string | null}).full_name?.split(' ')[0]}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
                {/* Arrow */}
                <div className="flex justify-end">
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground rotate-90" />
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>

      {showNewClient && <NewClientModal users={users} onClose={() => setShowNewClient(false)} />}
    </div>
  )
}
