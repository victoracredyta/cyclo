'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Loader2, ChevronDown, Search, Building2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { PipelineStage } from '@/types/database'
import type { LeadWithResponsible } from './PipelineBoard'

type SegmentOption = { id: string; name: string; color: string }
type FunnelOption = { id: string; name: string; is_default: boolean }

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  company: z.string().optional(),
  value: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  city: z.string().optional(),
  origin: z.string().optional(),
  customOrigin: z.string().optional(),
  priority: z.enum(['alta', 'media', 'baixa']),
  stage_id: z.string(),
  funnel_id: z.string().optional(),
  segment_id: z.string().optional(),
  responsible_id: z.string().optional(),
  next_action: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const ORIGINS = [
  'Google Ads', 'Meta Ads', 'LinkedIn Ads', 'Instagram Orgânico',
  'TikTok Ads', 'WhatsApp', 'Indicação', 'Prospecção Ativa',
  'Evento', 'E-mail Marketing', 'Orgânico / SEO', 'Referral',
  'Personalizado',
]

const TEMP_OPTIONS = [
  { value: 'alta' as const, label: '🔥 Quente — Alta prioridade' },
  { value: 'media' as const, label: '🌡️ Morno — Média prioridade' },
  { value: 'baixa' as const, label: '❄️ Frio — Baixa prioridade' },
]

interface NewLeadModalProps {
  stages: PipelineStage[]
  users: Array<{ id: string; full_name: string | null; avatar_url: string | null }>
  defaultStageId?: string
  defaultFunnelId?: string
  funnels?: FunnelOption[]
  onClose: () => void
  onCreated: (lead: LeadWithResponsible) => void
}

function CustomSelect({
  value,
  placeholder,
  displayText,
  onValueChange,
  children,
  className,
}: {
  value: string
  placeholder?: string
  displayText: string | null
  onValueChange: (v: string | null) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className ?? 'h-9 text-sm'}>
        <span className={displayText ? 'text-foreground' : 'text-muted-foreground'}>
          {displayText ?? placeholder ?? 'Selecione...'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  )
}

export function NewLeadModal({ stages, users, defaultStageId, defaultFunnelId, funnels = [], onClose, onCreated }: NewLeadModalProps) {
  const initialStageId = defaultStageId ?? stages[0]?.id ?? ''
  const [stageId, setStageId] = useState(initialStageId)
  const [responsibleId, setResponsibleId] = useState('')
  const [selectedOrigin, setSelectedOrigin] = useState('')
  const [temp, setTemp] = useState<'alta' | 'media' | 'baixa'>('media')
  const [selectedFunnelId, setSelectedFunnelId] = useState(defaultFunnelId ?? '')
  const [selectedSegmentId, setSelectedSegmentId] = useState('')
  const [segments, setSegments] = useState<SegmentOption[]>([])
  const [cnpjInput, setCnpjInput] = useState('')
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [extraContacts, setExtraContacts] = useState<Array<{ name: string; email: string; phone: string; role: string }>>([])

  const addExtraContact = () => setExtraContacts(prev => [...prev, { name: '', email: '', phone: '', role: '' }])
  const updateExtraContact = (idx: number, patch: Partial<{ name: string; email: string; phone: string; role: string }>) =>
    setExtraContacts(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
  const removeExtraContact = (idx: number) =>
    setExtraContacts(prev => prev.filter((_, i) => i !== idx))

  useEffect(() => {
    const supabase = createClient()
    supabase.from('segments').select('id, name, color').order('name').then(({ data }) => {
      if (data) setSegments(data)
    })
  }, [])

  const { register, handleSubmit, setValue, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { stage_id: initialStageId, priority: 'media' },
  })

  const lookupCnpj = async () => {
    const clean = cnpjInput.replace(/\D/g, '')
    if (clean.length !== 14) { toast.error('Digite um CNPJ com 14 dígitos'); return }
    setCnpjLoading(true)
    const res = await fetch(`/api/cnpj/${clean}`)
    if (!res.ok) {
      toast.error('CNPJ não encontrado na Receita Federal')
      setCnpjLoading(false)
      return
    }
    const data = await res.json()
    const companyName = data.nome_fantasia || data.razao_social || ''
    if (companyName) setValue('company', companyName)
    if (data.email) setValue('email', data.email)
    if (data.ddd_telefone_1) {
      const phone = data.ddd_telefone_1.replace(/\D/g, '')
      setValue('phone', phone.length >= 10 ? `(${phone.slice(0,2)}) ${phone.slice(2,7)}-${phone.slice(7)}` : phone)
    }
    if (data.municipio && data.uf) setValue('city', `${data.municipio} (${data.uf})`)
    setCnpjLoading(false)
    toast.success(`Dados de ${companyName || data.razao_social} carregados!`)
  }

  const stageName = stages.find(s => s.id === stageId)?.name ?? null
  const responsibleName = users.find(u => u.id === responsibleId)?.full_name ?? null
  const tempLabel = TEMP_OPTIONS.find(t => t.value === temp)?.label ?? null

  const onSubmit = async (data: FormData) => {
    try {
      console.log('[NewLeadModal] onSubmit start', data)
      const supabase = createClient()

      const { data: me, error: meErr } = await supabase
        .from('users')
        .select('organization_id')
        .single()

      if (meErr) {
        console.error('[NewLeadModal] users query error:', meErr)
        toast.error(`Erro ao identificar usuário: ${meErr.message}`, { duration: 8000 })
        return
      }
      if (!me?.organization_id) {
        toast.error('Sua conta não está vinculada a uma organização. Contate o suporte.', { duration: 8000 })
        return
      }

      if (!data.stage_id) {
        toast.error('Selecione uma etapa do pipeline', { duration: 6000 })
        return
      }

      const finalOrigin = data.origin === 'Personalizado' ? (data.customOrigin || 'Personalizado') : data.origin
      const validExtras = extraContacts.filter(c => c.name.trim())

      const payload: Record<string, unknown> = {
        organization_id: me.organization_id,
        stage_id: data.stage_id,
        name: data.name,
        priority: data.priority,
        additional_contacts: validExtras,
      }
      if (data.funnel_id) payload.funnel_id = data.funnel_id
      if (data.segment_id) payload.segment_id = data.segment_id
      if (data.company) payload.company = data.company
      if (data.value) payload.value = Number(data.value)
      if (data.email) payload.email = data.email
      if (data.phone) payload.phone = data.phone
      if (data.city) payload.city = data.city
      if (finalOrigin) payload.origin = finalOrigin
      if (data.responsible_id) payload.responsible_id = data.responsible_id
      if (data.next_action) payload.next_action = data.next_action

      console.log('[NewLeadModal] payload:', payload)

      const { data: lead, error } = await supabase
        .from('leads')
        .insert(payload as never)
        .select('*, responsible:responsible_id(id, full_name, avatar_url)')
        .single()

      if (error) {
        console.error('[NewLeadModal] insert error:', error)
        toast.error(`Erro ao criar lead: ${error.message}`, { duration: 10000 })
        return
      }

      console.log('[NewLeadModal] success:', lead)
      toast.success(`Lead ${data.name} criado!`)
      onCreated(lead as LeadWithResponsible)
    } catch (err) {
      console.error('[NewLeadModal] unexpected error:', err)
      toast.error(`Erro inesperado: ${err instanceof Error ? err.message : 'desconhecido'}`, { duration: 10000 })
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Novo lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-1">
          {/* CNPJ lookup */}
          <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              Buscar empresa pelo CNPJ — auto-preenche os campos
            </Label>
            <div className="flex gap-2">
              <Input
                value={cnpjInput}
                onChange={e => setCnpjInput(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="h-8 text-sm font-mono"
                maxLength={18}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), lookupCnpj())}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-3 gap-1.5 text-xs shrink-0"
                onClick={lookupCnpj}
                disabled={cnpjLoading}
              >
                {cnpjLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Buscar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Nome do contato *</Label>
              <Input placeholder="João Silva" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Empresa</Label>
              <Input placeholder="Empresa LTDA" {...register('company')} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Valor estimado (R$)</Label>
              <Input type="number" placeholder="5000" {...register('value')} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Email</Label>
              <Input type="email" placeholder="joao@empresa.com" {...register('email')} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Telefone</Label>
              <Input placeholder="(11) 99999-9999" {...register('phone')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Cidade</Label>
              <Input placeholder="São Paulo (SP)" {...register('city')} />
            </div>

            {/* Stage — controlled, no UUID leak */}
            <div className="space-y-1.5">
              <Label className="text-sm">Etapa</Label>
              <CustomSelect
                value={stageId}
                displayText={stageName}
                placeholder="Selecione a etapa"
                onValueChange={v => { if (!v) return; setStageId(v); setValue('stage_id', v) }}
              >
                {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </CustomSelect>
            </div>

            {/* Temperature */}
            <div className="space-y-1.5">
              <Label className="text-sm">Temperatura do Lead</Label>
              <CustomSelect
                value={temp}
                displayText={tempLabel}
                onValueChange={v => { if (!v) return; setTemp(v as typeof temp); setValue('priority', v as typeof temp) }}
              >
                {TEMP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </CustomSelect>
            </div>

            {/* Origin */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Origem do Lead</Label>
              <CustomSelect
                value={selectedOrigin}
                displayText={selectedOrigin || null}
                placeholder="Como esse lead chegou?"
                onValueChange={v => { if (!v) return; setSelectedOrigin(v); setValue('origin', v) }}
              >
                {ORIGINS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </CustomSelect>
              {selectedOrigin === 'Personalizado' && (
                <Input
                  placeholder="Digite a origem personalizada..."
                  {...register('customOrigin')}
                  className="mt-2"
                />
              )}
            </div>

            {/* Responsible — controlled, no UUID leak */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Responsável</Label>
              <CustomSelect
                value={responsibleId}
                displayText={responsibleName}
                placeholder="Selecione o vendedor"
                onValueChange={v => { if (!v) return; setResponsibleId(v); setValue('responsible_id', v) }}
              >
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name?.trim() || 'Sem nome'}</SelectItem>
                ))}
              </CustomSelect>
            </div>

            {funnels.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm">Funil</Label>
                <CustomSelect
                  value={selectedFunnelId}
                  displayText={funnels.find(f => f.id === selectedFunnelId)?.name ?? null}
                  placeholder="Selecione o funil"
                  onValueChange={v => { if (!v) return; setSelectedFunnelId(v); setValue('funnel_id', v) }}
                >
                  {funnels.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}{f.is_default ? ' (padrão)' : ''}
                    </SelectItem>
                  ))}
                </CustomSelect>
              </div>
            )}

            {segments.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm">Segmento</Label>
                <CustomSelect
                  value={selectedSegmentId}
                  displayText={segments.find(s => s.id === selectedSegmentId)?.name ?? null}
                  placeholder="Selecione o segmento"
                  onValueChange={v => { if (!v) return; setSelectedSegmentId(v); setValue('segment_id', v) }}
                >
                  {segments.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </CustomSelect>
              </div>
            )}

            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Próxima ação</Label>
              <Input placeholder="Enviar proposta, Agendar reunião..." {...register('next_action')} />
            </div>
          </div>

          {/* Extra contacts */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Outros contatos {extraContacts.length > 0 && `(${extraContacts.length})`}
              </Label>
              <Button type="button" size="sm" variant="outline" onClick={addExtraContact} className="h-7 gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Adicionar contato
              </Button>
            </div>
            {extraContacts.map((c, i) => (
              <div key={i} className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Contato #{i + 2}</span>
                  <button type="button" onClick={() => removeExtraContact(i)} className="text-muted-foreground hover:text-red-500" title="Remover">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={c.name} onChange={e => updateExtraContact(i, { name: e.target.value })} placeholder="Nome" className="h-8 text-xs" />
                  <Input value={c.role} onChange={e => updateExtraContact(i, { role: e.target.value })} placeholder="Cargo" className="h-8 text-xs" />
                  <Input type="email" value={c.email} onChange={e => updateExtraContact(i, { email: e.target.value })} placeholder="Email" className="h-8 text-xs" />
                  <Input value={c.phone} onChange={e => updateExtraContact(i, { phone: e.target.value })} placeholder="Telefone" className="h-8 text-xs" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 text-white" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
