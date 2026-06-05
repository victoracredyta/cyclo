'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { PipelineStage, Lead } from '@/types/database'
import type { LeadWithResponsible } from './PipelineBoard'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  company: z.string().optional(),
  value: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  origin: z.string().optional(),
  customOrigin: z.string().optional(),
  priority: z.enum(['alta', 'media', 'baixa']),
  stage_id: z.string(),
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

interface NewLeadModalProps {
  stages: PipelineStage[]
  users: Array<{ id: string; full_name: string | null; avatar_url: string | null }>
  defaultStageId?: string
  onClose: () => void
  onCreated: (lead: LeadWithResponsible) => void
}

export function NewLeadModal({ stages, users, defaultStageId, onClose, onCreated }: NewLeadModalProps) {
  const [selectedOrigin, setSelectedOrigin] = useState('')
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { stage_id: defaultStageId ?? stages[0]?.id, priority: 'media' },
  })

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) return

    const finalOrigin = data.origin === 'Personalizado' ? (data.customOrigin || 'Personalizado') : data.origin

    const { data: lead, error } = await supabase.from('leads').insert({
      organization_id: me.organization_id,
      stage_id: data.stage_id,
      name: data.name,
      company: data.company || undefined,
      value: data.value ? Number(data.value) : undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      origin: finalOrigin || undefined,
      priority: data.priority,
      responsible_id: data.responsible_id || undefined,
      next_action: data.next_action || undefined,
    }).select('*, responsible:responsible_id(id, full_name, avatar_url)').single()

    if (error) { toast.error('Erro ao criar lead'); return }
    toast.success(`Lead ${data.name} criado!`)
    onCreated(lead as LeadWithResponsible)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Novo lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-1">
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
            <div className="space-y-1.5">
              <Label className="text-sm">Etapa</Label>
              <Select defaultValue={defaultStageId ?? stages[0]?.id} onValueChange={v => setValue('stage_id', v ?? '')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Temperatura do Lead</Label>
              <Select defaultValue="media" onValueChange={v => setValue('priority', (v ?? 'media') as 'alta' | 'media' | 'baixa')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">🔥 Quente — Alta prioridade</SelectItem>
                  <SelectItem value="media">🌡️ Morno — Média prioridade</SelectItem>
                  <SelectItem value="baixa">❄️ Frio — Baixa prioridade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Origem do Lead</Label>
              <Select onValueChange={(v: string | null) => { if (!v) return; setSelectedOrigin(v); setValue('origin', v) }}>
                <SelectTrigger><SelectValue placeholder="Como esse lead chegou?" /></SelectTrigger>
                <SelectContent>
                  {ORIGINS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedOrigin === 'Personalizado' && (
                <Input
                  placeholder="Digite a origem personalizada..."
                  {...register('customOrigin')}
                  className="mt-2"
                />
              )}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Responsável</Label>
              <Select onValueChange={v => setValue('responsible_id', v as string)}>
                <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Próxima ação</Label>
              <Input placeholder="Enviar proposta, Agendar reunião..." {...register('next_action')} />
            </div>
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
