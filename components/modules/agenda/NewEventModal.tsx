'use client'

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

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  event_type: z.string(),
  start_at: z.string().min(1, 'Data de início obrigatória'),
  end_at: z.string().min(1, 'Data de fim obrigatória'),
  description: z.string().optional(),
  client_id: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const EVENT_TYPES = [
  { value: 'meeting', label: 'Reunião', color: '#5B8CFF' },
  { value: 'call', label: 'Ligação', color: '#12B981' },
  { value: 'task', label: 'Tarefa', color: '#F59E0B' },
  { value: 'deadline', label: 'Prazo', color: '#e1493c' },
  { value: 'reminder', label: 'Lembrete', color: '#8B5CF6' },
]

export type CalEvent = {
  id: string; title: string; event_type: string | null; start_at: string; end_at: string
  color: string; description: string | null; is_all_day: boolean
  client: { id: string; name: string } | null
}

interface NewEventModalProps {
  clients: Array<{ id: string; name: string }>
  defaultStart?: string
  onClose: () => void
  onCreated: (e: CalEvent) => void
}

export function NewEventModal({ clients, defaultStart, onClose, onCreated }: NewEventModalProps) {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      event_type: 'meeting',
      start_at: defaultStart ?? '',
      end_at: defaultStart ?? '',
    },
  })

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('id, organization_id').single()
    if (!me?.organization_id) return

    const typeConfig = EVENT_TYPES.find(t => t.value === data.event_type)

    const { data: event, error } = await supabase.from('calendar_events').insert({
      organization_id: me.organization_id,
      user_id: me.id,
      title: data.title,
      event_type: data.event_type,
      start_at: data.start_at,
      end_at: data.end_at,
      description: data.description || undefined,
      client_id: data.client_id || undefined,
      color: typeConfig?.color ?? '#5B8CFF',
      is_all_day: false,
    }).select('*, client:client_id(id, name)').single()

    if (error) { toast.error('Erro ao criar evento'); return }
    toast.success('Evento criado!')
    onCreated(event as CalEvent)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Novo evento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Título *</Label>
              <Input placeholder="Reunião de alinhamento..." {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Tipo</Label>
              <Select defaultValue="meeting" onValueChange={v => setValue('event_type', v as string)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Início *</Label>
              <Input type="datetime-local" {...register('start_at')} />
              {errors.start_at && <p className="text-xs text-destructive">{errors.start_at.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Fim *</Label>
              <Input type="datetime-local" {...register('end_at')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Cliente</Label>
              <Select onValueChange={v => setValue('client_id', v as string)}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Descrição</Label>
              <textarea
                {...register('description')}
                rows={2}
                placeholder="Observações..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar evento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
