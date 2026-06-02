'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import { Plus, Search, Trash2, TrendingUp, TrendingDown, Star } from 'lucide-react'
import { toast } from 'sonner'
import type { Competitor } from '@/types/database'

const schema = z.object({
  name: z.string().min(1, 'Obrigatório'),
  instagram_followers: z.string().optional(),
  linkedin_followers: z.string().optional(),
  branding: z.coerce.number().min(0).max(10),
  visual: z.coerce.number().min(0).max(10),
  frequency: z.coerce.number().min(0).max(10),
  quality: z.coerce.number().min(0).max(10),
  seo: z.coerce.number().min(0).max(10),
  ads: z.coerce.number().min(0).max(10),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const COLORS = ['#5B8CFF', '#12B981', '#F59E0B', '#8B5CF6', '#e1493c']

const RADAR_KEYS = [
  { key: 'branding', label: 'Branding' },
  { key: 'visual', label: 'Visual' },
  { key: 'frequency', label: 'Frequência' },
  { key: 'quality', label: 'Qualidade' },
  { key: 'seo', label: 'SEO' },
  { key: 'ads', label: 'Anúncios' },
]

interface Props { competitors: Competitor[] }

export function PesquisaClient({ competitors: initial }: Props) {
  const [competitors, setCompetitors] = useState(initial)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: { branding: 5, visual: 5, frequency: 5, quality: 5, seo: 5, ads: 5 },
  })

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { setSaving(false); return }

    const score = Math.round((data.branding + data.visual + data.frequency + data.quality + data.seo + data.ads) / 6 * 10)

    const { data: comp, error } = await supabase.from('competitors').insert({
      organization_id: me.organization_id,
      name: data.name,
      instagram_followers: data.instagram_followers || null,
      linkedin_followers: data.linkedin_followers || null,
      score,
      branding: data.branding,
      visual: data.visual,
      frequency: data.frequency,
      quality: data.quality,
      seo: data.seo,
      ads: data.ads,
      strengths: data.strengths ? data.strengths.split('\n').filter(Boolean) : [],
      weaknesses: data.weaknesses ? data.weaknesses.split('\n').filter(Boolean) : [],
    }).select().single()

    if (error || !comp) { toast.error('Erro ao adicionar'); setSaving(false); return }
    setCompetitors(prev => [...prev, comp as Competitor].sort((a, b) => b.score - a.score))
    toast.success('Concorrente adicionado!')
    setSaving(false)
    setOpen(false)
    reset()
  }

  const deleteComp = async (id: string) => {
    const supabase = createClient()
    await supabase.from('competitors').delete().eq('id', id)
    setCompetitors(prev => prev.filter(c => c.id !== id))
    setSelected(prev => prev.filter(s => s !== id))
    toast.success('Removido')
  }

  const toggleSelect = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : prev.length < 4 ? [...prev, id] : prev
    )
  }

  const radarData = RADAR_KEYS.map(({ key, label }) => {
    const entry: Record<string, string | number> = { subject: label }
    competitors
      .filter(c => selected.length === 0 || selected.includes(c.id))
      .forEach((c, i) => { entry[c.name] = (c as Record<string, unknown>)[key] as number })
    return entry
  })

  const visibleCompetitors = competitors.filter(c => selected.length === 0 || selected.includes(c.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Pesquisa de Mercado</h2>
          <p className="text-sm text-muted-foreground">{competitors.length} concorrentes mapeados</p>
        </div>
        <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-xs" onClick={() => setOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Adicionar concorrente
        </Button>
      </div>

      {competitors.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p>Nenhum concorrente mapeado ainda.</p>
          <Button size="sm" className="mt-4 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white" onClick={() => setOpen(true)}>
            Mapear primeiro concorrente
          </Button>
        </div>
      ) : (
        <>
          {/* Selection hint */}
          {competitors.length > 1 && (
            <p className="text-xs text-muted-foreground">Selecione até 4 concorrentes para comparar no radar</p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Competitor cards */}
            <div className="space-y-2">
              {competitors.map((comp, i) => {
                const isSelected = selected.includes(comp.id)
                const colorIdx = competitors.indexOf(comp) % COLORS.length
                return (
                  <motion.div
                    key={comp.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => toggleSelect(comp.id)}
                    className={`p-4 bg-card border rounded-xl cursor-pointer transition-all ${isSelected ? 'border-[#5B8CFF]/50 shadow-sm' : 'border-border hover:border-border/80'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ background: COLORS[colorIdx] }}
                      >
                        {comp.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{comp.name}</p>
                          <div className="flex items-center gap-1 ml-auto">
                            <Star className="w-3 h-3 text-[#F59E0B]" />
                            <span className="text-xs font-bold">{comp.score}/100</span>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                          {comp.instagram_followers && <span>📷 {comp.instagram_followers}</span>}
                          {comp.linkedin_followers && <span>💼 {comp.linkedin_followers}</span>}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteComp(comp.id) }}
                        className="text-muted-foreground hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {(comp.strengths.length > 0 || comp.weaknesses.length > 0) && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {comp.strengths.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-[#12B981] flex items-center gap-1 mb-1">
                              <TrendingUp className="w-3 h-3" /> Forças
                            </p>
                            {comp.strengths.slice(0, 2).map((s, j) => (
                              <p key={j} className="text-[11px] text-muted-foreground truncate">· {s}</p>
                            ))}
                          </div>
                        )}
                        {comp.weaknesses.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-[#e1493c] flex items-center gap-1 mb-1">
                              <TrendingDown className="w-3 h-3" /> Fraquezas
                            </p>
                            {comp.weaknesses.slice(0, 2).map((w, j) => (
                              <p key={j} className="text-[11px] text-muted-foreground truncate">· {w}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* Radar chart */}
            <Card className="border-border shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Comparativo de Performance
                  {selected.length > 0 && <span className="text-xs text-muted-foreground font-normal ml-2">({selected.length} selecionados)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} />
                    {visibleCompetitors.map((comp, i) => (
                      <Radar
                        key={comp.id}
                        name={comp.name}
                        dataKey={comp.name}
                        stroke={COLORS[i % COLORS.length]}
                        fill={COLORS[i % COLORS.length]}
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-1">
                  {visibleCompetitors.map((comp, i) => (
                    <div key={comp.id} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{comp.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar concorrente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do concorrente *</Label>
              <Input {...register('name')} placeholder="Agência XYZ" className="h-9 text-sm" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Seguidores Instagram</Label>
                <Input {...register('instagram_followers')} placeholder="12.5k" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Seguidores LinkedIn</Label>
                <Input {...register('linkedin_followers')} placeholder="3.2k" className="h-9 text-sm" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-2">Notas (0–10)</p>
              <div className="grid grid-cols-3 gap-3">
                {RADAR_KEYS.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input {...register(key as keyof FormData)} type="number" min={0} max={10} step={0.5} className="h-8 text-sm" />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pontos fortes (1 por linha)</Label>
                <textarea {...register('strengths')} rows={3} placeholder="Forte presença no TikTok&#10;Identidade visual clara" className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pontos fracos (1 por linha)</Label>
                <textarea {...register('weaknesses')} rows={3} placeholder="Baixa frequência&#10;Copy genérico" className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 text-sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-sm">
                {saving ? 'Salvando…' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
