'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Mail, Send, Eye, MousePointer, Trash2, MoreHorizontal, Play, Pause } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { EmailCampaign } from '@/types/database'

const schema = z.object({
  name: z.string().min(1, 'Obrigatório'),
  subject: z.string().min(1, 'Obrigatório'),
  body_html: z.string().min(1, 'Obrigatório'),
  list_name: z.string().optional(),
  n8n_webhook_url: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  rascunho: { label: 'Rascunho', color: '#6B7280', bg: 'bg-muted/60 text-muted-foreground' },
  agendada: { label: 'Agendada', color: '#F59E0B', bg: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  enviando: { label: 'Enviando', color: '#5B8CFF', bg: 'bg-[#5B8CFF]/10 text-[#5B8CFF]' },
  enviada: { label: 'Enviada', color: '#12B981', bg: 'bg-[#12B981]/10 text-[#12B981]' },
  pausada: { label: 'Pausada', color: '#8B5CF6', bg: 'bg-[#8B5CF6]/10 text-[#8B5CF6]' },
}

interface Props { campaigns: EmailCampaign[] }

export function CampanhasClient({ campaigns: initial }: Props) {
  const [campaigns, setCampaigns] = useState(initial)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { setSaving(false); return }

    const { data: camp, error } = await supabase.from('email_campaigns').insert({
      organization_id: me.organization_id,
      name: data.name,
      subject: data.subject,
      body_html: data.body_html,
      list_name: data.list_name || null,
      n8n_webhook_url: data.n8n_webhook_url || null,
      status: 'rascunho',
      sent_count: 0,
      opened_count: 0,
      clicked_count: 0,
      batch_size: 50,
      batch_interval_minutes: 60,
      daily_limit: 500,
      send_delay_seconds: 5,
    }).select().single()

    if (error || !camp) { toast.error('Erro ao criar campanha'); setSaving(false); return }
    setCampaigns(prev => [camp as EmailCampaign, ...prev])
    toast.success('Campanha criada!')
    setSaving(false)
    setOpen(false)
    reset()
  }

  const deleteCampaign = async (id: string) => {
    const supabase = createClient()
    await supabase.from('email_campaigns').delete().eq('id', id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
    toast.success('Campanha removida')
  }

  const toggleStatus = async (camp: EmailCampaign) => {
    const next = camp.status === 'enviando' ? 'pausada' : camp.status === 'pausada' ? 'enviando' : 'enviando'
    const supabase = createClient()
    await supabase.from('email_campaigns').update({ status: next }).eq('id', camp.id)
    setCampaigns(prev => prev.map(c => c.id === camp.id ? { ...c, status: next } : c))
    toast.success(next === 'enviando' ? 'Campanha iniciada' : 'Campanha pausada')
  }

  const totalSent = campaigns.reduce((s, c) => s + c.sent_count, 0)
  const totalOpened = campaigns.reduce((s, c) => s + c.opened_count, 0)
  const totalClicked = campaigns.reduce((s, c) => s + c.clicked_count, 0)
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Campanhas</h2>
          <p className="text-sm text-muted-foreground">{campaigns.length} campanhas · {totalSent.toLocaleString('pt-BR')} disparos</p>
        </div>
        <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-xs" onClick={() => setOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Nova campanha
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Disparos', value: totalSent.toLocaleString('pt-BR'), icon: Send, color: '#5B8CFF' },
          { label: 'Abertos', value: totalOpened.toLocaleString('pt-BR'), icon: Eye, color: '#12B981' },
          { label: 'Clicados', value: totalClicked.toLocaleString('pt-BR'), icon: MousePointer, color: '#8B5CF6' },
          { label: 'Taxa Abertura', value: `${avgOpenRate}%`, icon: Mail, color: '#F59E0B' },
        ].map(s => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="border-border shadow-none">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* List */}
      {campaigns.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p>Nenhuma campanha criada.</p>
          <Button size="sm" className="mt-4 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white" onClick={() => setOpen(true)}>
            Criar primeira campanha
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((camp, i) => {
            const cfg = STATUS_CONFIG[camp.status] ?? STATUS_CONFIG.rascunho
            const openRate = camp.sent_count > 0 ? Math.round((camp.opened_count / camp.sent_count) * 100) : 0
            const clickRate = camp.sent_count > 0 ? Math.round((camp.clicked_count / camp.sent_count) * 100) : 0
            return (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl"
              >
                <div className="w-9 h-9 rounded-full bg-[#5B8CFF]/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[#5B8CFF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{camp.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{camp.subject}</p>
                </div>
                <div className="flex items-center gap-6 text-xs shrink-0">
                  <div className="text-center">
                    <p className="font-bold">{camp.sent_count.toLocaleString()}</p>
                    <p className="text-muted-foreground">Enviados</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{openRate}%</p>
                    <p className="text-muted-foreground">Abertos</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{clickRate}%</p>
                    <p className="text-muted-foreground">Cliques</p>
                  </div>
                </div>
                <Badge className={cn('text-[10px] border-0 shrink-0', cfg.bg)}>{cfg.label}</Badge>
                <div className="flex gap-1 shrink-0">
                  {(camp.status === 'rascunho' || camp.status === 'pausada' || camp.status === 'enviando') && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleStatus(camp)}>
                      {camp.status === 'enviando' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => deleteCampaign(camp.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova campanha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da campanha *</Label>
              <Input {...register('name')} placeholder="Black Friday 2026" className="h-9 text-sm" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assunto do e-mail *</Label>
              <Input {...register('subject')} placeholder="🔥 Oferta especial para você!" className="h-9 text-sm" />
              {errors.subject && <p className="text-xs text-red-500">{errors.subject.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Corpo do e-mail *</Label>
              <Textarea {...register('body_html')} placeholder="Conteúdo do e-mail em HTML ou texto..." rows={4} className="text-sm resize-none" />
              {errors.body_html && <p className="text-xs text-red-500">{errors.body_html.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Lista / Segmento</Label>
                <Input {...register('list_name')} placeholder="newsletter" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Webhook N8N</Label>
                <Input {...register('n8n_webhook_url')} placeholder="https://n8n.io/..." className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 text-sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-sm">
                {saving ? 'Criando…' : 'Criar campanha'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
