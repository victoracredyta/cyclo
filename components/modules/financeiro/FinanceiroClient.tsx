'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock, Download, CreditCard, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Invoice } from '@/types/database'

type ClientRow = { id: string; name: string; mrr: number; status: string }

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: typeof CheckCircle }> = {
  pago: { label: 'Pago', cls: 'bg-[#12B981]/10 text-[#12B981] border-0', icon: CheckCircle },
  pendente: { label: 'Pendente', cls: 'bg-[#F59E0B]/10 text-[#F59E0B] border-0', icon: Clock },
  atrasado: { label: 'Atrasado', cls: 'bg-[#e1493c]/10 text-[#e1493c] border-0', icon: AlertCircle },
  cancelado: { label: 'Cancelado', cls: 'bg-muted/60 text-muted-foreground border-0', icon: AlertCircle },
}

const PLAN_CONFIG: Record<string, { label: string; color: string; price: string; features: string[] }> = {
  free: {
    label: 'Gratuito', color: '#6B7280', price: 'R$ 0/mês',
    features: ['Até 3 clientes', '1 usuário', 'Funcionalidades básicas'],
  },
  starter: {
    label: 'Starter', color: '#5B8CFF', price: 'R$ 197/mês',
    features: ['Até 10 clientes', '3 usuários', 'CRM + Pipeline + Planner', 'Aprovações'],
  },
  pro: {
    label: 'Pro', color: '#8B5CF6', price: 'R$ 397/mês',
    features: ['Clientes ilimitados', '10 usuários', 'Todos os módulos', 'CYCLO AI', 'White Label'],
  },
  agency: {
    label: 'Agency', color: '#F59E0B', price: 'R$ 797/mês',
    features: ['Multi-agência', 'Usuários ilimitados', 'API access', 'Suporte prioritário', 'Onboarding dedicado'],
  },
}

function buildMrrChart(clients: ClientRow[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const mrr = clients.filter(c => c.status === 'Ativo').reduce((s, c) => s + c.mrr, 0)
    return {
      month: m.toLocaleString('pt-BR', { month: 'short' }),
      mrr: Math.round(mrr * (0.75 + i * 0.05)),
    }
  })
}

interface Props {
  invoices: Invoice[]
  clients: ClientRow[]
  plan: string
  hasStripe: boolean
}

export function FinanceiroClient({ invoices, clients, plan, hasStripe }: Props) {
  const [tab, setTab] = useState<'visao' | 'faturas' | 'plano'>('visao')

  const mrr = clients.filter(c => c.status === 'Ativo').reduce((s, c) => s + c.mrr, 0)
  const arr = mrr * 12
  const paidInvoices = invoices.filter(i => i.status === 'pago')
  const pendingInvoices = invoices.filter(i => i.status === 'pendente')
  const totalReceived = paidInvoices.reduce((s, i) => s + i.amount, 0)
  const totalPending = pendingInvoices.reduce((s, i) => s + i.amount, 0)
  const mrrChart = buildMrrChart(clients)
  const planCfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free

  const exportInvoices = () => {
    const rows = [['Data', 'Valor', 'Status', 'Vencimento', 'Pago em']]
    invoices.forEach(i => rows.push([
      new Date(i.created_at).toLocaleDateString('pt-BR'),
      `R$ ${(i.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      i.status,
      i.due_date ? new Date(i.due_date).toLocaleDateString('pt-BR') : '-',
      i.paid_at ? new Date(i.paid_at).toLocaleDateString('pt-BR') : '-',
    ]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'faturas-cyclo.csv'
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Financeiro</h2>
          <p className="text-sm text-muted-foreground">Receita e faturamento da agência</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportInvoices} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([['visao', 'Visão Geral'], ['faturas', 'Faturas'], ['plano', 'Plano']] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === value ? 'border-[#5B8CFF] text-[#5B8CFF]' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Visão Geral */}
      {tab === 'visao' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'MRR', value: `R$ ${mrr.toLocaleString('pt-BR')}`, sub: `${clients.filter(c => c.status === 'Ativo').length} clientes ativos`, icon: DollarSign, color: '#5B8CFF' },
              { label: 'ARR', value: `R$ ${arr.toLocaleString('pt-BR')}`, sub: 'receita anual recorrente', icon: TrendingUp, color: '#12B981' },
              { label: 'Recebido', value: `R$ ${totalReceived.toLocaleString('pt-BR')}`, sub: `${paidInvoices.length} faturas`, icon: CheckCircle, color: '#12B981' },
              { label: 'A Receber', value: `R$ ${totalPending.toLocaleString('pt-BR')}`, sub: `${pendingInvoices.length} pendentes`, icon: Clock, color: '#F59E0B' },
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-border shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${s.color}15` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                        </div>
                      </div>
                      <p className="text-xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          <Card className="border-border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Evolução do MRR</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={mrrChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#12B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#12B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`R$ ${Number(v).toLocaleString('pt-BR')}`, 'MRR']}
                  />
                  <Area type="monotone" dataKey="mrr" stroke="#12B981" strokeWidth={2} fill="url(#finGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top clients by MRR */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top Clientes por MRR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {clients.slice(0, 5).map(c => {
                const pct = mrr > 0 ? (c.mrr / mrr) * 100 : 0
                return (
                  <div key={c.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate">{c.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">R$ {c.mrr.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-[#5B8CFF] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Faturas */}
      {tab === 'faturas' && (
        <div className="space-y-2">
          {invoices.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p>Nenhuma fatura registrada.</p>
              {!hasStripe && <p className="mt-2 text-xs">Conecte o Stripe para gerar faturas automaticamente.</p>}
            </div>
          ) : (
            invoices.map((inv, i) => {
              const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.pendente
              const Icon = cfg.icon
              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl"
                >
                  <div className="w-9 h-9 rounded-full bg-[#5B8CFF]/10 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-[#5B8CFF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Fatura #{inv.stripe_invoice_id ?? inv.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                      {inv.due_date && ` · Vence ${new Date(inv.due_date).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                  <p className="font-bold text-sm shrink-0">
                    R$ {(inv.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <Badge className={cn('text-[10px] shrink-0', cfg.cls)}>{cfg.label}</Badge>
                </motion.div>
              )
            })
          )}
        </div>
      )}

      {/* Tab: Plano */}
      {tab === 'plano' && (
        <div className="space-y-4">
          {/* Current plan */}
          <Card className="border-border shadow-none">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${planCfg.color}15` }}>
                  <Zap className="w-6 h-6" style={{ color: planCfg.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-base">Plano {planCfg.label}</h3>
                    <Badge className="text-[10px] border-0 font-semibold" style={{ backgroundColor: `${planCfg.color}15`, color: planCfg.color }}>
                      Atual
                    </Badge>
                  </div>
                  <p className="text-xl font-bold mb-3">{planCfg.price}</p>
                  <ul className="space-y-1">
                    {planCfg.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-3.5 h-3.5 text-[#12B981] shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(PLAN_CONFIG)
              .filter(([key]) => key !== plan)
              .map(([key, cfg]) => (
                <Card key={key} className="border-border shadow-none hover:border-[#5B8CFF]/40 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{cfg.label}</span>
                      <span className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.price}</span>
                    </div>
                    <ul className="space-y-1 mb-3">
                      {cfg.features.slice(0, 3).map(f => (
                        <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full" style={{ background: cfg.color }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => toast.info('Entre em contato para fazer upgrade')}>
                      Fazer upgrade
                    </Button>
                  </CardContent>
                </Card>
              ))
            }
          </div>

          {!hasStripe && (
            <Card className="border-[#F59E0B]/30 bg-[#F59E0B]/5 shadow-none">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Stripe não conectado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Conecte o Stripe para emitir e gerenciar faturas automaticamente.</p>
                  <Button size="sm" className="mt-2 h-7 text-xs bg-[#F59E0B] hover:bg-[#d97706] text-white" onClick={() => toast.info('Configure STRIPE_SECRET_KEY no .env')}>
                    Conectar Stripe
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
