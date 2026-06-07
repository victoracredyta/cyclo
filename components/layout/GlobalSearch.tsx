'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Building2, User, Users, Loader2, ArrowRight, Kanban, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ClientResult = { id: string; name: string; sector: string | null; status: string; email: string | null; type: 'client' }
type LeadResult = { id: string; name: string; company: string | null; email: string | null; phone: string | null; won_at: string | null; lost_at: string | null; type: 'lead' }
type Result = ClientResult | LeadResult

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Open with Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setResults([]); setHighlighted(0) }
  }, [open])

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    const handle = setTimeout(async () => {
      const supabase = createClient()
      const like = `%${q}%`
      const [{ data: clients }, { data: leads }] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, sector, status, email')
          .or(`name.ilike.${like},email.ilike.${like},cnpj.ilike.${like}`)
          .limit(8),
        supabase
          .from('leads')
          .select('id, name, company, email, phone, won_at, lost_at')
          .or(`name.ilike.${like},company.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
          .limit(8),
      ])
      const merged: Result[] = [
        ...(clients ?? []).map(c => ({ ...c, type: 'client' as const })),
        ...(leads ?? []).map(l => ({ ...l, type: 'lead' as const })),
      ]
      setResults(merged)
      setHighlighted(0)
      setLoading(false)
    }, 200)
    return () => clearTimeout(handle)
  }, [query])

  // Keyboard navigation
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)) }
    if (e.key === 'Enter' && results[highlighted]) { e.preventDefault(); pick(results[highlighted]) }
  }

  const pick = (r: Result) => {
    setOpen(false)
    if (r.type === 'client') router.push(`/crm/${r.id}`)
    else router.push(`/pipeline/${r.id}`)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const clientResults = useMemo(() => results.filter(r => r.type === 'client') as ClientResult[], [results])
  const leadResults = useMemo(() => results.filter(r => r.type === 'lead') as LeadResult[], [results])

  return (
    <>
      {/* Trigger button in topbar — sleek, no keyboard hint */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2.5 text-sm text-muted-foreground bg-muted/60 hover:bg-muted hover:text-foreground px-4 py-2 rounded-full transition-all min-w-[320px] border border-transparent hover:border-border"
      >
        <Search className="w-4 h-4 text-[#5B8CFF]" />
        <span className="flex-1 text-left">Buscar clientes, leads, empresas…</span>
      </button>

      {/* Mobile icon-only */}
      <button onClick={() => setOpen(true)} className="md:hidden p-1.5 text-muted-foreground hover:text-foreground" aria-label="Buscar">
        <Search className="w-4 h-4" />
      </button>

      {/* Search modal — overlay */}
      {open && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 pt-[15vh]">
          <div ref={containerRef} className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Busque por nome, empresa, email, telefone, CNPJ…"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {query.trim().length < 2 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Search className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">Comece a digitar pra buscar</p>
                  <p className="text-xs mt-1">Encontre clientes, leads, empresas — em qualquer lugar do CYCLO</p>
                  <div className="flex gap-2 justify-center mt-3 text-[10px] text-muted-foreground">
                    <kbd className="bg-muted border border-border rounded px-1.5 py-0.5">↑↓</kbd>
                    <span>navegar</span>
                    <kbd className="bg-muted border border-border rounded px-1.5 py-0.5">Enter</kbd>
                    <span>abrir</span>
                    <kbd className="bg-muted border border-border rounded px-1.5 py-0.5">Esc</kbd>
                    <span>fechar</span>
                  </div>
                </div>
              ) : results.length === 0 && !loading ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Search className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">Nenhum resultado encontrado</p>
                  <p className="text-xs mt-1">Tente com outras palavras-chave</p>
                </div>
              ) : (
                <div className="py-1">
                  {/* Clients section */}
                  {clientResults.length > 0 && (
                    <div className="px-3 py-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1 flex items-center gap-1.5">
                        <Users className="w-3 h-3" /> Clientes ({clientResults.length})
                      </p>
                      {clientResults.map((c) => {
                        const idx = results.indexOf(c)
                        return (
                          <button
                            key={`c-${c.id}`}
                            onClick={() => pick(c)}
                            onMouseEnter={() => setHighlighted(idx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors',
                              highlighted === idx ? 'bg-[#5B8CFF]/10' : 'hover:bg-muted/40'
                            )}
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#5B8CFF]/15 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4 text-[#5B8CFF]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{c.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {c.sector ?? 'Sem setor'} · {c.status}
                                {c.email && ` · ${c.email}`}
                              </p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Leads section */}
                  {leadResults.length > 0 && (
                    <div className="px-3 py-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1 flex items-center gap-1.5">
                        <Kanban className="w-3 h-3" /> Leads do pipeline ({leadResults.length})
                      </p>
                      {leadResults.map((l) => {
                        const idx = results.indexOf(l)
                        const stateBadge = l.won_at ? 'Ganho' : l.lost_at ? 'Perdido' : 'Em andamento'
                        const stateColor = l.won_at ? '#12B981' : l.lost_at ? '#e1493c' : '#5B8CFF'
                        return (
                          <button
                            key={`l-${l.id}`}
                            onClick={() => pick(l)}
                            onMouseEnter={() => setHighlighted(idx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors',
                              highlighted === idx ? 'bg-[#5B8CFF]/10' : 'hover:bg-muted/40'
                            )}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stateColor}15` }}>
                              <User className="w-4 h-4" style={{ color: stateColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold truncate">{l.name}</p>
                                <span className="text-[9px] font-bold px-1.5 py-0 rounded-full shrink-0" style={{ background: `${stateColor}15`, color: stateColor }}>
                                  {stateBadge}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {l.company ?? 'Sem empresa'}
                                {l.email && ` · ${l.email}`}
                                {l.phone && ` · ${l.phone}`}
                              </p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer hint */}
            {results.length > 0 && (
              <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{results.length} resultado{results.length > 1 ? 's' : ''}</span>
                <div className="flex gap-2 items-center">
                  <kbd className="bg-background border border-border rounded px-1.5 py-0.5">↑↓</kbd>
                  <kbd className="bg-background border border-border rounded px-1.5 py-0.5">Enter</kbd>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
