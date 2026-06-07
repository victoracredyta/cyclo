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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Plus, Target, Trophy, TrendingUp, Trash2, Sparkles, Flame, Zap, Award } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Goal } from '@/types/database'

const schema = z.object({
  label: z.string().min(1, 'Obrigatório'),
  target_value: z.coerce.number().min(1, 'Mínimo 1'),
  current_value: z.coerce.number().min(0),
  unit: z.string(),
  color: z.string(),
  period: z.string(),
})

type FormData = z.infer<typeof schema>

const COLORS = ['#5B8CFF', '#12B981', '#F59E0B', '#8B5CF6', '#e1493c', '#2563EB']
const UNITS = [
  { value: 'R$', label: 'R$ (Reais)' },
  { value: 'clientes', label: 'Clientes' },
  { value: 'leads', label: 'Leads' },
  { value: 'ligações', label: 'Ligações' },
  { value: 'emails', label: 'Emails enviados' },
  { value: 'prospects', label: 'Novos prospects' },
  { value: 'posts', label: 'Posts publicados' },
  { value: '%', label: '% (Porcentagem)' },
  { value: 'reuniões', label: 'Reuniões realizadas' },
  { value: 'contratos', label: 'Contratos fechados' },
]

const CATEGORIES = [
  { value: 'vendas', label: '💰 Vendas', defaultUnit: 'R$' },
  { value: 'leads', label: '🎯 Geração de Leads', defaultUnit: 'leads' },
  { value: 'ligacoes', label: '📞 Ligações', defaultUnit: 'ligações' },
  { value: 'email', label: '📧 Email Marketing', defaultUnit: 'emails' },
  { value: 'prospects', label: '🔍 Prospecção', defaultUnit: 'prospects' },
  { value: 'retencao', label: '🤝 Retenção', defaultUnit: 'clientes' },
  { value: 'personalizado', label: '⚙️ Personalizado', defaultUnit: 'R$' },
]

interface Props {
  goals: Goal[]
  users: Array<{ id: string; full_name: string | null; avatar_url: string | null }>
}

export function MetasClient({ goals: initial, users }: Props) {
  const [goals, setGoals] = useState(initial)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: { color: '#5B8CFF', unit: 'R$', period: 'mensal', current_value: 0 },
  })
  const color = watch('color')

  const openCreate = () => {
    reset({ color: '#5B8CFF', unit: 'R$', period: 'mensal', current_value: 0 })
    setEditingId(null)
    setOpen(true)
  }

  const openEdit = (g: Goal) => {
    reset({
      label: g.label,
      target_value: g.target_value,
      current_value: g.current_value,
      unit: g.unit ?? 'R$',
      color: g.color,
      period: g.period,
    })
    setEditingId(g.id)
    setOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { setSaving(false); return }

    const now = new Date()

    if (editingId) {
      const { error } = await supabase.from('goals').update(data).eq('id', editingId)
      if (error) { toast.error('Erro ao salvar'); setSaving(false); return }
      setGoals(prev => prev.map(g => g.id === editingId ? { ...g, ...data } : g))
      toast.success('Meta atualizada')
    } else {
      const { data: goal, error } = await supabase.from('goals').insert({
        ...data,
        organization_id: me.organization_id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      }).select().single()
      if (error || !goal) { toast.error('Erro ao criar'); setSaving(false); return }
      setGoals(prev => [goal as Goal, ...prev])
      toast.success('Meta criada!')
    }

    setSaving(false)
    setOpen(false)
  }

  const deleteGoal = async (id: string) => {
    const supabase = createClient()
    await supabase.from('goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
    toast.success('Meta removida')
  }

  const updateProgress = async (id: string, current: number) => {
    const supabase = createClient()
    await supabase.from('goals').update({ current_value: current }).eq('id', id)
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current_value: current } : g))
  }

  const totalPct = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + Math.min((g.current_value / g.target_value) * 100, 100), 0) / goals.length)
    : 0

  const achieved = goals.filter(g => g.current_value >= g.target_value).length

  const inProgress = goals.length - achieved
  const formatVal = (v: number, unit: string) => unit === 'R$' ? `R$ ${v.toLocaleString('pt-BR')}` : `${v.toLocaleString('pt-BR')} ${unit}`

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#5B8CFF]/8 via-[#8B5CF6]/5 to-transparent p-6">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-[#5B8CFF]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-[#8B5CF6]/8 blur-3xl pointer-events-none" />
        <div className="relative flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#5B8CFF]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#5B8CFF]">Performance</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight">Metas</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {achieved > 0
                ? <>Você já bateu <span className="font-bold text-[#12B981]">{achieved}</span> de <span className="font-bold">{goals.length}</span> metas neste período.</>
                : <>Acompanhe e impulsione o crescimento da sua agência em tempo real.</>}
            </p>
          </div>
          <Button className="bg-foreground hover:bg-foreground/90 text-background gap-2 h-10 px-5 rounded-full shadow-lg" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Nova meta
          </Button>
        </div>
      </div>

      {/* Premium summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall progress radial */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border bg-gradient-to-br from-card to-[#5B8CFF]/5 shadow-sm hover:shadow-md transition-shadow h-full">
            <CardContent className="p-5 flex items-center gap-4">
              <RadialProgress value={totalPct} color="#5B8CFF" size={70} stroke={6} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Progresso Geral</p>
                <p className="text-3xl font-black tracking-tight">{totalPct}<span className="text-base font-bold text-muted-foreground">%</span></p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {[
          { label: 'Metas Atingidas', value: achieved, icon: Trophy, color: '#12B981', tag: achieved > 0 ? '+1 este mês' : 'Vamos lá!' },
          { label: 'Em Progresso', value: inProgress, icon: Flame, color: '#F59E0B', tag: 'Andamento' },
          { label: 'Total Metas', value: goals.length, icon: Target, color: '#8B5CF6', tag: 'Cadastradas' },
        ].map((s, idx) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * (idx + 1) }}>
              <Card className="border-border shadow-sm hover:shadow-md transition-shadow h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${s.color}25, ${s.color}10)` }}>
                      <Icon className="w-5 h-5" style={{ color: s.color }} />
                    </div>
                    <Badge className="text-[9px] border-0 font-semibold" style={{ background: `${s.color}15`, color: s.color }}>{s.tag}</Badge>
                  </div>
                  <p className="text-3xl font-black tracking-tight leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">{s.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Goals — premium cards */}
      {goals.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-[#5B8CFF]/10 flex items-center justify-center mx-auto mb-4">
            <Target className="w-7 h-7 text-[#5B8CFF]" />
          </div>
          <p className="text-base font-semibold mb-1">Nenhuma meta ainda</p>
          <p className="text-sm text-muted-foreground mb-5">Crie sua primeira meta e acompanhe o crescimento em tempo real.</p>
          <Button className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-2 rounded-full" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Criar primeira meta
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Metas em andamento</h3>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {goals.map((goal, i) => {
              const pct = Math.min((goal.current_value / goal.target_value) * 100, 100)
              const isAchieved = goal.current_value >= goal.target_value
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card
                    className={cn(
                      'border-border shadow-sm hover:shadow-lg transition-all relative overflow-hidden',
                      isAchieved && 'ring-1 ring-[#12B981]/30'
                    )}
                  >
                    {/* Achieved glow */}
                    {isAchieved && (
                      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#12B981]/15 blur-3xl pointer-events-none" />
                    )}
                    {/* Color accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ background: goal.color }} />
                    <CardContent className="p-5 relative">
                      <div className="flex items-start gap-4">
                        <RadialProgress value={Math.round(pct)} color={goal.color} size={80} stroke={7} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm leading-tight truncate">{goal.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{goal.period}</p>
                            </div>
                            {isAchieved ? (
                              <Badge className="text-[9px] bg-[#12B981] text-white border-0 px-2 gap-1 shrink-0">
                                <Award className="w-2.5 h-2.5" /> Atingida
                              </Badge>
                            ) : (
                              <Badge className="text-[9px] border-0 font-semibold shrink-0" style={{ background: `${goal.color}15`, color: goal.color }}>
                                {pct >= 75 ? '🔥 Quase lá' : pct >= 40 ? '⚡ Em ritmo' : '🌱 Iniciando'}
                              </Badge>
                            )}
                          </div>

                          {/* Numbers */}
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-xl font-black tracking-tight" style={{ color: goal.color }}>
                              {formatVal(goal.current_value, goal.unit ?? 'R$')}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              de {formatVal(goal.target_value, goal.unit ?? 'R$')}
                            </span>
                          </div>

                          {/* Update + actions */}
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              defaultValue={goal.current_value}
                              onBlur={e => updateProgress(goal.id, Number(e.target.value))}
                              className="h-8 text-xs flex-1"
                              placeholder="Atualizar..."
                            />
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(goal)} title="Editar">
                              <TrendingUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500" onClick={() => deleteGoal(goal.id)} title="Excluir">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar meta' : 'Nova meta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Categoria</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setValue('unit', cat.defaultUnit)
                      setValue('label', `${cat.label.split(' ').slice(1).join(' ')} — `)
                    }}
                    className="text-left text-xs px-2.5 py-1.5 rounded-lg border border-border hover:border-[#5B8CFF]/50 hover:bg-[#5B8CFF]/5 transition-colors"
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da meta *</Label>
              <Input {...register('label')} placeholder="Ex: Novos clientes no mês" className="h-9 text-sm" />
              {errors.label && <p className="text-xs text-red-500">{errors.label.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor alvo *</Label>
                <Input {...register('target_value')} type="number" placeholder="100" className="h-9 text-sm" />
                {errors.target_value && <p className="text-xs text-red-500">{errors.target_value.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Progresso atual</Label>
                <Input {...register('current_value')} type="number" placeholder="0" className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unidade</Label>
                <Select defaultValue="R$" onValueChange={v => setValue('unit', v as string)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Período</Label>
                <Select defaultValue="mensal" onValueChange={v => setValue('period', v as string)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cor</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setValue('color', c)}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 transition-all',
                      color === c ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 text-sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-sm">
                {saving ? 'Salvando…' : editingId ? 'Salvar' : 'Criar meta'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── RadialProgress ───────────────────────────────────────────
function RadialProgress({ value, color, size = 70, stroke = 6 }: { value: number; color: string; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(value, 100) / 100) * circumference
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-muted/40"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-black tabular-nums" style={{ color }}>
          {Math.round(value)}<span className="text-[10px] font-bold">%</span>
        </span>
      </div>
    </div>
  )
}
