'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, X, Star } from 'lucide-react'
import { toast } from 'sonner'

const SERVICES = ['Social Media', 'Tráfego Pago', 'SEO', 'Email Marketing', 'Branding', 'Criação de Conteúdo', 'Website', 'Consultoria']
const SECTORS = ['E-commerce', 'Saúde', 'Educação', 'Imobiliário', 'Gastronomia', 'Tecnologia', 'Varejo', 'Serviços', 'Indústria', 'Outro']

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  sector: z.string().optional(),
  segment_id: z.string().optional(),
  mrr: z.string().optional(),
  responsible_id: z.string().optional(),
  objectives: z.string().optional(),
})

type FormData = z.infer<typeof schema>
type SegmentOption = { id: string; name: string; color: string }
type Contact = { name: string; email: string; phone: string; role: string; is_primary: boolean }

interface NewClientModalProps {
  users: Array<{ id: string; full_name: string | null; avatar_url: string | null }>
  onClose: () => void
}

const blankContact = (primary = false): Contact => ({
  name: '', email: '', phone: '', role: '', is_primary: primary,
})

export function NewClientModal({ users, onClose }: NewClientModalProps) {
  const router = useRouter()
  const [services, setServices] = useState<string[]>([])
  const [customService, setCustomService] = useState('')
  const [segments, setSegments] = useState<SegmentOption[]>([])
  const [contacts, setContacts] = useState<Contact[]>([blankContact(true)])

  const addCustomService = () => {
    const v = customService.trim()
    if (!v) return
    if (services.some(s => s.toLowerCase() === v.toLowerCase())) {
      toast.error('Esse serviço já está adicionado')
      return
    }
    setServices(prev => [...prev, v])
    setCustomService('')
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.from('segments').select('id, name, color').order('name').then(({ data }) => {
      if (data) setSegments(data)
    })
  }, [])

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const toggleService = (s: string) => {
    setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const updateContact = (idx: number, patch: Partial<Contact>) => {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }
  const removeContact = (idx: number) => {
    setContacts(prev => {
      const next = prev.filter((_, i) => i !== idx)
      // ensure at least one primary
      if (next.length > 0 && !next.some(c => c.is_primary)) next[0].is_primary = true
      return next
    })
  }
  const addContact = () => setContacts(prev => [...prev, blankContact(false)])
  const markPrimary = (idx: number) => {
    setContacts(prev => prev.map((c, i) => ({ ...c, is_primary: i === idx })))
  }

  const onSubmit = async (data: FormData) => {
    try {
      console.log('[NewClientModal] onSubmit start', data)
      const supabase = createClient()

      const { data: org, error: orgErr } = await supabase
        .from('users')
        .select('organization_id')
        .single()

      if (orgErr) {
        console.error('[NewClientModal] users query error:', orgErr)
        toast.error(`Erro ao identificar usuário: ${orgErr.message}`, { duration: 8000 })
        return
      }
      if (!org?.organization_id) {
        toast.error('Sua conta não está vinculada a uma organização. Contate o suporte.', { duration: 8000 })
        return
      }

      // Primary contact for header info (legacy email/phone columns)
      const primary = contacts.find(c => c.is_primary) ?? contacts[0]

      const payload: Record<string, unknown> = {
        organization_id: org.organization_id,
        name: data.name,
        mrr: Number(data.mrr) || 0,
        services,
      }
      if (data.sector) payload.sector = data.sector
      if (data.segment_id) payload.segment_id = data.segment_id
      if (primary?.email) payload.email = primary.email
      if (primary?.phone) payload.phone = primary.phone
      if (data.responsible_id) payload.responsible_id = data.responsible_id
      if (data.objectives) payload.objectives = data.objectives

      console.log('[NewClientModal] payload:', payload)

      const { data: client, error } = await supabase
        .from('clients')
        .insert(payload as never)
        .select()
        .single()

      if (error || !client) {
        console.error('[NewClientModal] insert error:', error)
        toast.error(`Erro ao criar cliente: ${error?.message ?? 'desconhecido'}`, { duration: 10000 })
        return
      }

      // Save contacts (only those with at least a name)
      const validContacts = contacts.filter(c => c.name.trim())
      if (validContacts.length > 0) {
        const rows = validContacts.map(c => ({
          client_id: client.id,
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          role: c.role || null,
          is_primary: c.is_primary,
        }))
        const { error: cErr } = await supabase.from('client_contacts').insert(rows)
        if (cErr) toast.error('Cliente criado, mas falhou ao salvar contatos')
      }

      console.log('[NewClientModal] success:', client)
      toast.success(`Cliente ${data.name} criado!`)
      router.refresh()
      onClose()
      router.push(`/crm/${client.id}`)
    } catch (err) {
      console.error('[NewClientModal] unexpected error:', err)
      toast.error(`Erro inesperado: ${err instanceof Error ? err.message : 'desconhecido'}`, { duration: 10000 })
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Novo cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {/* ── Empresa ──────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Empresa</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm">Nome *</Label>
                <Input placeholder="FitLife Academia" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Setor</Label>
                <Select onValueChange={v => setValue('sector', v as string)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {segments.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Segmento</Label>
                  <Select<string> onValueChange={v => setValue('segment_id', v ?? undefined)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {segments.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm">MRR (R$)</Label>
                <Input type="number" placeholder="3500" {...register('mrr')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm">Responsável (interno)</Label>
                <Select onValueChange={v => setValue('responsible_id', v as string)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name?.trim() || 'Sem nome'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm">Objetivo / Briefing</Label>
                <textarea
                  {...register('objectives')}
                  rows={2}
                  placeholder="Objetivo principal do cliente com sua empresa..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </section>

          {/* ── Contatos ────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Contatos do cliente <span className="text-muted-foreground/60">({contacts.length})</span>
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={addContact} className="h-7 gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Adicionar contato
              </Button>
            </div>

            <div className="space-y-2.5">
              {contacts.map((c, i) => (
                <div key={i} className="rounded-xl border border-border p-3 space-y-2.5 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => markPrimary(i)}
                      className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                        c.is_primary
                          ? 'bg-[#5B8CFF] text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      <Star className="w-3 h-3" fill={c.is_primary ? 'currentColor' : 'none'} />
                      {c.is_primary ? 'Contato principal' : 'Marcar como principal'}
                    </button>
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(i)}
                        className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                        title="Remover contato"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input
                        value={c.name}
                        onChange={e => updateContact(i, { name: e.target.value })}
                        placeholder="João Silva"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cargo</Label>
                      <Input
                        value={c.role}
                        onChange={e => updateContact(i, { role: e.target.value })}
                        placeholder="Diretor de Marketing"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        value={c.email}
                        onChange={e => updateContact(i, { email: e.target.value })}
                        placeholder="joao@empresa.com"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone</Label>
                      <Input
                        value={c.phone}
                        onChange={e => updateContact(i, { phone: e.target.value })}
                        placeholder="(11) 99999-9999"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Serviços ────────────────────────────────────── */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Serviços contratados</h3>
            <div className="flex flex-wrap gap-1.5">
              {SERVICES.map(s => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleService(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    services.includes(s)
                      ? 'bg-[#5B8CFF]/10 border-[#5B8CFF] text-[#5B8CFF]'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input
                value={customService}
                onChange={e => setCustomService(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomService() } }}
                placeholder="Adicionar serviço personalizado..."
                className="h-8 text-xs flex-1"
              />
              <Button type="button" size="sm" variant="outline" onClick={addCustomService} disabled={!customService.trim()} className="h-8 px-2.5 text-xs gap-1 shrink-0">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
            {services.filter(s => !SERVICES.includes(s)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {services.filter(s => !SERVICES.includes(s)).map(s => (
                  <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30">
                    {s}
                    <button type="button" onClick={() => toggleService(s)} className="hover:bg-[#8B5CF6]/20 rounded-full p-0.5">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
