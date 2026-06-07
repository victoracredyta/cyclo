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
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const SERVICES = ['Social Media', 'Tráfego Pago', 'SEO', 'Email Marketing', 'Branding', 'Criação de Conteúdo', 'Website', 'Consultoria']
const SECTORS = ['E-commerce', 'Saúde', 'Educação', 'Imobiliário', 'Gastronomia', 'Tecnologia', 'Varejo', 'Serviços', 'Indústria', 'Outro']

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  sector: z.string().optional(),
  segment_id: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  mrr: z.string().optional(),
  responsible_id: z.string().optional(),
  objectives: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type SegmentOption = { id: string; name: string; color: string }

interface NewClientModalProps {
  users: Array<{ id: string; full_name: string | null; avatar_url: string | null }>
  onClose: () => void
}

export function NewClientModal({ users, onClose }: NewClientModalProps) {
  const router = useRouter()
  const [services, setServices] = useState<string[]>([])
  const [segments, setSegments] = useState<SegmentOption[]>([])

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

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    const { data: org } = await supabase.from('users').select('organization_id').single()
    if (!org?.organization_id) return

    const { data: client, error } = await supabase.from('clients').insert({
      organization_id: org.organization_id,
      name: data.name,
      sector: data.sector || undefined,
      segment_id: data.segment_id || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      mrr: Number(data.mrr) || 0,
      responsible_id: data.responsible_id || undefined,
      objectives: data.objectives || undefined,
      services,
    }).select().single()

    if (error) { toast.error('Erro ao criar cliente'); return }
    toast.success(`Cliente ${data.name} criado!`)
    router.refresh()
    onClose()
    router.push(`/crm/${client.id}`)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Novo cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
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
            <div className="space-y-1.5">
              <Label className="text-sm">Email</Label>
              <Input type="email" placeholder="contato@empresa.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Telefone</Label>
              <Input placeholder="(11) 99999-9999" {...register('phone')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Responsável</Label>
              <Select onValueChange={v => setValue('responsible_id', v as string)}>
                <SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Objetivo / Briefing</Label>
              <textarea
                {...register('objectives')}
                rows={2}
                placeholder="Objetivo principal do cliente com a agência..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Services */}
          <div className="space-y-2">
            <Label className="text-sm">Serviços contratados</Label>
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
          </div>

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
