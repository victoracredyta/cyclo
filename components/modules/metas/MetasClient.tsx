'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Plus, Target, Trophy, TrendingUp, Trash2, X } from 'lucide-react'
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
  { value: 'posts', label: 'Posts' },
  { value: '%', label: '% (Porcentagem)' },
  { value: 'horas', label: 'Horas' },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Metas</h2>
          <p className="text-sm text-muted-foreground">{achieved} de {goals.length} metas atingidas</p>
        </div>
        <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-xs" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> Nova meta
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Progresso Geral', value: `${totalPct}%`, icon: TrendingUp, color: '#5B8CFF' },
          { label: 'Metas Atingidas', value: String(achieved), icon: Trophy, color: '#12B981' },
          { label: 'Total de Metas', value: String(goals.length), icon: Target, color: '#8B5CF6' },
        ].map(s => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="border-border shadow-none">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p>Nenhuma meta cadastrada.</p>
          <Button size="sm" className="mt-4 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white" onClick={openCreate}>
            Criar primeira meta
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal, i) => {
            const pct = Math.min((goal.current_value / goal.target_value) * 100, 100)
            const achieved = goal.current_value >= goal.target_value
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="border-border shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${goal.color}15` }}>
                        <Target className="w-4 h-4" style={{ color: goal.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{goal.label}</p>
                          {achieved && <Badge className="text-[9px] bg-[#12B981]/10 text-[#12B981] border-0 px-1.5">✓ Atingida</Badge>}
                          <Badge className="text-[9px] bg-muted border-0 text-muted-foreground ml-auto">{goal.period}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground">
                            {goal.unit === 'R$' ? `R$ ${goal.current_value.toLocaleString('pt-BR')}` : `${goal.current_value} ${goal.unit}`}
                            {' / '}
                            {goal.unit === 'R$' ? `R$ ${goal.target_value.toLocaleString('pt-BR')}` : `${goal.target_value} ${goal.unit}`}
                          </span>
                          <span className="text-xs font-bold ml-auto" style={{ color: goal.color }}>{Math.round(pct)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: goal.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: i * 0.04 }}
                          />
                        </div>
                        {/* Quick update input */}
                        <div className="flex items-center gap-2 mt-3">
                          <Input
                            type="number"
                            defaultValue={goal.current_value}
                            onBlur={e => updateProgress(goal.id, Number(e.target.value))}
                            className="h-7 text-xs w-32"
                            placeholder="Atualizar progresso"
                          />
                          <span className="text-xs text-muted-foreground">/ {goal.target_value} {goal.unit}</span>
                          <div className="ml-auto flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(goal)}>
                              <TrendingUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => deleteGoal(goal.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar meta' : 'Nova meta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
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
