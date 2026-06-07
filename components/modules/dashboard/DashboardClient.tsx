'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DollarSign, Users, CheckSquare, TrendingUp, AlertTriangle,
  Bot, Zap, Plus, ArrowRight,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Goal, Automation } from '@/types/database'

interface PipelineStageData {
  id: string; name: string; color: string; order_index: number
  leads: Array<{ id: string; value: number | null }>
  value: number
}

interface DashboardClientProps {
  mrr: number
  activeClientsCount: number
  riskClients: Array<{ id: string; name: string; health_score: number }>
  pendingApprovals: number
  pipelineValue: number
  openLeadsCount: number
  pipelineByStage: PipelineStageData[]
  goals: Goal[]
  automations: Automation[]
}

// Mock MRR trend (last 6 months) — replaced with real data when available
function generateMrrTrend(currentMrr: number) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']
  return months.map((m, i) => ({
    month: m,
    receita: Math.round(currentMrr * (0.6 + i * 0.08) * (0.95 + Math.random() * 0.1)),
    meta: Math.round(currentMrr * (0.65 + i * 0.07)),
  }))
}

const aiInsights = [
  { icon: '⚠️', text: 'Verifique clientes com health score abaixo de 50 — risco de churn.', color: 'text-red-400' },
  { icon: '💰', text: 'Pipeline com oportunidades abertas. Agende follow-ups esta semana.', color: 'text-yellow-400' },
  { icon: '📈', text: 'Conteúdos com status "Aguardando" podem atrasar aprovações.', color: 'text-blue-400' },
  { icon: '🎯', text: 'Configure metas mensais para acompanhar o crescimento da equipe.', color: 'text-green-400' },
]

export function DashboardClient({
  mrr, activeClientsCount, riskClients, pendingApprovals,
  pipelineValue, openLeadsCount, pipelineByStage,
  goals, automations,
}: DashboardClientProps) {
  const [greeting] = useState(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  })

  const mrrTrend = generateMrrTrend(mrr)
  const maxPipelineValue = Math.max(...pipelineByStage.map(s => s.value), 1)

  const kpis = [
    {
      label: 'MRR Total',
      value: `R$ ${mrr.toLocaleString('pt-BR')}`,
      sub: `${activeClientsCount} clientes ativos`,
      icon: DollarSign,
      color: '#5B8CFF',
      bg: 'bg-[#5B8CFF]/10',
    },
    {
      label: 'Clientes Ativos',
      value: String(activeClientsCount),
      sub: riskClients.length > 0 ? `${riskClients.length} em risco` : 'Carteira saudável',
      icon: Users,
      color: '#12B981',
      bg: 'bg-[#12B981]/10',
    },
    {
      label: 'Pipeline',
      value: `R$ ${pipelineValue.toLocaleString('pt-BR')}`,
      sub: `${openLeadsCount} oportunidades abertas`,
      icon: TrendingUp,
      color: '#8B5CF6',
      bg: 'bg-[#8B5CF6]/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{greeting}! 👋</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Aqui está o resumo do seu negócio hoje.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Cliente
            </Button>
          </Link>
          <Link href="/pipeline">
            <Button size="sm" className="gap-1.5 text-xs bg-[#5B8CFF] hover:bg-[#4a7aee] text-white">
              <Plus className="w-3.5 h-3.5" /> Lead
            </Button>
          </Link>
        </div>
      </div>

      {/* Risk alert */}
      {riskClients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3"
        >
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 flex-1">
            <strong>{riskClients.length} cliente{riskClients.length > 1 ? 's' : ''}</strong> com health score crítico:{' '}
            {riskClients.slice(0, 3).map(c => c.name).join(', ')}
            {riskClients.length > 3 && ` +${riskClients.length - 3}`}
          </p>
          <Link href="/crm">
            <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white text-xs h-7 shrink-0">
              Ver clientes
            </Button>
          </Link>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="border-border shadow-none">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
                  <div className={cn('p-1.5 rounded-lg', kpi.bg)}>
                    <Icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* MRR Chart */}
        <Card className="lg:col-span-2 border-border shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Receita vs Meta</CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#5B8CFF] inline-block rounded" />Receita</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#5B8CFF]/30 inline-block rounded border-dashed border border-[#5B8CFF]/40" />Meta</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={mrrTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B8CFF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#5B8CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`R$ ${Number(v).toLocaleString('pt-BR')}`, '']}
                />
                <Area type="monotone" dataKey="receita" stroke="#5B8CFF" strokeWidth={2} fill="url(#colorReceita)" />
                <Area type="monotone" dataKey="meta" stroke="#5B8CFF" strokeWidth={1.5} strokeDasharray="4 4" fill="none" opacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#5B8CFF]" />
              CYCLO IA Insights
              <Badge className="text-[9px] bg-[#5B8CFF]/15 text-[#5B8CFF] border-0 ml-auto">LIVE</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiInsights.map((ins, i) => (
              <div key={i} className="flex gap-2.5 text-xs">
                <span className="text-base leading-none mt-0.5 shrink-0">{ins.icon}</span>
                <p className="text-muted-foreground leading-relaxed">{ins.text}</p>
              </div>
            ))}
            <Link href="/ia">
              <Button variant="ghost" size="sm" className="w-full text-xs text-[#5B8CFF] hover:text-[#5B8CFF] mt-1 h-7">
                Conversar com a IA <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Bottom widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pipeline by stage */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Pipeline por etapa</CardTitle>
              <Link href="/pipeline" className="text-xs text-[#5B8CFF] hover:underline">Ver tudo</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {pipelineByStage.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum lead no pipeline</p>
            ) : (
              pipelineByStage.map(stage => (
                <div key={stage.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{stage.name}</span>
                    <span className="text-muted-foreground">{stage.leads.length} leads</span>
                  </div>
                  <Progress
                    value={(stage.value / maxPipelineValue) * 100}
                    className="h-1.5 bg-muted [&>div]:transition-all"
                    style={{ '--progress-color': stage.color } as React.CSSProperties}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Goals + Automations */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Metas do mês</CardTitle>
              <Link href="/metas" className="text-xs text-[#5B8CFF] hover:underline">Ver todas</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {goals.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-2">
                <Link href="/metas" className="text-[#5B8CFF]">Configure suas metas</Link>
              </div>
            ) : (
              goals.slice(0, 3).map(g => {
                const pct = Math.min((g.current_value / g.target_value) * 100, 100)
                return (
                  <div key={g.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate">{g.label}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{Math.round(pct)}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5 bg-muted" />
                  </div>
                )
              })
            )}
            {automations.length > 0 && (
              <div className="pt-1 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Zap className="w-3 h-3 text-[#F59E0B]" />
                  <span>{automations.length} automação{automations.length > 1 ? 'ões' : ''} ativa{automations.length > 1 ? 's' : ''}</span>
                  <span className="ml-auto">{automations.reduce((s, a) => s + a.runs_count, 0)} exec.</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
