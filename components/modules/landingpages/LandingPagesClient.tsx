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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Plus, Globe, Eye, Users, ExternalLink, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { LandingPage } from '@/types/database'

const schema = z.object({
  name: z.string().min(1, 'Obrigatório'),
  slug: z.string().min(1, 'Obrigatório').regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  client_id: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type PageWithClient = LandingPage & { client: { id: string; name: string } | null }

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: 'bg-muted/60 text-muted-foreground border-0' },
  publicada: { label: 'Publicada', cls: 'bg-[#12B981]/10 text-[#12B981] border-0' },
  pausada: { label: 'Pausada', cls: 'bg-[#F59E0B]/10 text-[#F59E0B] border-0' },
  arquivada: { label: 'Arquivada', cls: 'bg-muted/40 text-muted-foreground/60 border-0' },
}

interface Props {
  pages: PageWithClient[]
  clients: { id: string; name: string }[]
}

export function LandingPagesClient({ pages: initial, clients }: Props) {
  const [pages, setPages] = useState(initial)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { setSaving(false); return }

    const { data: page, error } = await supabase.from('landing_pages').insert({
      organization_id: me.organization_id,
      name: data.name,
      slug: data.slug,
      client_id: data.client_id || null,
      status: 'rascunho',
      leads_count: 0,
      views_count: 0,
    }).select('*, client:client_id(id, name)').single()

    if (error || !page) { toast.error('Erro ao criar landing page'); setSaving(false); return }
    setPages(prev => [page as PageWithClient, ...prev])
    toast.success('Landing page criada!')
    setSaving(false)
    setOpen(false)
    reset()
  }

  const deletePage = async (id: string) => {
    const supabase = createClient()
    await supabase.from('landing_pages').delete().eq('id', id)
    setPages(prev => prev.filter(p => p.id !== id))
    toast.success('Landing page removida')
  }

  const togglePublish = async (page: PageWithClient) => {
    const next = page.status === 'publicada' ? 'pausada' : 'publicada'
    const supabase = createClient()
    await supabase.from('landing_pages').update({ status: next }).eq('id', page.id)
    setPages(prev => prev.map(p => p.id === page.id ? { ...p, status: next } : p))
    toast.success(next === 'publicada' ? 'Landing page publicada!' : 'Landing page pausada')
  }

  const copySlug = (slug: string) => {
    navigator.clipboard.writeText(`/${slug}`)
    toast.success('Slug copiado!')
  }

  const totalViews = pages.reduce((s, p) => s + p.views_count, 0)
  const totalLeads = pages.reduce((s, p) => s + p.leads_count, 0)
  const published = pages.filter(p => p.status === 'publicada').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Landing Pages</h2>
          <p className="text-sm text-muted-foreground">{published} publicadas · {totalLeads} leads capturados</p>
        </div>
        <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-xs" onClick={() => setOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Nova landing page
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Visualizações', value: totalViews.toLocaleString('pt-BR'), icon: Eye, color: '#5B8CFF' },
          { label: 'Leads Capturados', value: totalLeads.toLocaleString('pt-BR'), icon: Users, color: '#12B981' },
          { label: 'Publicadas', value: String(published), icon: Globe, color: '#8B5CF6' },
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

      {pages.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p>Nenhuma landing page criada.</p>
          <Button size="sm" className="mt-4 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white" onClick={() => setOpen(true)}>
            Criar primeira landing page
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((page, i) => {
            const cfg = STATUS_CONFIG[page.status] ?? STATUS_CONFIG.rascunho
            const convRate = page.views_count > 0 ? ((page.leads_count / page.views_count) * 100).toFixed(1) : '0.0'
            return (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl"
              >
                <div className="w-9 h-9 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-[#8B5CF6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{page.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground font-mono">/{page.slug}</span>
                    <button onClick={() => copySlug(page.slug ?? '')} className="text-muted-foreground hover:text-foreground">
                      <Copy className="w-3 h-3" />
                    </button>
                    {page.client && <span className="text-xs text-muted-foreground">· {page.client.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs shrink-0">
                  <div className="text-center">
                    <p className="font-bold">{page.views_count.toLocaleString()}</p>
                    <p className="text-muted-foreground">Visitas</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{page.leads_count}</p>
                    <p className="text-muted-foreground">Leads</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{convRate}%</p>
                    <p className="text-muted-foreground">Conversão</p>
                  </div>
                </div>
                <Badge className={cn('text-[10px] shrink-0', cfg.cls)}>{cfg.label}</Badge>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => togglePublish(page)}>
                    {page.status === 'publicada' ? 'Pausar' : 'Publicar'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => deletePage(page.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova landing page</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome *</Label>
              <Input {...register('name')} placeholder="Captação Black Friday" className="h-9 text-sm" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Slug (URL) *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  {...register('slug')}
                  placeholder="black-friday-2026"
                  className="h-9 text-sm"
                  onChange={e => {
                    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                  }}
                />
              </div>
              {errors.slug && <p className="text-xs text-red-500">{errors.slug.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cliente (opcional)</Label>
              <Select onValueChange={v => setValue('client_id', v as string)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 text-sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-sm">
                {saving ? 'Criando…' : 'Criar página'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
