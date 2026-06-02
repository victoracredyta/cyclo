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
  client_id: z.string().min(1, 'Cliente obrigatório'),
  channel: z.string().optional(),
  type: z.string().optional(),
  due_date: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const CHANNELS = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'twitter', 'email', 'outro']
const TYPES = ['Post', 'Story', 'Reels', 'Carrossel', 'Vídeo', 'Arte gráfica', 'Texto / Copy', 'Banner']

type Approval = {
  id: string; title: string; status: string; channel: string | null; type: string | null
  due_date: string | null; created_at: string; current_version: number
  client: { id: string; name: string } | null
  comments: { id: string }[]
}

interface NewApprovalModalProps {
  clients: Array<{ id: string; name: string }>
  onClose: () => void
  onCreated: (a: Approval) => void
}

export function NewApprovalModal({ clients, onClose, onCreated }: NewApprovalModalProps) {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) return

    const { data: approval, error } = await supabase.from('approvals').insert({
      organization_id: me.organization_id,
      client_id: data.client_id,
      title: data.title,
      channel: data.channel || undefined,
      type: data.type || undefined,
      due_date: data.due_date || undefined,
      status: 'aguardando',
    }).select('*, client:client_id(id, name), comments:approval_comments(id)').single()

    if (error) { toast.error('Erro ao criar aprovação'); return }
    toast.success('Aprovação criada!')
    onCreated(approval as Approval)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Nova aprovação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Título *</Label>
              <Input placeholder="Post do produto X..." {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Cliente *</Label>
              <Select onValueChange={v => setValue('client_id', v as string)}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="text-xs text-destructive">{errors.client_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Canal</Label>
              <Select onValueChange={v => setValue('channel', v as string)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo</Label>
              <Select onValueChange={v => setValue('type', v as string)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Prazo</Label>
              <Input type="date" {...register('due_date')} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar aprovação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
