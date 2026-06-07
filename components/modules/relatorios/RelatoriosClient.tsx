'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Funnel as FunnelChart, FunnelChart as RechartsFunnelChart, LabelList,
} from 'recharts'
import {
  TrendingUp, Users, FileText, Download, Sparkles, Target,
  DollarSign, Activity, Filter, BarChart3 as BarChartIcon,
  ArrowUpRight, ArrowDownRight, Trophy, UserPlus, Zap,
  FileSpreadsheet, Globe, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ClientRow = {
  id: string; name: string; mrr: number; status: string;
  responsible_id: string | null; created_at: string
}
type LeadRow = {
  id: string; name: string; value: number | null; stage_id: string | null;
  funnel_id: string | null; responsible_id: string | null; origin: string | null;
  won_at: string | null; lost_at: string | null; lost_reason: string | null; created_at: string
}
type StageRow = { id: string; name: string; color: string; order_index: number; funnel_id: string | null }
type GoalRow = {
  id: string; label: string; target_value: number; current_value: number;
  unit: string | null; period: string; color: string
}
type UserRow = { id: string; full_name: string | null; avatar_url: string | null }
type FunnelRow = { id: string; name: string; is_default: boolean }

interface Props {
  clients: ClientRow[]
  leads: LeadRow[]
  stages: StageRow[]
  goals: GoalRow[]
  users: UserRow[]
  funnels: FunnelRow[]
}

type Period = '7d' | '30d' | '90d' | 'all'

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Todo o período' },
]

const ORIGIN_COLORS: Record<string, string> = {
  'Google Ads':         '#4285F4',
  'Meta Ads':           '#1877F2',
  'LinkedIn Ads':       '#0A66C2',
  'Instagram Orgânico': '#E1306C',
  'TikTok Ads':         '#000000',
  'WhatsApp':           '#25D366',
  'Indicação':          '#12B981',
  'Prospecção Ativa':   '#F59E0B',
  'Evento':             '#8B5CF6',
  'E-mail Marketing':   '#5B8CFF',
  'Orgânico / SEO':     '#10B981',
  'Referral':           '#06B6D4',
  'Personalizado':      '#6B7280',
  'Sem origem':         '#9CA3AF',
}

const cutoffFor = (p: Period) => {
  if (p === 'all') return 0
  const days = p === '7d' ? 7 : p === '30d' ? 30 : 90
  return Date.now() - days * 86400000
}

const inPeriod = (date: string, cutoff: number) => cutoff === 0 || new Date(date).getTime() >= cutoff

const fmtBR = (v: number) => v.toLocaleString('pt-BR')
const money = (v: number) => `R$ ${fmtBR(Math.round(v))}`

export function RelatoriosClient({ clients, leads, stages, goals, users, funnels }: Props) {
  const [period, setPeriod] = useState<Period>('30d')
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all')
  const [funnelFilter, setFunnelFilter] = useState<string>('all')

  const cutoff = cutoffFor(period)

  // ── Apply filters ────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (responsibleFilter !== 'all' && l.responsible_id !== responsibleFilter) return false
      if (funnelFilter !== 'all' && l.funnel_id !== funnelFilter) return false
      return inPeriod(l.created_at, cutoff)
    })
  }, [leads, cutoff, responsibleFilter, funnelFilter])

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (responsibleFilter !== 'all' && c.responsible_id !== responsibleFilter) return false
      return inPeriod(c.created_at, cutoff)
    })
  }, [clients, cutoff, responsibleFilter])

  // ── KPIs ─────────────────────────────────────────────────────────
  const totalMrr = clients.filter(c => c.status === 'Ativo').reduce((s, c) => s + c.mrr, 0)
  const wonLeads = filteredLeads.filter(l => l.won_at).length
  const lostLeads = filteredLeads.filter(l => l.lost_at).length
  const closedLeads = wonLeads + lostLeads
  const conversionRate = closedLeads > 0 ? Math.round((wonLeads / closedLeads) * 100) : 0
  const wonRevenue = filteredLeads.filter(l => l.won_at).reduce((s, l) => s + (l.value ?? 0), 0)
  const newLeadsCount = filteredLeads.length
  // "Propostas" — leads que chegaram em alguma etapa de proposta ou têm valor declarado
  const proposalsCount = filteredLeads.filter(l => l.value && l.value > 0).length
  const newClientsCount = filteredClients.length

  // ── Comparações com período anterior (delta) ─────────────────────
  const previousCutoff = cutoff > 0 ? cutoff - (Date.now() - cutoff) : 0
  const previousLeads = leads.filter(l => {
    const t = new Date(l.created_at).getTime()
    return t >= previousCutoff && t < cutoff
  })
  const leadsDelta = previousLeads.length > 0
    ? Math.round(((newLeadsCount - previousLeads.length) / previousLeads.length) * 100)
    : (newLeadsCount > 0 ? 100 : 0)

  // ── Charts data ──────────────────────────────────────────────────

  // MRR evolution (últimos 6 meses)
  const mrrTrend = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - 5 + i + 1, 0)
      const label = m.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')
      const mrr = clients
        .filter(c => c.status === 'Ativo' && new Date(c.created_at) <= endOfMonth)
        .reduce((s, c) => s + c.mrr, 0)
      return { month: label, mrr }
    })
  }, [clients])

  // Origem de leads
  const leadOrigins = useMemo(() => {
    const map: Record<string, number> = {}
    filteredLeads.forEach(l => {
      const o = l.origin ?? 'Sem origem'
      map[o] = (map[o] ?? 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([origin, count]) => ({
        origin,
        count,
        fill: ORIGIN_COLORS[origin] ?? '#8B5CF6',
      }))
  }, [filteredLeads])

  // Funil de conversão (leads por etapa)
  const funnelData = useMemo(() => {
    const visibleStages = funnelFilter === 'all'
      ? stages
      : stages.filter(s => s.funnel_id === funnelFilter)
    return visibleStages.map(stage => ({
      stage: stage.name,
      count: filteredLeads.filter(l => l.stage_id === stage.id && !l.won_at && !l.lost_at).length,
      fill: stage.color,
    }))
  }, [stages, filteredLeads, funnelFilter])

  // Performance por vendedor
  const sellerPerformance = useMemo(() => {
    return users.map(u => {
      const userLeads = filteredLeads.filter(l => l.responsible_id === u.id)
      const won = userLeads.filter(l => l.won_at).length
      const revenue = userLeads.filter(l => l.won_at).reduce((s, l) => s + (l.value ?? 0), 0)
      return {
        name: u.full_name?.split(' ')[0] ?? '—',
        leads: userLeads.length,
        won,
        revenue,
      }
    }).filter(s => s.leads > 0).sort((a, b) => b.revenue - a.revenue)
  }, [users, filteredLeads])

  // Motivos de perda
  const lossReasons = useMemo(() => {
    const map: Record<string, number> = {}
    filteredLeads.filter(l => l.lost_at && l.lost_reason).forEach(l => {
      const r = l.lost_reason ?? 'Sem motivo'
      map[r] = (map[r] ?? 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [filteredLeads])

  // Total clientes pipeline (leads ativos por funil)
  const clientsPipelineByFunnel = useMemo(() => {
    return funnels.map(f => ({
      funnel: f.name,
      count: filteredLeads.filter(l => l.funnel_id === f.id && !l.won_at && !l.lost_at).length,
      fill: f.is_default ? '#5B8CFF' : '#8B5CF6',
    })).filter(d => d.count > 0)
  }, [funnels, filteredLeads])

  // ── Export ───────────────────────────────────────────────────────
  const reportDate = new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' })
  const dateSlug = new Date().toISOString().slice(0, 10)
  const periodLabel = PERIODS.find(p => p.value === period)?.label ?? 'Período'

  // KPI rows used in all exports
  const kpiRows: Array<[string, string]> = [
    ['MRR Total Ativo', money(totalMrr)],
    ['Conversão de Leads', `${conversionRate}%`],
    ['Receita Fechada', money(wonRevenue)],
    ['Novos Leads', String(newLeadsCount)],
    ['Nº de Propostas', String(proposalsCount)],
    ['Clientes Novos', String(newClientsCount)],
    ['Negócios Ganhos', String(wonLeads)],
    ['Negócios Perdidos', String(lostLeads)],
    ['Ticket Médio', wonLeads > 0 ? money(wonRevenue / wonLeads) : '—'],
  ]

  // ── EXCEL ─── HTML table with .xls extension (Excel opens natively) ──
  const exportExcel = () => {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"><xml><x:ExcelWorkbook><x:ExcelWorksheets>
<x:ExcelWorksheet><x:Name>Relatório CYCLO</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
</x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body>
<table border="1" cellspacing="0" cellpadding="6">
  <tr><th colspan="2" style="background:#5B8CFF;color:#fff;font-size:16px">Relatório CYCLO — ${reportDate}</th></tr>
  <tr><td colspan="2" style="background:#f0f4ff">Período: ${periodLabel}</td></tr>
  <tr><th colspan="2" style="background:#5B8CFF;color:#fff">Indicadores principais</th></tr>
  ${kpiRows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`).join('')}

  <tr><th colspan="2" style="background:#5B8CFF;color:#fff">Origem dos Leads</th></tr>
  <tr><th>Origem</th><th>Quantidade</th></tr>
  ${leadOrigins.map(o => `<tr><td>${o.origin}</td><td>${o.count}</td></tr>`).join('')}

  <tr><th colspan="2" style="background:#5B8CFF;color:#fff">Funil de Conversão</th></tr>
  <tr><th>Etapa</th><th>Leads ativos</th></tr>
  ${funnelData.map(f => `<tr><td>${f.stage}</td><td>${f.count}</td></tr>`).join('')}

  <tr><th colspan="2" style="background:#5B8CFF;color:#fff">Top Vendedores</th></tr>
  <tr><th>Vendedor (Leads / Ganhos)</th><th>Receita ganha</th></tr>
  ${sellerPerformance.map(s => `<tr><td>${s.name} (${s.leads} / ${s.won})</td><td>${money(s.revenue)}</td></tr>`).join('')}

  <tr><th colspan="2" style="background:#5B8CFF;color:#fff">Metas em andamento</th></tr>
  <tr><th>Meta</th><th>Progresso</th></tr>
  ${goals.map(g => `<tr><td>${g.label}</td><td>${Math.round((g.current_value / g.target_value) * 100)}% (${g.current_value} / ${g.target_value} ${g.unit ?? ''})</td></tr>`).join('')}

  <tr><th colspan="2" style="background:#5B8CFF;color:#fff">Motivos de Perda</th></tr>
  <tr><th>Motivo</th><th>Ocorrências</th></tr>
  ${lossReasons.map(([r, c]) => `<tr><td>${r}</td><td>${c}</td></tr>`).join('')}
</table>
</body></html>`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel' }))
    a.download = `relatorio-cyclo-${dateSlug}.xls`
    a.click()
  }

  // ── PDF ─── open print-friendly window, auto-trigger print → user saves as PDF ──
  const exportPDF = () => {
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório CYCLO — ${reportDate}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;color:#111827;padding:48px;max-width:1100px;margin:0 auto;line-height:1.5}
  header{border-bottom:3px solid #5B8CFF;padding-bottom:16px;margin-bottom:32px}
  h1{color:#0f172a;font-size:28px;margin-bottom:8px;letter-spacing:-0.5px}
  .meta{color:#64748b;font-size:13px}
  h2{color:#5B8CFF;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:32px 0 12px}
  .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px}
  .kpi{background:linear-gradient(135deg,#f8f9ff,#fff);border:1px solid #e8eeff;border-radius:12px;padding:16px}
  .kpi-label{font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
  .kpi-value{font-size:24px;font-weight:800;color:#5B8CFF;margin-top:6px;letter-spacing:-0.5px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
  th{background:#f1f5f9;color:#334155;padding:10px 12px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
  td{padding:10px 12px;border-bottom:1px solid #e2e8f0}
  tr:last-child td{border-bottom:none}
  .bar{display:inline-block;height:8px;background:#5B8CFF;border-radius:4px;vertical-align:middle;margin-right:8px}
  .pct{display:inline-block;width:50px;font-weight:700;color:#5B8CFF}
  footer{margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;text-align:center}
  @media print{body{padding:24px}h2{page-break-after:avoid}table{page-break-inside:avoid}}
</style></head><body>
<header>
  <h1>Relatório CYCLO</h1>
  <p class="meta">${reportDate} · Período: ${periodLabel}</p>
</header>

<h2>📊 Indicadores principais</h2>
<div class="kpi-grid">
  ${kpiRows.map(([k, v]) => `<div class="kpi"><div class="kpi-label">${k}</div><div class="kpi-value">${v}</div></div>`).join('')}
</div>

<h2>🎯 Funil de Conversão</h2>
<table><tr><th>Etapa</th><th>Leads ativos</th><th>Distribuição</th></tr>
${funnelData.map(f => {
  const max = Math.max(...funnelData.map(d => d.count), 1)
  const w = Math.round((f.count / max) * 100)
  return `<tr><td><b>${f.stage}</b></td><td>${f.count}</td><td><span class="bar" style="width:${w}%;background:${f.fill}"></span></td></tr>`
}).join('')}</table>

<h2>📍 Origem dos Leads</h2>
<table><tr><th>Origem</th><th>Quantidade</th><th>%</th></tr>
${leadOrigins.map(o => {
  const total = leadOrigins.reduce((s, x) => s + x.count, 0)
  const pct = total ? Math.round((o.count / total) * 100) : 0
  return `<tr><td><b>${o.origin}</b></td><td>${o.count}</td><td>${pct}%</td></tr>`
}).join('')}</table>

<h2>🏆 Top Vendedores (por receita)</h2>
<table><tr><th>Posição</th><th>Vendedor</th><th>Leads / Ganhos</th><th>Receita</th></tr>
${sellerPerformance.map((s, i) => `<tr><td>${i + 1}º</td><td><b>${s.name}</b></td><td>${s.leads} / ${s.won}</td><td><b style="color:#12B981">${money(s.revenue)}</b></td></tr>`).join('')}</table>

${goals.length > 0 ? `<h2>🎯 Metas em andamento</h2>
<table><tr><th>Meta</th><th>Atual</th><th>Alvo</th><th>Progresso</th></tr>
${goals.map(g => {
  const pct = Math.min(Math.round((g.current_value / g.target_value) * 100), 100)
  return `<tr><td><b>${g.label}</b></td><td>${g.current_value} ${g.unit ?? ''}</td><td>${g.target_value} ${g.unit ?? ''}</td><td><span class="pct">${pct}%</span><span class="bar" style="width:${pct}%;background:${g.color}"></span></td></tr>`
}).join('')}</table>` : ''}

${lossReasons.length > 0 ? `<h2>⚠️ Motivos de Perda</h2>
<table><tr><th>Motivo</th><th>Ocorrências</th></tr>
${lossReasons.map(([r, c]) => `<tr><td>${r}</td><td><b style="color:#e1493c">${c}</b></td></tr>`).join('')}</table>` : ''}

<footer>Gerado pelo CYCLO em ${new Date().toLocaleString('pt-BR')}</footer>
<script>window.onload = function() { setTimeout(function() { window.print(); }, 400); }<\/script>
</body></html>`)
    w.document.close()
  }

  // ── HTML INTERATIVO ─── standalone HTML with Chart.js from CDN ──
  const exportHTML = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório CYCLO Interativo — ${reportDate}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
<style>
  *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif}
  body{background:#f8fafc;color:#0f172a;padding:32px;line-height:1.5}
  .container{max-width:1280px;margin:0 auto}
  header{background:linear-gradient(135deg,#5B8CFF15,#8B5CF615);border:1px solid #e2e8f0;border-radius:24px;padding:32px;margin-bottom:24px;position:relative;overflow:hidden}
  header::before{content:'';position:absolute;top:-100px;right:-100px;width:300px;height:300px;background:radial-gradient(circle,#5B8CFF30,transparent);border-radius:50%}
  .label{font-size:11px;color:#5B8CFF;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px}
  h1{font-size:36px;font-weight:900;letter-spacing:-1px}
  .meta{color:#64748b;font-size:14px;margin-top:8px}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px}
  .kpi{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;transition:all 0.2s}
  .kpi:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.06)}
  .kpi-label{font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
  .kpi-value{font-size:24px;font-weight:900;margin-top:6px;letter-spacing:-0.5px}
  .grid{display:grid;gap:16px;margin-bottom:16px}
  .grid-2{grid-template-columns:2fr 1fr}
  .grid-3{grid-template-columns:repeat(3,1fr)}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px}
  .card h3{font-size:14px;font-weight:700;margin-bottom:4px}
  .card .sub{font-size:11px;color:#94a3b8;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
  th{background:#f1f5f9;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:700}
  td{padding:8px 10px;border-bottom:1px solid #f1f5f9}
  canvas{max-height:300px}
  footer{text-align:center;color:#94a3b8;font-size:12px;margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0}
  @media (max-width:768px){.grid-2,.grid-3{grid-template-columns:1fr}}
</style></head><body>
<div class="container">
  <header>
    <div class="label">📊 BUSINESS INTELLIGENCE</div>
    <h1>Relatório CYCLO</h1>
    <p class="meta">${reportDate} · Período: ${periodLabel}</p>
  </header>

  <div class="kpis">
    ${kpiRows.map(([k, v]) => `<div class="kpi"><div class="kpi-label">${k}</div><div class="kpi-value" style="color:#5B8CFF">${v}</div></div>`).join('')}
  </div>

  <div class="grid grid-2">
    <div class="card">
      <h3>📈 Evolução do MRR</h3>
      <p class="sub">Receita recorrente mensal — últimos 6 meses</p>
      <canvas id="mrrChart"></canvas>
    </div>
    <div class="card">
      <h3>📍 Origem dos Leads</h3>
      <p class="sub">De onde seus leads vêm</p>
      <canvas id="originChart"></canvas>
    </div>
  </div>

  <div class="grid grid-3">
    <div class="card">
      <h3>🎯 Funil de Conversão</h3>
      <p class="sub">Leads ativos por etapa</p>
      <canvas id="funnelChart"></canvas>
    </div>
    <div class="card">
      <h3>🏆 Top Vendedores</h3>
      <p class="sub">Por receita fechada</p>
      <table><tr><th>Vendedor</th><th>Ganhos</th><th>Receita</th></tr>
      ${sellerPerformance.map(s => `<tr><td><b>${s.name}</b></td><td>${s.won}/${s.leads}</td><td style="color:#12B981;font-weight:700">${money(s.revenue)}</td></tr>`).join('')}</table>
    </div>
    <div class="card">
      <h3>⚠️ Motivos de Perda</h3>
      <p class="sub">Por que leads não fecharam</p>
      <table><tr><th>Motivo</th><th>Qtd</th></tr>
      ${lossReasons.map(([r, c]) => `<tr><td>${r}</td><td style="color:#e1493c;font-weight:700">${c}</td></tr>`).join('') || '<tr><td colspan="2" style="text-align:center;color:#94a3b8">Sem perdas registradas</td></tr>'}</table>
    </div>
  </div>

  ${goals.length > 0 ? `<div class="card" style="margin-top:16px">
    <h3>🎯 Metas em andamento</h3>
    <p class="sub">${goals.length} metas cadastradas</p>
    ${goals.map(g => {
      const pct = Math.min(Math.round((g.current_value / g.target_value) * 100), 100)
      return `<div style="margin:12px 0">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <b>${g.label}</b><span style="color:${g.color};font-weight:700">${pct}%</span>
        </div>
        <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden">
          <div style="height:100%;background:${g.color};width:${pct}%;border-radius:4px;transition:width 0.6s"></div>
        </div>
      </div>`
    }).join('')}
  </div>` : ''}

  <footer>Gerado pelo CYCLO em ${new Date().toLocaleString('pt-BR')} · Compartilhe este HTML — funciona offline</footer>
</div>

<script>
const data = {
  mrr: ${JSON.stringify(mrrTrend)},
  origin: ${JSON.stringify(leadOrigins)},
  funnel: ${JSON.stringify(funnelData)}
};
window.addEventListener('load', () => {
  new Chart(document.getElementById('mrrChart'), {
    type: 'line',
    data: {
      labels: data.mrr.map(d => d.month),
      datasets: [{
        label: 'MRR',
        data: data.mrr.map(d => d.mrr),
        borderColor: '#5B8CFF', backgroundColor: 'rgba(91,140,255,0.15)',
        borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4
      }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
  new Chart(document.getElementById('originChart'), {
    type: 'doughnut',
    data: { labels: data.origin.map(o => o.origin),
      datasets: [{ data: data.origin.map(o => o.count), backgroundColor: data.origin.map(o => o.fill) }] },
    options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }
  });
  new Chart(document.getElementById('funnelChart'), {
    type: 'bar', data: { labels: data.funnel.map(f => f.stage),
      datasets: [{ label: 'Leads', data: data.funnel.map(f => f.count), backgroundColor: data.funnel.map(f => f.fill) }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false } } }
  });
});
<\/script>
</body></html>`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    a.download = `relatorio-cyclo-${dateSlug}.html`
    a.click()
  }

  const KPI_CARDS = [
    {
      label: 'MRR Total',
      value: money(totalMrr),
      sub: `${clients.filter(c => c.status === 'Ativo').length} clientes ativos`,
      icon: DollarSign,
      color: '#5B8CFF',
      bgGradient: 'from-[#5B8CFF]/10 to-transparent',
    },
    {
      label: 'Conversão de Leads',
      value: `${conversionRate}%`,
      sub: `${wonLeads} ganhos · ${lostLeads} perdidos`,
      icon: Target,
      color: '#12B981',
      bgGradient: 'from-[#12B981]/10 to-transparent',
    },
    {
      label: 'Receita Fechada',
      value: money(wonRevenue),
      sub: 'no período selecionado',
      icon: Trophy,
      color: '#F59E0B',
      bgGradient: 'from-[#F59E0B]/10 to-transparent',
    },
    {
      label: 'Novos Leads',
      value: fmtBR(newLeadsCount),
      sub: leadsDelta > 0 ? `+${leadsDelta}% vs período anterior` : `${leadsDelta}% vs período anterior`,
      icon: UserPlus,
      color: '#0EA5E9',
      bgGradient: 'from-[#0EA5E9]/10 to-transparent',
      deltaPositive: leadsDelta > 0,
    },
    {
      label: 'Nº de Propostas',
      value: fmtBR(proposalsCount),
      sub: 'propostas enviadas',
      icon: FileText,
      color: '#8B5CF6',
      bgGradient: 'from-[#8B5CF6]/10 to-transparent',
    },
    {
      label: 'Clientes no Período',
      value: fmtBR(newClientsCount),
      sub: 'novos clientes na carteira',
      icon: Users,
      color: '#EC4899',
      bgGradient: 'from-[#EC4899]/10 to-transparent',
    },
  ]

  return (
    <div className="space-y-5">
      {/* ── Hero com filtros ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#5B8CFF]/8 via-[#8B5CF6]/5 to-transparent p-6">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-[#5B8CFF]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-[#8B5CF6]/8 blur-3xl pointer-events-none" />

        <div className="relative flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChartIcon className="w-4 h-4 text-[#5B8CFF]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#5B8CFF]">Business Intelligence</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight">Relatórios</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Indicadores em tempo real do seu negócio — pipeline, conversão, receita e performance da equipe.
            </p>
          </div>
          <ExportMenu onExcel={exportExcel} onPdf={exportPDF} onHtml={exportHTML} />
        </div>

        {/* Filter bar */}
        <div className="relative flex flex-wrap gap-2 mt-5 pt-5 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mr-1">
            <Filter className="w-3.5 h-3.5" /> FILTROS:
          </div>
          <Select value={period} onValueChange={v => setPeriod(v as Period)}>
            <SelectTrigger className="w-[180px] h-9 text-sm bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={responsibleFilter} onValueChange={v => setResponsibleFilter(v ?? 'all')}>
            <SelectTrigger className="w-[180px] h-9 text-sm bg-card"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.id}</SelectItem>)}
            </SelectContent>
          </Select>
          {funnels.length > 1 && (
            <Select value={funnelFilter} onValueChange={v => setFunnelFilter(v ?? 'all')}>
              <SelectTrigger className="w-[160px] h-9 text-sm bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os funis</SelectItem>
                {funnels.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── 6 KPI cards premium ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_CARDS.map((k, i) => {
          const Icon = k.icon
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={cn('border-border shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br', k.bgGradient)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${k.color}20` }}>
                      <Icon className="w-4 h-4" style={{ color: k.color }} />
                    </div>
                    {'deltaPositive' in k && (
                      <span className={cn('text-[10px] font-bold flex items-center gap-0.5', k.deltaPositive ? 'text-[#12B981]' : 'text-[#e1493c]')}>
                        {k.deltaPositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">{k.label}</p>
                  <p className="text-xl font-black tabular-nums mt-1 leading-tight" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{k.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* ── Grid 2 colunas: Evolução MRR + Funil ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* MRR Evolution */}
        <Card className="border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#5B8CFF]" /> Evolução do MRR
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">Receita recorrente mensal nos últimos 6 meses</p>
            </div>
            <Badge className="text-[10px] bg-[#5B8CFF]/10 text-[#5B8CFF] border-0 font-bold">{money(totalMrr)} hoje</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={mrrTrend}>
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B8CFF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5B8CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={v => money(v as number)} />
                <Area type="monotone" dataKey="mrr" stroke="#5B8CFF" strokeWidth={2.5} fill="url(#mrrGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Origem de Leads */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F59E0B]" /> Origem dos Leads
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">De onde seus leads estão vindo</p>
          </CardHeader>
          <CardContent>
            {leadOrigins.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs">
                <Sparkles className="w-7 h-7 mx-auto mb-2 opacity-30" />
                Nenhum lead com origem no período.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={leadOrigins} dataKey="count" nameKey="origin" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {leadOrigins.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2 max-h-[80px] overflow-y-auto">
                  {leadOrigins.slice(0, 5).map(o => (
                    <div key={o.origin} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.fill }} />
                        <span className="truncate">{o.origin}</span>
                      </div>
                      <span className="font-bold tabular-nums shrink-0">{o.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Grid 3 colunas: Funil + Performance + Total Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Funil de conversão */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#8B5CF6]" /> Funil de Conversão
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Leads ativos por etapa</p>
          </CardHeader>
          <CardContent>
            {funnelData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Sem dados de pipeline.</p>
            ) : (
              <div className="space-y-2 pt-1">
                {funnelData.map(s => {
                  const max = Math.max(...funnelData.map(d => d.count), 1)
                  const widthPct = (s.count / max) * 100
                  return (
                    <div key={s.stage} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate">{s.stage}</span>
                        <span className="font-bold tabular-nums" style={{ color: s.fill }}>{s.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: s.fill }}
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPct}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total clientes pipeline */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0EA5E9]" /> Total no Pipeline
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Oportunidades por funil ({filteredLeads.filter(l => !l.won_at && !l.lost_at).length} total)</p>
          </CardHeader>
          <CardContent>
            {clientsPipelineByFunnel.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Sem oportunidades.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={clientsPipelineByFunnel}
                    dataKey="count"
                    nameKey="funnel"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    label={(p) => String((p as { count?: number }).count ?? '')}
                    labelLine={false}
                  >
                    {clientsPipelineByFunnel.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Performance vendedores */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#F59E0B]" /> Top Vendedores
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Por receita fechada no período</p>
          </CardHeader>
          <CardContent>
            {sellerPerformance.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Sem performance no período.</p>
            ) : (
              <div className="space-y-2.5">
                {sellerPerformance.slice(0, 5).map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2.5">
                    <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0',
                      i === 0 ? 'bg-[#F59E0B]' : i === 1 ? 'bg-[#9CA3AF]' : i === 2 ? 'bg-[#92400E]' : 'bg-muted text-muted-foreground'
                    )}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.won}/{s.leads} ganhos</p>
                    </div>
                    <p className="text-xs font-bold tabular-nums shrink-0" style={{ color: '#12B981' }}>{money(s.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Grid: Metas + Propostas + Perdas ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Metas em andamento */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-[#5B8CFF]" /> Metas em andamento
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">{goals.length} metas cadastradas</p>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <div className="text-center py-6">
                <Target className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Nenhuma meta cadastrada.</p>
                <a href="/metas" className="text-[11px] text-[#5B8CFF] hover:underline">+ Criar primeira meta</a>
              </div>
            ) : (
              <div className="space-y-2.5">
                {goals.slice(0, 4).map(g => {
                  const pct = Math.min((g.current_value / g.target_value) * 100, 100)
                  return (
                    <div key={g.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate">{g.label}</span>
                        <span className="font-bold tabular-nums" style={{ color: g.color }}>{Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: g.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {g.unit === 'R$' ? money(g.current_value) : `${fmtBR(g.current_value)} ${g.unit ?? ''}`}
                        {' / '}
                        {g.unit === 'R$' ? money(g.target_value) : `${fmtBR(g.target_value)} ${g.unit ?? ''}`}
                      </p>
                    </div>
                  )
                })}
                {goals.length > 4 && (
                  <a href="/metas" className="block text-[11px] text-[#5B8CFF] hover:underline pt-1">
                    Ver todas as {goals.length} metas →
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receita por mês */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#12B981]" /> Receita Ganha
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Valor fechado no período</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight" style={{ color: '#12B981' }}>{money(wonRevenue)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">de {wonLeads} negociações ganhas</p>
            {wonLeads > 0 && (
              <p className="text-[11px] mt-3 p-2 bg-[#12B981]/8 text-[#12B981] rounded-lg font-medium">
                Ticket médio: {money(wonRevenue / wonLeads)}
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted/40">
                <p className="text-lg font-black tabular-nums text-[#12B981]">{wonLeads}</p>
                <p className="text-[10px] text-muted-foreground">Ganhos</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/40">
                <p className="text-lg font-black tabular-nums text-[#e1493c]">{lostLeads}</p>
                <p className="text-[10px] text-muted-foreground">Perdidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Motivos de perda */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#e1493c]" /> Motivos de Perda
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Por que os leads não fecharam</p>
          </CardHeader>
          <CardContent>
            {lossReasons.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum lead perdido com motivo registrado.</p>
            ) : (
              <div className="space-y-2">
                {lossReasons.map(([reason, count]) => {
                  const max = Math.max(...lossReasons.map(r => r[1]), 1)
                  const widthPct = (count / max) * 100
                  return (
                    <div key={reason} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate">{reason}</span>
                        <span className="font-bold tabular-nums text-[#e1493c]">{count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-[#e1493c]"
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPct}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── ExportMenu — dropdown with Excel / PDF / HTML ─────────────────
function ExportMenu({ onExcel, onPdf, onHtml }: { onExcel: () => void; onPdf: () => void; onHtml: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const items = [
    {
      icon: FileSpreadsheet,
      title: 'Excel (.xls)',
      desc: 'Planilha completa pra abrir no Excel ou Google Sheets',
      color: '#12B981',
      onClick: onExcel,
    },
    {
      icon: FileText,
      title: 'PDF',
      desc: 'Documento pronto pra imprimir ou compartilhar',
      color: '#e1493c',
      onClick: onPdf,
    },
    {
      icon: Globe,
      title: 'HTML Interativo',
      desc: 'Arquivo web com gráficos navegáveis (funciona offline)',
      color: '#5B8CFF',
      onClick: onHtml,
    },
  ]

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(o => !o)}
        className="gap-1.5 text-xs"
      >
        <Download className="w-3.5 h-3.5" /> Exportar
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/30">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Escolha o formato</p>
          </div>
          <div className="py-1">
            {items.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.title}
                  onClick={() => { item.onClick(); setOpen(false) }}
                  className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ background: `${item.color}15` }}>
                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{item.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
