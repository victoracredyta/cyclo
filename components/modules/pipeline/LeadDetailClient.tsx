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
  Upload, Download, File as FileIcon, Image as ImageIcon, FileSpreadsheet, Send,
} from 'lucide-react'
import type { Lead, PipelineStage, Activity as ActivityType, LeadTask, LeadFile, LeadEmail } from '@/types/database'

type Responsible = { id: string; full_name: string | null; avatar_url: string | null }
type LeadFull = Lead & { responsible: Responsible | null }
type ActivityWithUser = ActivityType & { user: Responsible | null }
type TaskWithUser = LeadTask & { user: Responsible | null }
type FileWithUploader = LeadFile & { uploader: Responsible | null }
type EmailWithSender = LeadEmail & { sender: Responsible | null }

interface Props {
  lead: LeadFull
  stages: PipelineStage[]
  activities: ActivityWithUser[]
  tasks: TaskWithUser[]
  users: Array<{ id: string; full_name: string | null; avatar_url: string | null }>
  files: FileWithUploader[]
  emails: EmailWithSender[]
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

type ActivityIcon = { icon: React.ElementType; color: string; bg: string; label: string }
const ACTIVITY_TYPE: Record<string, ActivityIcon> = {
  nota:          { icon: MessageSquare, color: '#6B7280', bg: '#6B728015', label: 'Nota' },
  email:         { icon: Mail,          color: '#5B8CFF', bg: '#5B8CFF15', label: 'E-mail' },
  email_externo: { icon: Mail,          color: '#5B8CFF', bg: '#5B8CFF15', label: 'E-mail externo' },
  ligacao:       { icon: Phone,         color: '#12B981', bg: '#12B98115', label: 'Ligação' },
  reuniao:       { icon: Calendar,      color: '#8B5CF6', bg: '#8B5CF615', label: 'Reunião' },
  tarefa:        { icon: CheckSquare,   color: '#F59E0B', bg: '#F59E0B15', label: 'Atividade' },
  stage_change:  { icon: ArrowRight,    color: '#5B8CFF', bg: '#5B8CFF15', label: 'Mudança de etapa' },
  transferencia: { icon: User,          color: '#0EA5E9', bg: '#0EA5E915', label: 'Transferência de dono' },
  edicao:        { icon: Edit2,         color: '#6366F1', bg: '#6366F115', label: 'Edição' },
  ganho:         { icon: Check,         color: '#12B981', bg: '#12B98115', label: 'Ganho' },
  perdido:       { icon: X,             color: '#e1493c', bg: '#e1493c15', label: 'Perdido' },
  criado:        { icon: Activity,      color: '#8B5CF6', bg: '#8B5CF615', label: 'Criado' },
}

// Available note types in the "Nota" tab — quick-select chips
const NOTE_TYPES: Array<{ value: string; label: string; emoji: string }> = [
  { value: 'nota',          label: 'Nota',           emoji: '📝' },
  { value: 'ligacao',       label: 'Ligação',        emoji: '📞' },
  { value: 'reuniao',       label: 'Reunião',        emoji: '🎯' },
  { value: 'email_externo', label: 'E-mail externo', emoji: '✉️' },
]

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

export function LeadDetailClient({ lead: initialLead, stages, activities: initialActivities, tasks: initialTasks, users, files: initialFiles, emails: initialEmails }: Props) {
  const router = useRouter()
  const [lead, setLead] = useState(initialLead)
  const [activities, setActivities] = useState(initialActivities)
  const [tasks, setTasks] = useState(initialTasks)
  const [files, setFiles] = useState<FileWithUploader[]>(initialFiles)
  const [emails, setEmails] = useState<EmailWithSender[]>(initialEmails)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [showComposeEmail, setShowComposeEmail] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
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
  const [noteType, setNoteType] = useState<string>('nota')
  const [addingNote, setAddingNote] = useState(false)

  // Transfer ownership
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferTo, setTransferTo] = useState<string>('')
  const [transferring, setTransferring] = useState(false)

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

    // Diff fields for history logging
    const changes: string[] = []
    const fmt = (v: string | null | undefined) => v ? v : '—'
    const newName = editName.trim() || lead.name
    if (newName !== lead.name) changes.push(`Nome: "${lead.name}" → "${newName}"`)
    const newCompany = editCompany.trim() || null
    if (newCompany !== lead.company) changes.push(`Empresa: "${fmt(lead.company)}" → "${fmt(newCompany)}"`)
    const newEmail = editEmail.trim() || null
    if (newEmail !== lead.email) changes.push(`E-mail: "${fmt(lead.email)}" → "${fmt(newEmail)}"`)
    const newPhone = editPhone.trim() || null
    if (newPhone !== lead.phone) changes.push(`Telefone: "${fmt(lead.phone)}" → "${fmt(newPhone)}"`)
    const newValue = editValue ? Number(editValue) : null
    if (newValue !== lead.value) changes.push(`Valor: R$ ${lead.value ?? 0} → R$ ${newValue ?? 0}`)
    const newCity = editCity.trim() || null
    if (newCity !== lead.city) changes.push(`Cidade: "${fmt(lead.city)}" → "${fmt(newCity)}"`)
    const newOrigin = editOrigin || null
    if (newOrigin !== lead.origin) changes.push(`Origem: "${fmt(lead.origin)}" → "${fmt(newOrigin)}"`)
    const newNext = editNextAction.trim() || null
    if (newNext !== lead.next_action) changes.push(`Próxima ação: "${fmt(lead.next_action)}" → "${fmt(newNext)}"`)
    if (editPriority !== lead.priority) {
      const oldT = TEMP_CONFIG[lead.priority]?.label ?? lead.priority
      const newT = TEMP_CONFIG[editPriority]?.label ?? editPriority
      changes.push(`Temperatura: ${oldT} → ${newT}`)
    }

    const responsibleChanged = editResponsibleId !== (lead.responsible_id ?? '')

    const { error } = await supabase.from('leads').update({
      name: newName,
      company: newCompany,
      email: newEmail,
      phone: newPhone,
      whatsapp: editWhatsapp.trim() || null,
      value: newValue,
      city: newCity,
      origin: newOrigin,
      next_action: newNext,
      responsible_id: editResponsibleId || null,
      priority: editPriority,
    }).eq('id', lead.id)

    if (error) { toast.error(`Erro: ${error.message}`); setSaving(false); return }

    // Log activities
    if (changes.length > 0) {
      await logActivity('edicao', `${changes.length} alteraç${changes.length === 1 ? 'ão' : 'ões'} no lead`, changes.join('\n'))
    }
    if (responsibleChanged) {
      const newRespName = responsible?.full_name ?? '—'
      const oldRespName = lead.responsible?.full_name ?? '—'
      await logActivity('transferencia', `Transferiu para ${newRespName}`, `De ${oldRespName} → ${newRespName}`)
    }

    setLead(prev => ({
      ...prev,
      name: newName,
      company: newCompany,
      email: newEmail,
      phone: newPhone,
      whatsapp: editWhatsapp.trim() || null,
      value: newValue,
      city: newCity,
      origin: newOrigin,
      next_action: newNext,
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
    const cfg = ACTIVITY_TYPE[noteType] ?? ACTIVITY_TYPE.nota
    await logActivity(noteType, `${cfg.label} adicionada`, noteText.trim())
    setNoteText('')
    setAddingNote(false)
    toast.success(`${cfg.label} salva!`)
    setTab('historico')
  }

  const transferOwner = async () => {
    if (!transferTo || transferTo === lead.responsible_id) {
      toast.error('Escolha um responsável diferente do atual')
      return
    }
    setTransferring(true)
    const supabase = createClient()
    const newResp = users.find(u => u.id === transferTo)
    const oldResp = lead.responsible
    const { error } = await supabase.from('leads').update({ responsible_id: transferTo }).eq('id', lead.id)
    if (error) {
      toast.error(`Erro: ${error.message}`)
      setTransferring(false)
      return
    }
    await logActivity(
      'transferencia',
      `Transferiu para ${newResp?.full_name ?? '—'}`,
      oldResp ? `De ${oldResp.full_name ?? '—'} → ${newResp?.full_name ?? '—'}` : `Atribuído a ${newResp?.full_name ?? '—'}`,
    )
    setLead(prev => ({
      ...prev,
      responsible_id: transferTo,
      responsible: newResp ? { id: newResp.id, full_name: newResp.full_name, avatar_url: newResp.avatar_url } : null,
    }))
    setEditResponsibleId(transferTo)
    setShowTransfer(false)
    setTransferring(false)
    toast.success(`Lead transferido para ${newResp?.full_name ?? 'novo responsável'}`)
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('Arquivo muito grande (máx 20MB)'); return }
    setUploadingFile(true)
    const supabase = createClient()
    const me = await getMe()
    const path = `${lead.organization_id}/${lead.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
    const { error: upErr } = await supabase.storage.from('lead-files').upload(path, file, { upsert: false, contentType: file.type })
    if (upErr) { toast.error(`Erro no upload: ${upErr.message}`); setUploadingFile(false); return }
    const { data: fileRow, error: dbErr } = await supabase.from('lead_files').insert({
      lead_id: lead.id,
      organization_id: lead.organization_id,
      uploaded_by: me?.id,
      name: file.name,
      path,
      size: file.size,
      mime_type: file.type || null,
    }).select('*, uploader:uploaded_by(id, full_name, avatar_url)').single()
    if (dbErr) { toast.error('Erro ao registrar arquivo'); setUploadingFile(false); return }
    setFiles(prev => [fileRow as FileWithUploader, ...prev])
    await logActivity('edicao', `Arquivo anexado: ${file.name}`)
    toast.success('Arquivo anexado!')
    setUploadingFile(false)
    e.target.value = ''
  }

  const downloadFile = async (f: FileWithUploader) => {
    const supabase = createClient()
    const { data, error } = await supabase.storage.from('lead-files').createSignedUrl(f.path, 60)
    if (error || !data?.signedUrl) { toast.error('Erro ao gerar link'); return }
    window.open(data.signedUrl, '_blank')
  }

  const deleteFile = async (f: FileWithUploader) => {
    if (!confirm(`Excluir o arquivo "${f.name}"?`)) return
    const supabase = createClient()
    await supabase.storage.from('lead-files').remove([f.path])
    await supabase.from('lead_files').delete().eq('id', f.id)
    setFiles(prev => prev.filter(x => x.id !== f.id))
    toast.success('Arquivo removido')
  }

  const openCompose = () => {
    setEmailTo(lead.email ?? '')
    setEmailSubject('')
    setEmailBody('')
    setShowComposeEmail(true)
  }

  const sendLeadEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) { toast.error('Preencha destinatário, assunto e mensagem'); return }
    setSendingEmail(true)
    const supabase = createClient()
    const me = await getMe()
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(`Erro ao enviar: ${body.error ?? 'verifique sua integração SMTP'}`)
      setSendingEmail(false)
      return
    }
    const { data: emailRow } = await supabase.from('lead_emails').insert({
      lead_id: lead.id,
      organization_id: lead.organization_id,
      sent_by: me?.id,
      recipient: emailTo,
      subject: emailSubject,
      body: emailBody,
      status: 'sent',
    }).select('*, sender:sent_by(id, full_name, avatar_url)').single()
    if (emailRow) setEmails(prev => [emailRow as EmailWithSender, ...prev])
    await logActivity('email', `E-mail enviado: ${emailSubject}`, `Para: ${emailTo}`)
    toast.success('E-mail enviado!')
    setShowComposeEmail(false)
    setSendingEmail(false)
  }

  const TABS = [
    { value: 'historico' as const, label: 'Histórico', count: activities.length + 1 },
    { value: 'notas' as const, label: 'Notas', count: activities.filter(a => ['nota', 'ligacao', 'reuniao', 'email_externo'].includes(a.type ?? '')).length },
    { value: 'atividades' as const, label: 'Atividades', count: tasks.length },
    { value: 'emails' as const, label: 'E-mails', count: emails.length },
    { value: 'arquivos' as const, label: 'Arquivos', count: files.length },
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
                <button
                  type="button"
                  onClick={() => { setTransferTo(lead.responsible_id ?? ''); setShowTransfer(true) }}
                  className="flex items-center gap-2 pl-4.5 group text-left w-full hover:bg-muted/40 -mx-1 px-1 py-0.5 rounded-md transition-colors"
                  title="Clique para transferir a oportunidade"
                >
                  {lead.responsible ? (
                    <>
                      <Avatar className="h-5 w-5 ring-2 ring-transparent group-hover:ring-[#5B8CFF]/40 transition-all">
                        <AvatarImage src={lead.responsible.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[8px] text-white" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                          {(lead.responsible.full_name ?? 'U').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{lead.responsible.full_name}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 ml-auto transition-opacity" />
                    </>
                  ) : (
                    <span className="text-sm text-[#5B8CFF] underline-offset-2 hover:underline">+ Atribuir responsável</span>
                  )}
                </button>
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
                <div className="space-y-2.5">
                  {/* Type selector */}
                  <div className="flex flex-wrap gap-1.5">
                    {NOTE_TYPES.map(nt => (
                      <button
                        key={nt.value}
                        type="button"
                        onClick={() => setNoteType(nt.value)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all',
                          noteType === nt.value
                            ? 'border-[#5B8CFF] bg-[#5B8CFF]/10 text-[#5B8CFF]'
                            : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
                        )}
                      >
                        <span>{nt.emoji}</span>
                        {nt.label}
                      </button>
                    ))}
                  </div>

                  <Textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder={
                      noteType === 'ligacao'  ? 'Registre o que conversaram na ligação...' :
                      noteType === 'reuniao'  ? 'Anote os pontos discutidos na reunião...' :
                      noteType === 'email_externo' ? 'Resumo do e-mail trocado por fora do CYCLO...' :
                      'Escreva uma nota sobre este lead — contato feito, informações importantes, próximos passos...'
                    }
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
                      Salvar {NOTE_TYPES.find(n => n.value === noteType)?.label.toLowerCase()}
                    </Button>
                  </div>
                </div>

                <div className="space-y-0 divide-y divide-border">
                  {activities.filter(a => ['nota', 'ligacao', 'reuniao', 'email_externo'].includes(a.type ?? '')).map(act => {
                    const cfg = ACTIVITY_TYPE[act.type ?? 'nota'] ?? ACTIVITY_TYPE.nota
                    const Icon = cfg.icon
                    return (
                      <div key={act.id} className="py-3">
                        <div className="flex items-start gap-2 justify-between mb-1.5">
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
                            <Badge
                              className="text-[9px] border-0 px-1.5 py-0 gap-1 font-bold"
                              style={{ background: cfg.bg, color: cfg.color }}
                            >
                              <Icon className="w-2.5 h-2.5" />
                              {cfg.label}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{formatDate(act.created_at)}</span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{act.description}</p>
                      </div>
                    )
                  })}
                  {activities.filter(a => ['nota', 'ligacao', 'reuniao', 'email_externo'].includes(a.type ?? '')).length === 0 && (
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
              <div className="max-w-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{emails.length} e-mail{emails.length !== 1 ? 's' : ''} enviado{emails.length !== 1 ? 's' : ''}</p>
                  <Button size="sm" className="text-white text-xs gap-1.5" style={{ background: 'var(--brand-primary,#5B8CFF)' }} onClick={openCompose}>
                    <Send className="w-3.5 h-3.5" /> Enviar e-mail
                  </Button>
                </div>

                {emails.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-xl">
                    <Mail className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-semibold">Nenhum e-mail enviado ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure o SMTP em <button onClick={() => router.push('/integracoes')} className="text-[#5B8CFF] hover:underline">Integrações → Email</button> antes de enviar.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {emails.map(em => (
                      <details key={em.id} className="rounded-lg border border-border bg-card group">
                        <summary className="cursor-pointer p-3 flex items-start gap-3 list-none">
                          <div className="w-8 h-8 rounded-lg bg-[#5B8CFF]/10 flex items-center justify-center shrink-0">
                            <Mail className="w-4 h-4 text-[#5B8CFF]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold truncate">{em.subject}</span>
                              <Badge className="text-[9px] bg-[#12B981]/10 text-[#12B981] border-0 px-1.5">enviado</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Para: <span className="font-medium text-foreground">{em.recipient}</span> · {em.sender?.full_name ?? 'Sistema'} · {formatDate(em.sent_at)}
                            </p>
                          </div>
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="px-3 pb-3 pt-1 border-t border-border">
                          <pre className="text-sm whitespace-pre-wrap font-sans text-foreground/90 leading-relaxed">{em.body}</pre>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ARQUIVOS */}
            {tab === 'arquivos' && (
              <div className="max-w-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {files.length} arquivo{files.length !== 1 ? 's' : ''} · máx 20MB cada
                  </p>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                    <span className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md text-white" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                      {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Enviar arquivo
                    </span>
                  </label>
                </div>

                {files.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-xl">
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-semibold">Nenhum arquivo anexado ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">Propostas, apresentações, contratos — anexe aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map(f => {
                      const Icon = (f.mime_type ?? '').startsWith('image/')
                        ? ImageIcon
                        : (f.mime_type ?? '').includes('sheet') || (f.mime_type ?? '').includes('excel')
                        ? FileSpreadsheet
                        : FileIcon
                      const sizeMb = (f.size / (1024 * 1024)).toFixed(2)
                      return (
                        <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{f.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {sizeMb} MB · {f.uploader?.full_name ?? 'Sistema'} · {formatDate(f.created_at)}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => downloadFile(f)} title="Baixar">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500" onClick={() => deleteFile(f)} title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
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

      {/* Compose email dialog */}
      <Dialog open={showComposeEmail} onOpenChange={setShowComposeEmail}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-[#5B8CFF]" /> Enviar e-mail
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Para</Label>
              <Input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="cliente@empresa.com" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assunto</Label>
              <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Proposta comercial — ..." className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mensagem</Label>
              <Textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                placeholder="Olá [nome],&#10;&#10;Segue em anexo a proposta que conversamos..."
                className="text-sm min-h-[200px] resize-none"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">O e-mail será enviado via sua integração SMTP configurada em Integrações → Email.</p>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 text-sm" onClick={() => setShowComposeEmail(false)}>Cancelar</Button>
              <Button
                className="flex-1 text-white text-sm gap-1.5"
                style={{ background: 'var(--brand-primary,#5B8CFF)' }}
                onClick={sendLeadEmail}
                disabled={sendingEmail || !emailTo || !emailSubject || !emailBody}
              >
                {sendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer ownership dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#0EA5E9]" /> Transferir oportunidade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
              <span className="text-xs font-semibold text-muted-foreground">DE</span>
              {lead.responsible ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={lead.responsible.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px] text-white" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                      {(lead.responsible.full_name ?? 'U').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{lead.responsible.full_name}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic">Sem responsável</span>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Novo responsável</Label>
              <Select value={transferTo} onValueChange={v => v && setTransferTo(v)}>
                <SelectTrigger className="h-10 text-sm">
                  <span className={transferTo ? 'text-foreground' : 'text-muted-foreground'}>
                    {users.find(u => u.id === transferTo)?.full_name ?? 'Selecione o novo dono...'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 ml-auto shrink-0 text-muted-foreground" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.id !== lead.responsible_id).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                A transferência será registrada no histórico e o novo responsável receberá uma notificação.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 text-sm" onClick={() => setShowTransfer(false)}>Cancelar</Button>
              <Button
                className="flex-1 text-white text-sm gap-1.5"
                style={{ background: '#0EA5E9' }}
                onClick={transferOwner}
                disabled={transferring || !transferTo || transferTo === lead.responsible_id}
              >
                {transferring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                Transferir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
