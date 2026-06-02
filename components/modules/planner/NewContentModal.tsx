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
import type { ContentItem } from './ContentCard'

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  client_id: z.string().min(1, 'Cliente obrigatório'),
  channel: z.string().optional(),
  format: z.string().optional(),
  objective: z.string().optional(),
  scheduled_date: z.string().optional(),
  copy: z.string().optional(),
  hashtags: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const CHANNELS = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'twitter']
const FORMATS = ['Imagem', 'Carrossel', 'Vídeo', 'Reels', 'Stories', 'Artigo']
const OBJECTIVES = ['Awareness', 'Engajamento', 'Conversão', 'Educação', 'Autoridade']

interface NewContentModalProps {
  clients: Array<{ id: string; name: string }>
  defaultDate?: string
  onClose: () => void
  onCreated: (item: ContentItem) => void
}

export function NewContentModal({ clients, defaultDate, onClose, onCreated }: NewContentModalProps) {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { scheduled_date: defaultDate },
  })

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) return

    const { data: item, error } = await supabase.from('content_items').insert({
      organization_id: me.organization_id,
      client_id: data.client_id,
      title: data.title,
      channel: data.channel || undefined,
      format: data.format || undefined,
      objective: data.objective || undefined,
      scheduled_date: data.scheduled_date || undefined,
      copy: data.copy || undefined,
      hashtags: data.hashtags || undefined,
      status: 'producao',
    }).select('*, client:client_id(id, name)').single()

    if (error) { toast.error('Erro ao criar conteúdo'); return }
    toast.success('Conteúdo criado!')
    onCreated(item as ContentItem)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Nova peça de conteúdo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Título *</Label>
              <Input placeholder="Post de lançamento..." {...register('title')} />
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
                  {CHANNELS.map(c => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Formato</Label>
              <Select onValueChange={v => setValue('format', v as string)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Objetivo</Label>
              <Select onValueChange={v => setValue('objective', v as string)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Data programada</Label>
              <Input type="date" {...register('scheduled_date')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Copy / Legenda</Label>
              <textarea
                {...register('copy')}
                rows={3}
                placeholder="Texto do post..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm">Hashtags</Label>
              <Input placeholder="#marketing #agencia #digital" {...register('hashtags')} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar conteúdo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
