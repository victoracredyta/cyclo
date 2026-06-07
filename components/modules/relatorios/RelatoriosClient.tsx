'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, Users, CheckSquare, FileText, Download,
  Zap, DollarSign, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ClientRow = { id: string; name: string; mrr: number; status: string; created_at: string }
type LeadRow = { id: string; value: number | null; stage_id: string | null; won_at: string | null; lost_at: string | null; created_at: string }
type ContentRow = { id: string; status: string; channel: string | null; created_at: string }
type ApprovalRow = { id: string; status: string; created_at: string }
type AutomationRow = { id: string; runs_count: number; errors_count: number; status: string }

interface Props {
  clients: ClientRow[]
  leads: LeadRow[]
  contentItems: ContentRow[]
  approvals: ApprovalRow[]
  automations: AutomationRow[]
}

type Period = '7d' | '30d' | '90d' | 'all'

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'all', label: 'Tudo' },
]

const STATUS_COLORS: Record<string, string> = {
  'Ativo': '#12B981',
  'Em risco': '#e1493c',
  'Em negociação': '#F59E0B',
  'Inativo': '#6B7280',
}

const CHANNEL_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
  tiktok: '#010101',
  youtube: '#FF0000',
  email: '#5B8CFF',
  outro: '#8B5CF6',
}

function filterByPeriod<T extends { created_at: string }>(items: T[], period: Period): T[] {
  if (period === 'all') return items
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const cutoff = Date.now() - days * 86400000
  return items.filter(i => new Date(i.created_at).getTime() >= cutoff)
}

function buildMrrTrend(clients: ClientRow[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const label = m.toLocaleString('pt-BR', { month: 'short' })
    const mrr = clients
      .filter(c => c.status === 'Ativo' && new Date(c.created_at) <= m)
      .reduce((s, c) => s + c.mrr, 0)
    return { month: label, mrr }
  })
}

function buildContentByChannel(items: ContentRow[]) {
  const map: Record<string, number> = {}
  items.forEach(i => {
    const ch = i.channel ?? 'outro'
    map[ch] = (map[ch] ?? 0) + 1
  })
  return Object.entries(map).map(([channel, count]) => ({
    channel: channel.charAt(0).toUpperCase() + channel.slice(1),
    count,
    fill: CHANNEL_COLORS[channel] ?? '#8B5CF6',
  }))
}

export function RelatoriosClient({ clients, leads, contentItems, approvals, automations }: Props) {
  const [period, setPeriod] = useState<Period>('30d')

  const filteredLeads = filterByPeriod(leads, period)
  const filteredContent = filterByPeriod(contentItems, period)
  const filteredApprovals = filterByPeriod(approvals, period)

  const mrr = clients.filter(c => c.status === 'Ativo').reduce((s, c) => s + c.mrr, 0)
  const activeClients = clients.filter(c => c.status === 'Ativo').length
  const riskClients = clients.filter(c => c.status === 'Em risco').length
  const wonLeads = filteredLeads.filter(l => l.won_at).length
  const conversionRate = filteredLeads.length > 0 ? Math.round((wonLeads / filteredLeads.length) * 100) : 0
  const wonRevenue = filteredLeads.filter(l => l.won_at).reduce((s, l) => s + (l.value ?? 0), 0)
  const approvedContent = filteredApprovals.filter(a => a.status === 'aprovado').length
  const totalRuns = automations.reduce((s, a) => s + a.runs_count, 0)

  const mrrTrend = useMemo(() => buildMrrTrend(clients), [clients])
  const contentByChannel = useMemo(() => buildContentByChannel(filteredContent), [filteredContent])

  const clientsByStatus = useMemo(() => {
    const map: Record<string, number> = {}
    clients.forEach(c => { map[c.status] = (map[c.status] ?? 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] ?? '#6B7280' }))
  }, [clients])

const exportPDF = () => {
    const w = window.open('', '_blank')!
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório CYCLO — ${new Date().toLocaleDateString('pt-BR')}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:900px;margin:0 auto}h1{color:#5B8CFF;border-bottom:2px solid #5B8CFF;padding-bottom:8px}h2{color:#333;margin-top:32px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#5B8CFF;color:white;padding:8px 12px;text-align:left;font-size:12px}td{padding:8px 12px;border-bottom:1px solid #eee;font-size:13px}.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:16px 0}.kpi{background:#f8f9ff;border:1px solid #e8eeff;border-radius:8px;padding:16px}.kpi-value{font-size:24px;font-weight:bold;color:#5B8CFF}.kpi-label{font-size:11px;color:#666;margin-top:4px}@media print{body{padding:20px}}</style></head><body>
    <h1>Relatório CYCLO — ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' })}</h1>
    <p style="color:#666;font-size:13px">Período: ${period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : period === '90d' ? '90 dias' : 'Todo o período'}</p>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-value">R$ ${mrr.toLocaleString('pt-BR')}</div><div class="kpi-label">MRR Total</div></div>
      <div class="kpi"><div class="kpi-value">${activeClients}</div><div class="kpi-label">Clientes Ativos</div></div>
      <div class="kpi"><div class="kpi-value">${conversionRate}%</div><div class="kpi-label">Conversão de Leads</div></div>
      <div class="kpi"><div class="kpi-value">R$ ${wonRevenue.toLocaleString('pt-BR')}</div><div class="kpi-label">Receita Fechada</div></div>
    </div>
    <h2>Clientes</h2>
    <table><tr><th>Nome</th><th>Status</th><th>MRR</th></tr>
    ${clients.map(c => `<tr><td>${c.name}</td><td>${c.status}</td><td>R$ ${c.mrr.toLocaleString('pt-BR')}</td></tr>`).join('')}
    </table>
    <h2>Pipeline</h2>
    <table><tr><th>Lead</th><th>Valor</th><th>Status</th></tr>
    ${leads.map(l => `<tr><td>${l.id}</td><td>R$ ${(l.value ?? 0).toLocaleString('pt-BR')}</td><td>${l.won_at ? 'Ganho' : l.lost_at ? 'Perdido' : 'Em andamento'}</td></tr>`).join('')}
    </table>
    <p style="margin-top:40px;font-size:11px;color:#999;text-align:center">Gerado pelo CYCLO — ${new Date().toLocaleString('pt-BR')}</p>
    </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  const exportHTML = () => {
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório CYCLO</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f6fb;color:#111;padding:32px}h1{font-size:28px;font-weight:700;color:#5B8CFF;margin-bottom:4px}p.sub{color:#666;font-size:14px;margin-bottom:24px}.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:32px}.kpi{background:white;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.06)}.kpi-value{font-size:28px;font-weight:700;color:#5B8CFF}.kpi-label{font-size:12px;color:#666;margin-top:6px}.section{background:white;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.06);margin-bottom:24px}h2{font-size:16px;font-weight:600;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #eee}table{width:100%;border-collapse:collapse}th{background:#f4f6fb;padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.04em}td{padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px}.badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}.green{background:#d1fae5;color:#065f46}.red{background:#fee2e2;color:#991b1b}.yellow{background:#fef3c7;color:#92400e}.gray{background:#f3f4f6;color:#374151}footer{text-align:center;font-size:11px;color:#999;margin-top:32px}</style></head><body>
    <h1>Relatório de Performance</h1>
    <p class="sub">Agência · ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' })} · Período: ${period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : period === '90d' ? '90 dias' : 'Completo'}</p>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-value">R$ ${mrr.toLocaleString('pt-BR')}</div><div class="kpi-label">MRR Total</div></div>
      <div class="kpi"><div class="kpi-value">${activeClients}</div><div class="kpi-label">Clientes Ativos</div></div>
      <div class="kpi"><div class="kpi-value">${conversionRate}%</div><div class="kpi-label">Taxa de Conversão</div></div>
      <div class="kpi"><div class="kpi-value">R$ ${wonRevenue.toLocaleString('pt-BR')}</div><div class="kpi-label">Receita Fechada</div></div>
      <div class="kpi"><div class="kpi-value">${riskClients}</div><div class="kpi-label">Clientes em Risco</div></div>
      <div class="kpi"><div class="kpi-value">${totalRuns}</div><div class="kpi-label">Execuções Automação</div></div>
    </div>
    <div class="section"><h2>Clientes</h2>
    <table><tr><th>Nome</th><th>Status</th><th>MRR</th></tr>
    ${clients.map(c => {
      const badgeClass = c.status === 'Ativo' ? 'green' : c.status === 'Em risco' ? 'red' : 'gray'
      return `<tr><td>${c.name}</td><td><span class="badge ${badgeClass}">${c.status}</span></td><td>R$ ${c.mrr.toLocaleString('pt-BR')}</td></tr>`
    }).join('')}</table></div>
    <footer>Gerado pelo CYCLO · ${new Date().toLocaleString('pt-BR')}</footer></body></html>`

    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.download = `relatorio-cyclo-${new Date().toISOString().slice(0, 10)}.html`
    a.click()
  }

  const exportCSV = () => {
    const rows = [
      ['Métrica', 'Valor'],
      ['MRR Total', `R$ ${mrr.toLocaleString('pt-BR')}`],
      ['Clientes Ativos', String(activeClients)],
      ['Clientes em Risco', String(riskClients)],
      ['Leads (período)', String(filteredLeads.length)],
      ['Taxa de Conversão', `${conversionRate}%`],
      ['Receita Fechada', `R$ ${wonRevenue.toLocaleString('pt-BR')}`],
      ['Aprovações', String(filteredApprovals.length)],
      ['Conteúdos', String(filteredContent.length)],
      ['Execuções de Automação', String(totalRuns)],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `relatorio-cyclo-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const kpis = [
    { label: 'MRR Total', value: `R$ ${mrr.toLocaleString('pt-BR')}`, sub: `${activeClients} clientes ativos`, icon: DollarSign, color: '#5B8CFF' },
    { label: 'Conversão de Leads', value: `${conversionRate}%`, sub: `${wonLeads} de ${filteredLeads.length} leads`, icon: TrendingUp, color: '#12B981' },
    { label: 'Receita Fechada', value: `R$ ${wonRevenue.toLocaleString('pt-BR')}`, sub: 'no período', icon: Activity, color: '#8B5CF6' },
    { label: 'Aprovações', value: String(filteredApprovals.length), sub: `${approvedContent} aprovadas`, icon: CheckSquare, color: '#F59E0B' },
    { label: 'Conteúdos', value: String(filteredContent.length), sub: 'criados no período', icon: FileText, color: '#e1493c' },
    { label: 'Automações', value: String(totalRuns), sub: 'execuções totais', icon: Zap, color: '#F59E0B' },
    { label: 'Clientes em Risco', value: String(riskClients), sub: 'precisam de atenção', icon: Users, color: riskClients > 0 ? '#e1493c' : '#12B981' },
    { label: 'Clientes Totais', value: String(clients.length), sub: 'na carteira', icon: Users, color: '#5B8CFF' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Relatórios</h2>
          <p className="text-sm text-muted-foreground">Visão geral do desempenho da agência</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1 gap-1">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-semibold transition-all',
                  period === p.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportHTML} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> HTML
          </Button>
          <Button size="sm" variant="outline" onClick={exportPDF} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.slice(0, 4).map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${kpi.color}15` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.slice(4).map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 4) * 0.05 }}>
              <Card className="border-border shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${kpi.color}15` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MRR Trend */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Evolução do MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={mrrTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B8CFF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#5B8CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`R$ ${Number(v).toLocaleString('pt-BR')}`, 'MRR']}
                />
                <Area type="monotone" dataKey="mrr" stroke="#5B8CFF" strokeWidth={2} fill="url(#mrrGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Content by Channel */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Conteúdo por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            {contentByChannel.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">Nenhum conteúdo no período</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={contentByChannel} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="channel" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {contentByChannel.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Clients by Status */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Clientes por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {clientsByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">Sem dados</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={clientsByStatus} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>
                      {clientsByStatus.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-1">
                  {clientsByStatus.map(s => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.fill }} />
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="font-semibold">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Approval stats */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Status das Aprovações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {[
              { label: 'Aprovadas', color: '#12B981', count: filteredApprovals.filter(a => a.status === 'aprovado').length },
              { label: 'Aguardando', color: '#F59E0B', count: filteredApprovals.filter(a => a.status === 'aguardando').length },
              { label: 'Ajuste', color: '#e1493c', count: filteredApprovals.filter(a => a.status === 'ajuste').length },
              { label: 'Reprovadas', color: '#6B7280', count: filteredApprovals.filter(a => a.status === 'reprovado').length },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs w-24">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                  <span className="text-muted-foreground">{row.label}</span>
                </div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: filteredApprovals.length > 0 ? `${(row.count / filteredApprovals.length) * 100}%` : '0%',
                      background: row.color,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold w-4 text-right">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
