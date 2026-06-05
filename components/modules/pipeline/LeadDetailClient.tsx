'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Check, X, Edit2, Save, Clock, Mail, Phone, Building2,
  MapPin, DollarSign, Flame, Target, ChevronDown, Plus, Loader2,
  MessageSquare, CheckSquare, FileText, Calendar, ExternalLink,
  Activity, ArrowRight, User, Search, Trash2, Square, AlertTriangle,
} from 'lucide-react'
import type { Lead, PipelineStage, Activity as ActivityType, LeadTask } from '@/types/database'

type Responsible = { id: string; full_name: string | null; avatar_url: string | null }
type LeadFull = Lead & { responsible: Responsible | null }
type ActivityWithUser = ActivityType & { user: Responsible | null }
type TaskWithUser = LeadTask & { user: Responsible | null }

interface Props {
  lead: LeadFull
  stages: PipelineStage[]
  activities: ActivityWithUser[]
  tasks: TaskWithUser[]
  users: Array<{ id: string; full_name: string | null; avatar_url: string | null }>
}

const TEMP_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  alta:  { label: 'Quente', emoji: '🔥', color: '#e1493c', bg: '#e1493c15' },
  media: { label: 'Morno',  emoji: '🌡️', color: '#F59E0B', bg: '#F59E0B15' },
  baixa: { label: 'Frio',   emoji: '❄️', color: '#5B8CFF', bg: '#5B8CFF15' },
}

const ORIGINS = [
  'Google Ads', 'Meta Ads', 'LinkedIn Ads', 'Instagram Orgânico',
  'TikTok Ads', 'WhatsApp', 'Indicação', 'Prospecção Ativa',
  'Evento', 'E-mail Marketing', 'Orgânico / SEO', 'Referral', 'Personalizado',
]

const LOST_REASONS = [
  'Preço alto', 'Escolheu outro fornecedor', 'Sem orçamento no momento',
  'Não tem interesse', 'Negociação travou', 'Lead frio demais', 'Personalizado',
]

type ActivityIcon = { icon: React.ElementType; color: string; bg: string }
const ACTIVITY_TYPE: Record<string, ActivityIcon> = {
  nota:         { icon: MessageSquare, color: '#6B7280', bg: '#6B728015' },
  email:        { icon: Mail,          color: '#5B8CFF', bg: '#5B8CFF15' },
  ligacao:      { icon: Phone,         color: '#12B981', bg: '#12B98115' },
  reuniao:      { icon: Calendar,      color: '#8B5CF6', bg: '#8B5CF615' },
  tarefa:       { icon: CheckSquare,   color: '#F59E0B', bg: '#F59E0B15' },
  stage_change: { icon: ArrowRight,    color: '#5B8CFF', bg: '#5B8CFF15' },
  ganho:        { icon: Check,         color: '#12B981', bg: '#12B98115' },
  perdido:      { icon: X,             color: '#e1493c', bg: '#e1493c15' },
  criado:       { icon: Activity,      color: '#8B5CF6', bg: '#8B5CF615' },
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  return `${d}d atrás`
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ActivityRow({ act }: { act: ActivityWithUser }) {
  const cfg = ACTIVITY_TYPE[act.type ?? 'nota'] ?? ACTIVITY_TYPE.nota
  const Icon = cfg.icon
  return (
    <div className="flex gap-3 py-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: cfg.bg }}>
          <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
        </div>
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-start gap-2 justify-between">
          <p className="text-sm font-medium">{act.title}</p>
          <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(act.created_at)}</span>
        </div>
        {act.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{act.description}</p>}
        {act.user && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Avatar className="h-4 w-4">
              <AvatarImage src={act.user.avatar_url ?? undefined} />
              <AvatarFallback className="text-[8px]" style={{ background: '#5B8CFF20', color: '#5B8CFF' }}>
                {(act.user.full_name ?? 'U').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-muted-foreground">{act.user.full_name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function LeadDetailClient({ lead: initialLead, stages, activities: initialActivities, tasks: initialTasks, users }: Props) {
  const router = useRouter()
  const [lead, setLead] = useState(initialLead)
  const [activities, setActivities] = useState(initialActivities)
  const [tasks, setTasks] = useState(initialTasks)
  const [tab, setTab] = useState<'historico' | 'notas' | 'atividades' | 'emails' | 'arquivos'>('historico')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showLostDialog, setShowLostDialog] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [customLostReason, setCustomLostReason] = useState('')
  const [movingStage, setMovingStage] = useState<string | null>(null)
  const [markingWon, setMarkingWon] = useState(false)
  const [markingLost, setMarkingLost] = useState(false)

  // Note
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  // Task
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  // CNPJ lookup (in edit mode)
  const [cnpjInput, setCnpjInput] = useState('')
  const [cnpjLoading, setCnpjLoading] = useState(false)

  // Edit fields
  const [editName, setEditName] = useState(lead.name)
  const [editCompany, setEditCompany] = useState(lead.company ?? '')
  const [editEmail, setEditEmail] = useState(lead.email ?? '')
  const [editPhone, setEditPhone] = useState(lead.phone ?? '')
  const [editWhatsapp, setEditWhatsapp] = useState(lead.whatsapp ?? '')
  const [editValue, setEditValue] = useState(lead.value?.toString() ?? '')
  const [editCity, setEditCity] = useState(lead.city ?? '')
  const [editOrigin, setEditOrigin] = useState(lead.origin ?? '')
  const [editNextAction, setEditNextAction] = useState(lead.next_action ?? '')
  const [editResponsibleId, setEditResponsibleId] = useState(lead.responsible_id ?? '')
  const [editPriority, setEditPriority] = useState(lead.priority)

  const currentStageIdx = stages.findIndex(s => s.id === lead.stage_id)
  const days = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 864e5)
  const temp = TEMP_CONFIG[lead.priority] ?? TEMP_CONFIG.media
  const responsible = users.find(u => u.id === (editing ? editResponsibleId : lead.responsible_id))

  const getMe = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('users').select('id, full_name, avatar_url').single()
    return data
  }

  const logActivity = async (type: string, title: string, description?: string) => {
    const supabase = createClient()
    const me = await getMe()
    const { data } = await supabase.from('activities').insert({
      organization_id: lead.organization_id,
      lead_id: lead.id,
      user_id: me?.id,
      type,
      title,
      description: description ?? null,
    }).select('*, user:user_id(id, full_name, avatar_url)').single()
    if (data) setActivities(prev => [data as ActivityWithUser, ...prev])
  }

  const moveToStage = async (stageId: string) => {
    if (stageId === lead.stage_id) return
    setMovingStage(stageId)
    const supabase = createClient()
    const oldStage = stages.find(s => s.id === lead.stage_id)
    const newStage = stages.find(s => s.id === stageId)
    await supabase.from('leads').update({ stage_id: stageId }).eq('id', lead.id)
    setLead(prev => ({ ...prev, stage_id: stageId }))
    await logActivity('stage_change', `Mudou de etapa: ${oldStage?.name ?? '—'} → ${newStage?.name ?? '—'}`)
    toast.success(`Lead movido para ${newStage?.name}`)
    setMovingStage(null)
  }

  const markWon = async () => {
    setMarkingWon(true)
    const supabase = createClient()
    await supabase.from('leads').update({ won_at: new Date().toISOString() }).eq('id', lead.id)
    await logActivity('ganho', '🎉 Lead marcado como Ganho!')
    toast.success('Parabéns! Lead ganho!')
    router.push('/pipeline')
  }

  const markLost = async () => {
    setMarkingLost(true)
    const reason = lostReason === 'Personalizado' ? customLostReason : lostReason
    const supabase = createClient()
    await supabase.from('leads').update({ lost_at: new Date().toISOString(), lost_reason: reason }).eq('id', lead.id)
    await logActivity('perdido', `Lead perdido${reason ? `: ${reason}` : ''}`)
    toast.info('Lead marcado como perdido')
    router.push('/pipeline')
  }

  const saveDetails = async () => {
    setSaving(true)
    const supabase = createClient()
    const responsible = users.find(u => u.id === editResponsibleId)
    const { error } = await supabase.from('leads').update({
      name: editName.trim() || lead.name,
      company: editCompany.trim() || null,
      email: editEmail.trim() || null,
      phone: editPhone.trim() || null,
      whatsapp: editWhatsapp.trim() || null,
      value: editValue ? Number(editValue) : null,
      city: editCity.trim() || null,
      origin: editOrigin || null,
      next_action: editNextAction.trim() || null,
      responsible_id: editResponsibleId || null,
      priority: editPriority,
    }).eq('id', lead.id)

    if (error) { toast.error(`Erro: ${error.message}`); setSaving(false); return }

    setLead(prev => ({
      ...prev,
      name: editName.trim() || lead.name,
      company: editCompany.trim() || null,
      email: editEmail.trim() || null,
      phone: editPhone.trim() || null,
      whatsapp: editWhatsapp.trim() || null,
      value: editValue ? Number(editValue) : null,
      city: editCity.trim() || null,
      origin: editOrigin || null,
      next_action: editNextAction.trim() || null,
      responsible_id: editResponsibleId || null,
      priority: editPriority,
      responsible: responsible ? { id: responsible.id, full_name: responsible.full_name, avatar_url: responsible.avatar_url } : null,
    }))
    setEditing(false)
    setSaving(false)
    toast.success('Detalhes salvos!')
  }

  const addNote = async () => {
    if (!noteText.trim()) return
    setAddingNote(true)
    await logActivity('nota', 'Nota adicionada', noteText.trim())
    setNoteText('')
    setAddingNote(false)
    toast.success('Nota adicionada!')
    setTab('historico')
  }

  const addTask = async () => {
    if (!newTaskTitle.trim()) return
    setAddingTask(true)
    const supabase = createClient()
    const me = await getMe()
    const { data } = await supabase.from('lead_tasks').insert({
      lead_id: lead.id,
      user_id: me?.id,
      title: newTaskTitle.trim(),
      due_date: newTaskDue || null,
      is_done: false,
    }).select('*, user:user_id(id, full_name, avatar_url)').single()
    if (data) setTasks(prev => [...prev, data as TaskWithUser])
    setNewTaskTitle('')
    setNewTaskDue('')
    setAddingTask(false)
    toast.success('Atividade criada!')
  }

  const toggleTask = async (taskId: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('lead_tasks').update({ is_done: !current }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_done: !current } : t))
    if (!current) await logActivity('tarefa', 'Atividade concluída', tasks.find(t => t.id === taskId)?.title)
  }

  const deleteTask = async (taskId: string) => {
    const supabase = createClient()
    await supabase.from('lead_tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const lookupCnpj = async () => {
    const clean = cnpjInput.replace(/\D/g, '')
    if (clean.length !== 14) { toast.error('Digite um CNPJ com 14 dígitos'); return }
    setCnpjLoading(true)
    const res = await fetch(`/api/cnpj/${clean}`)
    if (!res.ok) {
      toast.error('CNPJ não encontrado na Receita Federal')
      setCnpjLoading(false)
      return
    }
    const data = await res.json()
    setEditCompany(data.nome_fantasia || data.razao_social || editCompany)
    if (data.email) setEditEmail(data.email)
    if (data.ddd_telefone_1) {
      const phone = data.ddd_telefone_1.replace(/\D/g, '')
      setEditPhone(phone.length >= 10 ? `(${phone.slice(0,2)}) ${phone.slice(2,7)}-${phone.slice(7)}` : phone)
    }
    if (data.municipio && data.uf) setEditCity(`${data.municipio} (${data.uf})`)
    setCnpjLoading(false)
    toast.success(`Dados da ${data.razao_social} carregados!`)
  }

  const TABS = [
    { value: 'historico' as const, label: 'Histórico', count: activities.length + 1 },
    { value: 'notas' as const, label: 'Notas', count: activities.filter(a => a.type === 'nota').length },
    { value: 'atividades' as const, label: 'Atividades', count: tasks.length },
    { value: 'emails' as const, label: 'E-mails', count: 0 },
    { value: 'arquivos' as const, label: 'Arquivos', count: 0 },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/pipeline')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Pipeline
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-semibold truncate max-w-[200px]">{lead.name}</span>
        {lead.company && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground truncate max-w-[180px]">{lead.company}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {lead.won_at ? (
            <Badge className="bg-[#12B981]/15 text-[#12B981] border-0 text-xs">✓ Ganho</Badge>
          ) : lead.lost_at ? (
            <Badge className="bg-red-100 text-red-600 border-0 text-xs dark:bg-red-950/30 dark:text-red-400">✗ Perdido</Badge>
          ) : (
            <>
              <Button
                size="sm"
                className="bg-[#12B981] hover:bg-[#059669] text-white gap-1.5 text-xs h-8"
                onClick={markWon}
                disabled={markingWon}
              >
                {markingWon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Ganho
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 gap-1.5 text-xs h-8 dark:border-red-900/50 dark:hover:bg-red-950/20"
                onClick={() => setShowLostDialog(true)}
              >
                <X className="w-3.5 h-3.5" /> Perdido
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stage progress bar */}
      <div className="px-6 py-3 bg-card border-b border-border overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {stages.map((stage, i) => {
            const isCurrent = stage.id === lead.stage_id
            const isPast = i < currentStageIdx
            const stageColor = stage.color || '#5B8CFF'
            return (
              <button
                key={stage.id}
                onClick={() => moveToStage(stage.id)}
                disabled={!!movingStage || !!lead.won_at || !!lead.lost_at}
                className={cn(
                  'relative flex flex-col items-center px-4 py-2 text-xs font-medium transition-all rounded-lg shrink-0',
                  isCurrent ? 'text-white shadow-sm' : isPast ? 'bg-muted/50 text-muted-foreground hover:bg-muted' : 'bg-muted/20 text-muted-foreground/50 hover:bg-muted/40',
                  movingStage === stage.id && 'opacity-60',
                )}
                style={isCurrent ? { background: stageColor } : {}}
                title={`Mover para ${stage.name}`}
              >
                <span>{stage.name}</span>
                {isCurrent && (
                  <span className="text-[9px] mt-0.5 opacity-80 flex items-center gap-0.5">
                    <Clock className="w-2 h-2" />{days}d
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-0 divide-x divide-border min-h-[calc(100vh-130px)]">
        {/* Left panel — Details */}
        <div className="w-80 shrink-0 p-5 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Detalhes</h3>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setEditing(false); setEditName(lead.name); setEditCompany(lead.company ?? ''); setEditEmail(lead.email ?? ''); setEditPhone(lead.phone ?? ''); setEditValue(lead.value?.toString() ?? ''); setEditCity(lead.city ?? ''); setEditOrigin(lead.origin ?? ''); setEditNextAction(lead.next_action ?? ''); setEditResponsibleId(lead.responsible_id ?? ''); setEditPriority(lead.priority) }} className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
                <button onClick={saveDetails} disabled={saving} className="text-[#12B981] hover:text-[#059669] p-1 rounded transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* CNPJ lookup (edit mode only) */}
          {editing && (
            <div className="space-y-1.5 p-3 bg-muted/30 rounded-lg border border-border">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Busca por CNPJ (auto-preenche campos)</Label>
              <div className="flex gap-1.5">
                <Input
                  value={cnpjInput}
                  onChange={e => setCnpjInput(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="h-8 text-xs font-mono"
                  maxLength={18}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 shrink-0"
                  onClick={lookupCnpj}
                  disabled={cnpjLoading}
                >
                  {cnpjLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {[
              { label: 'Nome', icon: User, view: lead.name, edit: <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-xs" /> },
              { label: 'Empresa', icon: Building2, view: lead.company, edit: <Input value={editCompany} onChange={e => setEditCompany(e.target.value)} placeholder="Empresa LTDA" className="h-8 text-xs" /> },
              { label: 'Valor estimado', icon: DollarSign, view: lead.value ? `R$ ${lead.value.toLocaleString('pt-BR')}` : null, edit: <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="0" className="h-8 text-xs" /> },
              { label: 'E-mail', icon: Mail, view: lead.email, edit: <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email@empresa.com" className="h-8 text-xs" /> },
              { label: 'Telefone', icon: Phone, view: lead.phone, edit: <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="(11) 99999-9999" className="h-8 text-xs" /> },
              { label: 'WhatsApp', icon: Phone, view: lead.whatsapp, edit: <Input value={editWhatsapp} onChange={e => setEditWhatsapp(e.target.value)} placeholder="(11) 99999-9999" className="h-8 text-xs" /> },
              { label: 'Cidade', icon: MapPin, view: lead.city, edit: <Input value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="São Paulo (SP)" className="h-8 text-xs" /> },
              { label: 'Próxima ação', icon: Target, view: lead.next_action, edit: <Input value={editNextAction} onChange={e => setEditNextAction(e.target.value)} placeholder="Enviar proposta..." className="h-8 text-xs" /> },
            ].map(({ label, icon: Icon, view, edit }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                </div>
                {editing ? edit : (
                  <p className={cn('text-sm pl-4.5', view ? 'text-foreground' : 'text-muted-foreground/50 italic')}>
                    {view ?? '—'}
                  </p>
                )}
              </div>
            ))}

            {/* Temperature */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Temperatura</span>
              </div>
              {editing ? (
                <div className="flex gap-1.5 pl-4.5">
                  {(['alta', 'media', 'baixa'] as const).map(p => {
                    const t = TEMP_CONFIG[p]
                    return (
                      <button key={p} onClick={() => setEditPriority(p)}
                        className={cn('px-2.5 py-1 rounded-lg text-xs font-medium transition-all border', editPriority === p ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:border-muted-foreground/40')}
                        style={editPriority === p ? { background: t.color } : {}}>
                        {t.emoji} {t.label}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="pl-4.5">
                  <span className="text-xs px-2 py-0.5 rounded-md font-semibold" style={{ background: temp.bg, color: temp.color }}>
                    {temp.emoji} {temp.label}
                  </span>
                </div>
              )}
            </div>

            {/* Origin */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Origem</span>
              </div>
              {editing ? (
                <Select value={editOrigin} onValueChange={v => { if (v) setEditOrigin(v) }}>
                  <SelectTrigger className="h-8 text-xs ml-4.5">
                    <span className={editOrigin ? 'text-foreground' : 'text-muted-foreground'}>{editOrigin || 'Selecione...'}</span>
                    <ChevronDown className="w-3 h-3 ml-auto shrink-0 text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGINS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className={cn('text-sm pl-4.5', lead.origin ? 'text-foreground' : 'text-muted-foreground/50 italic')}>
                  {lead.origin ?? '—'}
                </p>
              )}
            </div>

            {/* Responsible */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Responsável</span>
              </div>
              {editing ? (
                <Select value={editResponsibleId} onValueChange={v => { if (v) setEditResponsibleId(v) }}>
                  <SelectTrigger className="h-8 text-xs ml-4.5">
                    <span className={editResponsibleId ? 'text-foreground' : 'text-muted-foreground'}>
                      {users.find(u => u.id === editResponsibleId)?.full_name ?? 'Selecione...'}
                    </span>
                    <ChevronDown className="w-3 h-3 ml-auto shrink-0 text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.id}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 pl-4.5">
                  {lead.responsible ? (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={lead.responsible.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[8px] text-white" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                          {(lead.responsible.full_name ?? 'U').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{lead.responsible.full_name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground/50 italic">—</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Criado em</span>
              <span className="font-medium">{formatDate(lead.created_at)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tempo no pipeline</span>
              <span className={cn('font-semibold', days >= 21 ? 'text-red-500' : days >= 14 ? 'text-yellow-500' : 'text-foreground')}>
                {days} dias {days >= 21 ? '⚠️' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Atividades</span>
              <span className="font-medium">{tasks.length}</span>
            </div>
          </div>
        </div>

        {/* Right panel — Tabs */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <div className="flex gap-0.5 border-b border-border px-5 overflow-x-auto shrink-0">
            {TABS.map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
                  tab === value ? 'border-[#5B8CFF] text-[#5B8CFF]' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
                {count > 0 && (
                  <span className={cn('text-[10px] px-1.5 py-0 rounded-full font-bold', tab === value ? 'bg-[#5B8CFF] text-white' : 'bg-muted text-muted-foreground')}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-5">

            {/* HISTÓRICO */}
            {tab === 'historico' && (
              <div className="max-w-2xl">
                {activities.length === 0 && (
                  <div className="flex gap-3 py-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#8B5CF615]">
                        <Activity className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      </div>
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-start gap-2 justify-between">
                        <p className="text-sm font-medium">Lead criado</p>
                        <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(lead.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{lead.name}{lead.company ? ` — ${lead.company}` : ''}</p>
                    </div>
                  </div>
                )}

                {activities.map(act => <ActivityRow key={act.id} act={act} />)}

                {/* Synthetic "Criado" event at the bottom */}
                {activities.length > 0 && (
                  <div className="flex gap-3 py-3 opacity-60">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#8B5CF615]">
                        <Activity className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      </div>
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-start gap-2 justify-between">
                        <p className="text-sm font-medium">Lead criado</p>
                        <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{formatDate(lead.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{lead.name}{lead.company ? ` — ${lead.company}` : ''}{lead.origin ? ` · ${lead.origin}` : ''}</p>
                    </div>
                  </div>
                )}

                {activities.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhuma atividade registrada ainda. Adicione notas ou mova o lead de etapa.</p>
                )}
              </div>
            )}

            {/* NOTAS */}
            {tab === 'notas' && (
              <div className="max-w-2xl space-y-4">
                <div className="space-y-2">
                  <Textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Escreva uma nota sobre este lead — contato feito, informações importantes, próximos passos..."
                    className="min-h-[100px] text-sm resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="text-white text-xs gap-1.5"
                      style={{ background: 'var(--brand-primary,#5B8CFF)' }}
                      onClick={addNote}
                      disabled={addingNote || !noteText.trim()}
                    >
                      {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Adicionar nota
                    </Button>
                  </div>
                </div>

                <div className="space-y-0 divide-y divide-border">
                  {activities.filter(a => a.type === 'nota').map(act => (
                    <div key={act.id} className="py-3">
                      <div className="flex items-start gap-2 justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          {act.user && (
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={act.user.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[8px]" style={{ background: '#5B8CFF20', color: '#5B8CFF' }}>
                                {(act.user.full_name ?? 'U').charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <span className="text-xs font-semibold">{act.user?.full_name ?? 'Sistema'}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{formatDate(act.created_at)}</span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{act.description}</p>
                    </div>
                  ))}
                  {activities.filter(a => a.type === 'nota').length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma nota adicionada ainda.</p>
                  )}
                </div>
              </div>
            )}

            {/* ATIVIDADES */}
            {tab === 'atividades' && (
              <div className="max-w-2xl space-y-4">
                {/* Add task form */}
                <div className="flex gap-2 p-3 bg-muted/30 border border-border rounded-xl">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="Título da atividade (ex: Ligar para o cliente, Enviar proposta...)"
                      className="h-9 text-sm"
                      onKeyDown={e => e.key === 'Enter' && addTask()}
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <Label className="text-xs text-muted-foreground">Prazo:</Label>
                        <Input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)} className="h-7 text-xs w-auto flex-1" />
                      </div>
                      <Button
                        size="sm"
                        className="text-white text-xs gap-1.5 h-7"
                        style={{ background: 'var(--brand-primary,#5B8CFF)' }}
                        onClick={addTask}
                        disabled={addingTask || !newTaskTitle.trim()}
                      >
                        {addingTask ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Criar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Pending tasks */}
                <div className="space-y-2">
                  {tasks.filter(t => !t.is_done).length === 0 && tasks.filter(t => t.is_done).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade criada ainda.</p>
                  )}
                  {tasks.filter(t => !t.is_done).map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl group">
                      <button onClick={() => toggleTask(task.id, task.is_done)} className="text-muted-foreground hover:text-[#12B981] transition-colors shrink-0">
                        <Square className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.due_date && (
                          <p className={cn('text-[10px] flex items-center gap-0.5 mt-0.5',
                            new Date(task.due_date) < new Date() ? 'text-red-500' : 'text-muted-foreground')}>
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(task.due_date).toLocaleDateString('pt-BR')}
                            {new Date(task.due_date) < new Date() ? ' (atrasada)' : ''}
                          </p>
                        )}
                      </div>
                      {task.user && (
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarImage src={task.user.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[8px]" style={{ background: '#5B8CFF20', color: '#5B8CFF' }}>
                            {(task.user.full_name ?? 'U').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Done tasks */}
                {tasks.filter(t => t.is_done).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Concluídas</p>
                    {tasks.filter(t => t.is_done).map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-xl opacity-60 group">
                        <button onClick={() => toggleTask(task.id, task.is_done)} className="text-[#12B981] shrink-0">
                          <CheckSquare className="w-4 h-4" />
                        </button>
                        <p className="text-sm line-through text-muted-foreground flex-1">{task.title}</p>
                        <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* E-MAILS */}
            {tab === 'emails' && (
              <div className="max-w-xl text-center py-16 space-y-3">
                <Mail className="w-10 h-10 mx-auto text-muted-foreground/30" />
                <p className="text-sm font-semibold">Histórico de e-mails</p>
                <p className="text-xs text-muted-foreground">Os e-mails enviados pelo CYCLO para este lead aparecerão aqui. Configure uma integração de e-mail em Integrações → Email.</p>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => router.push('/integracoes?tab=email')}>
                  Configurar e-mail
                </Button>
              </div>
            )}

            {/* ARQUIVOS */}
            {tab === 'arquivos' && (
              <div className="max-w-xl text-center py-16 space-y-3">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground/30" />
                <p className="text-sm font-semibold">Arquivos e documentos</p>
                <p className="text-xs text-muted-foreground">Anexe propostas, contratos e documentos a este lead. Em breve disponível.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lost reason dialog */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Marcar como Perdido
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">Selecione o motivo da perda para melhorar seus relatórios e análises.</p>
            <div className="grid grid-cols-2 gap-2">
              {LOST_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => setLostReason(reason)}
                  className={cn(
                    'px-3 py-2 text-xs rounded-lg border font-medium transition-all text-left',
                    lostReason === reason ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' : 'border-border hover:border-muted-foreground/40',
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>
            {lostReason === 'Personalizado' && (
              <Input
                value={customLostReason}
                onChange={e => setCustomLostReason(e.target.value)}
                placeholder="Descreva o motivo da perda..."
                className="text-sm"
                autoFocus
              />
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 text-sm" onClick={() => setShowLostDialog(false)}>Cancelar</Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm gap-1.5"
                onClick={async () => { setShowLostDialog(false); await markLost() }}
                disabled={markingLost || !lostReason}
              >
                {markingLost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                Confirmar perda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
