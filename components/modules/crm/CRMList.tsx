'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search, Plus, Download, ArrowUpDown, Filter, Building2,
  Users as UsersIcon, Eye, Edit2, Trash2, Tag as TagIcon, DollarSign, TrendingUp, CheckSquare,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NewClientModal } from './NewClientModal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  'Ativo': 'bg-[#12B981]/10 text-[#12B981] border-[#12B981]/30',
  'Em negociação': 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
  'Em risco': 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
  'Inativo': 'bg-muted text-muted-foreground border-border',
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function avatarBg(name: string) {
  const colors = ['#5B8CFF', '#12B981', '#F59E0B', '#8B5CF6', '#e1493c', '#2563EB', '#0EA5E9', '#EC4899']
  return colors[name.charCodeAt(0) % colors.length]
}

function formatCNPJ(v: string | null | undefined) {
  if (!v) return null
  const c = v.replace(/\D/g, '')
  if (c.length !== 14) return v
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
}

type Segment = { id: string; name: string; color: string }
type ClientRow = {
  id: string
  name: string
  fantasy_name?: string | null
  legal_name?: string | null
  cnpj?: string | null
  sector: string | null
  mrr: number
  status: string
  email: string | null
  services?: string[] | null
  tags?: string[] | null
  responsible_id?: string | null
  responsible: { id?: string; full_name: string | null; avatar_url: string | null } | null
  segment_id?: string | null
  segment?: Segment | null
}
type ContactRow = { id: string; client_id: string; name: string | null; is_primary: boolean }

interface CRMListProps {
  clients: Array<Record<string, unknown>>
  users: Array<{ id: string; full_name: string | null; avatar_url: string | null }>
  segments: Segment[]
  contacts: ContactRow[]
}

type SortKey = 'name' | 'mrr' | 'created'

export function CRMList({ clients: initialClients, users, segments, contacts }: CRMListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [segmentFilter, setSegmentFilter] = useState('all')
  const [responsibleFilter, setResponsibleFilter] = useState('all')
  const [sortBy, setSortBy] = useState<SortKey>('mrr')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showNewClient, setShowNewClient] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [clients, setClients] = useState(initialClients as ClientRow[])

  // Build contacts-by-client map
  const contactsByClient = useMemo(() => {
    const map = new Map<string, ContactRow[]>()
    contacts.forEach(c => {
      if (!map.has(c.client_id)) map.set(c.client_id, [])
      map.get(c.client_id)!.push(c)
    })
    return map
  }, [contacts])

  const filtered = useMemo(() => {
    return clients
      .filter(c => {
        const q = search.toLowerCase().trim()
        if (q) {
          const haystack = [c.name, c.email, c.cnpj, c.legal_name, c.fantasy_name].filter(Boolean).join(' ').toLowerCase()
          if (!haystack.includes(q)) return false
        }
        if (statusFilter !== 'all' && c.status !== statusFilter) return false
        if (segmentFilter !== 'all' && c.segment_id !== segmentFilter) return false
        if (responsibleFilter !== 'all' && c.responsible_id !== responsibleFilter) return false
        return true
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1
        if (sortBy === 'mrr') return ((a.mrr ?? 0) - (b.mrr ?? 0)) * dir
        if (sortBy === 'name') return a.name.localeCompare(b.name) * dir
        return 0
      })
  }, [clients, search, statusFilter, segmentFilter, responsibleFilter, sortBy, sortDir])

  const stats = useMemo(() => {
    const totalMrr = filtered.reduce((s, c) => s + (c.mrr ?? 0), 0)
    const ativos = filtered.filter(c => c.status === 'Ativo').length
    const negociacao = filtered.filter(c => c.status === 'Em negociação').length
    return { totalMrr, ativos, negociacao, count: filtered.length }
  }, [filtered])

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('desc') }
  }

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(c => c.id)))
  }

  const exportCSV = () => {
    const rows = [['Nome', 'Razão Social', 'CNPJ', 'Setor', 'Segmento', 'MRR', 'Status', 'Email', 'Responsável']]
    filtered.forEach(c => rows.push([
      c.name,
      c.legal_name ?? '',
      formatCNPJ(c.cnpj) ?? '',
      c.sector ?? '',
      c.segment?.name ?? '',
      String(c.mrr ?? 0),
      c.status,
      c.email ?? '',
      c.responsible?.full_name ?? '',
    ]))
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success('Exportado!')
  }

  const deleteClient = async (id: string, name: string) => {
    if (!confirm(`Excluir cliente "${name}"? Esta ação é irreversível.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir'); return }
    setClients(prev => prev.filter(c => c.id !== id))
    toast.success(`Cliente "${name}" excluído`)
  }

  const bulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Excluir ${selected.size} cliente(s) selecionado(s)?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('clients').delete().in('id', [...selected])
    if (error) { toast.error('Erro ao excluir'); return }
    setClients(prev => prev.filter(c => !selected.has(c.id)))
    setSelected(new Set())
    toast.success('Clientes excluídos')
  }

  const clearFilters = () => {
    setSearch(''); setStatusFilter('all'); setSegmentFilter('all'); setResponsibleFilter('all')
  }
  const activeFiltersCount = [
    search, statusFilter !== 'all', segmentFilter !== 'all', responsibleFilter !== 'all',
  ].filter(Boolean).length

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Hero header with KPIs ───────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#5B8CFF]/6 via-transparent to-[#8B5CF6]/5 p-5">
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-[#5B8CFF]/8 blur-3xl pointer-events-none" />
        <div className="relative flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Clientes Ativos</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Sua carteira completa — empresas, contatos e contratos em um só lugar.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </Button>
            <Button
              size="sm"
              className="text-white gap-1.5 text-xs"
              style={{ background: 'var(--brand-primary,#5B8CFF)' }}
              onClick={() => setShowNewClient(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Novo cliente
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Total na carteira', value: String(clients.length), Icon: UsersIcon, color: '#5B8CFF' },
            { label: 'MRR somado', value: `R$ ${stats.totalMrr.toLocaleString('pt-BR')}`, Icon: DollarSign, color: '#12B981' },
            { label: 'Em negociação', value: String(stats.negociacao), Icon: TrendingUp, color: '#F59E0B' },
            { label: 'Ativos', value: String(stats.ativos), Icon: CheckSquare, color: '#8B5CF6' },
          ].map(s => {
            const Icon = s.Icon
            return (
              <div key={s.label} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">{s.label}</p>
                  <p className="text-lg font-black tabular-nums leading-tight mt-0.5 truncate">{s.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, CNPJ, razão social..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-[150px] h-9 text-sm">
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
        {segments.length > 0 && (
          <Select value={segmentFilter} onValueChange={v => setSegmentFilter(v ?? 'all')}>
            <SelectTrigger className="w-[170px] h-9 text-sm">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os segmentos</SelectItem>
              {segments.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={responsibleFilter} onValueChange={v => setResponsibleFilter(v ?? 'all')}>
          <SelectTrigger className="w-[170px] h-9 text-sm">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {users.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.id}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1.5 text-muted-foreground">
            Limpar ({activeFiltersCount})
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} de {clients.length} clientes
        </span>
      </div>

      {/* ── Bulk action bar (only when selected > 0) ─────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-[#5B8CFF]/8 border border-[#5B8CFF]/20 rounded-lg">
          <span className="text-xs font-semibold text-[#5B8CFF]">{selected.size} selecionado(s)</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 ml-auto" onClick={bulkDelete}>
            <Trash2 className="w-3.5 h-3.5" /> Excluir selecionados
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
            Cancelar
          </Button>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Sticky header */}
        <div className="grid grid-cols-[36px_2fr_1.5fr_1.4fr_1.2fr_1.5fr_1fr_1fr_140px] gap-3 px-4 py-2.5 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 sticky top-0 z-10">
          <button onClick={toggleAll} className="flex items-center justify-center" title="Selecionar todos">
            <span className={cn(
              'w-4 h-4 rounded border flex items-center justify-center transition-colors',
              selected.size === filtered.length && filtered.length > 0
                ? 'bg-[#5B8CFF] border-[#5B8CFF] text-white'
                : 'border-border'
            )}>
              {selected.size === filtered.length && filtered.length > 0 && <CheckSquare className="w-2.5 h-2.5" />}
            </span>
          </button>
          <SortableHeader label="Empresa" active={sortBy === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
          <span>Razão Social / CNPJ</span>
          <span>Responsável</span>
          <span>Segmento</span>
          <span>Contatos</span>
          <SortableHeader label="MRR" active={sortBy === 'mrr'} dir={sortDir} onClick={() => toggleSort('mrr')} />
          <span>Status</span>
          <span className="text-right pr-1">Ações</span>
        </div>

        {/* Rows */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p className="text-sm font-semibold">
                {activeFiltersCount > 0 ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
              </p>
              <p className="text-xs mt-1">
                {activeFiltersCount > 0 ? 'Ajuste os filtros ou limpe-os pra ver tudo.' : 'Cadastre seu primeiro cliente pra começar.'}
              </p>
              {activeFiltersCount === 0 && (
                <Button size="sm" className="mt-4 text-white gap-1.5 text-xs" style={{ background: 'var(--brand-primary,#5B8CFF)' }} onClick={() => setShowNewClient(true)}>
                  <Plus className="w-3.5 h-3.5" /> Novo cliente
                </Button>
              )}
            </div>
          ) : (
            filtered.map((c, i) => {
              const isSelected = selected.has(c.id)
              const clientContacts = contactsByClient.get(c.id) ?? []
              const visibleContacts = clientContacts.slice(0, 2)
              const extraContacts = clientContacts.length - visibleContacts.length
              const cnpj = formatCNPJ(c.cnpj)
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.4) }}
                  onClick={() => router.push(`/crm/${c.id}`)}
                  className={cn(
                    'group grid grid-cols-[36px_2fr_1.5fr_1.4fr_1.2fr_1.5fr_1fr_1fr_140px] gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer items-center transition-colors',
                    isSelected ? 'bg-[#5B8CFF]/5' : 'hover:bg-muted/40'
                  )}
                >
                  {/* Checkbox */}
                  <button onClick={e => toggleSelect(c.id, e)} className="flex items-center justify-center">
                    <span className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      isSelected ? 'bg-[#5B8CFF] border-[#5B8CFF] text-white' : 'border-border hover:border-[#5B8CFF]/40'
                    )}>
                      {isSelected && <CheckSquare className="w-2.5 h-2.5" />}
                    </span>
                  </button>

                  {/* Empresa */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: avatarBg(c.name) }}>
                      {getInitials(c.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate leading-tight">{c.name}</p>
                      {c.sector && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{c.sector}</p>}
                    </div>
                  </div>

                  {/* Razão Social / CNPJ */}
                  <div className="min-w-0">
                    {c.legal_name ? (
                      <p className="text-xs font-medium truncate">{c.legal_name}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground/40 italic">—</p>
                    )}
                    {cnpj && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{cnpj}</p>}
                  </div>

                  {/* Responsável */}
                  <div className="flex items-center gap-2 min-w-0">
                    {c.responsible ? (
                      <>
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={c.responsible.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[9px] bg-[#5B8CFF] text-white">
                            {(c.responsible.full_name ?? 'U').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate">{c.responsible.full_name?.split(' ').slice(0, 2).join(' ')}</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground/40 italic">Sem dono</span>
                    )}
                  </div>

                  {/* Segmento */}
                  <div className="min-w-0">
                    {c.segment ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full max-w-full"
                        style={{ background: `${c.segment.color}15`, color: c.segment.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.segment.color }} />
                        <span className="truncate">{c.segment.name.toUpperCase()}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40 italic">—</span>
                    )}
                  </div>

                  {/* Contatos */}
                  <div className="min-w-0">
                    {clientContacts.length === 0 ? (
                      <span className="text-xs text-muted-foreground/40 italic">Nenhum contato</span>
                    ) : (
                      <div className="flex flex-col">
                        {visibleContacts.map(ct => (
                          <span key={ct.id} className="text-xs truncate leading-tight">
                            {ct.is_primary && <span className="text-[#F59E0B] mr-0.5">★</span>}
                            {ct.name}
                          </span>
                        ))}
                        {extraContacts > 0 && (
                          <span className="text-[10px] text-muted-foreground mt-0.5">+{extraContacts} mais</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* MRR */}
                  <div>
                    <p className="font-bold text-sm tabular-nums">R$ {(c.mrr ?? 0).toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-muted-foreground">por mês</p>
                  </div>

                  {/* Status */}
                  <div>
                    <Badge className={cn('text-[10px] font-semibold border', STATUS_COLORS[c.status] ?? STATUS_COLORS['Inativo'])}>
                      {c.status}
                    </Badge>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/crm/${c.id}`) }}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/crm/${c.id}?edit=1`) }}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteClient(c.id, c.name) }}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {showNewClient && <NewClientModal users={users} onClose={() => setShowNewClient(false)} />}
    </div>
  )
}

function SortableHeader({ label, active, dir, onClick }: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
      <span>{label}</span>
      {active ? (
        dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
      )}
    </button>
  )
}
