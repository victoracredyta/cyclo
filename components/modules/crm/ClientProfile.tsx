'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft, ArrowRight, Globe, Mail, Phone, Building2, Calendar,
  User, Target, MessageSquare, AlertTriangle, FileText,
  CheckSquare, Clock, ExternalLink, Plus, Trash2,
  Layers, Send, Eye, MessageCircle, Zap, ChevronDown,
  Star, Shield, Copy, Check, Camera, Briefcase, Users,
  Edit3, Save, X, DollarSign, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type {
  Client, ClientContact, Activity, Approval, ContentItem, Conversation,
} from '@/types/database'

/* ── helpers ──────────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  'Ativo': 'bg-[#12B981]/10 text-[#12B981] border-[#12B981]/20',
  'Em negociação': 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
  'Em risco': 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20',
  'Inativo': 'bg-muted text-muted-foreground border-border',
}

const APPROVAL_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Aguardando', color: '#F59E0B' },
  approved: { label: 'Aprovado', color: '#12B981' },
  rejected: { label: 'Ajuste', color: '#EF4444' },
  draft: { label: 'Rascunho', color: '#8B5CF6' },
}

const CONTENT_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: '#8B5CF6' },
  review: { label: 'Em revisão', color: '#F59E0B' },
  approved: { label: 'Aprovado', color: '#12B981' },
  scheduled: { label: 'Agendado', color: '#5B8CFF' },
  published: { label: 'Publicado', color: '#12B981' },
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  instagram: <Camera className="w-3.5 h-3.5" />,
  facebook: <Users className="w-3.5 h-3.5" />,
  linkedin: <Briefcase className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  whatsapp: <MessageSquare className="w-3.5 h-3.5" />,
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  meeting: <Calendar className="w-3.5 h-3.5" />,
  call: <Phone className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  note: <FileText className="w-3.5 h-3.5" />,
  approval: <CheckSquare className="w-3.5 h-3.5" />,
  task: <Clock className="w-3.5 h-3.5" />,
}

function avatarBg(name: string) {
  const colors = ['#5B8CFF', '#12B981', '#F59E0B', '#8B5CF6', '#e1493c', '#2563EB']
  return colors[name.charCodeAt(0) % colors.length]
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  return `${Math.floor(hours / 24)}d atrás`
}

/* ── types ────────────────────────────────────────────────────── */

interface ClientProfileProps {
  client: Client & {
    responsible: { id: string; full_name: string | null; avatar_url: string | null } | null
    origin_lead?: { id: string; name: string | null; company: string | null } | null
  }
  contacts: ClientContact[]
  activities: Array<Activity & { user: { full_name: string | null; avatar_url: string | null } | null }>
  approvals: Array<Pick<Approval, 'id' | 'title' | 'status' | 'due_date' | 'channel' | 'type' | 'created_at'>>
  contentItems: Array<Pick<ContentItem, 'id' | 'title' | 'status' | 'channel' | 'scheduled_date' | 'created_at'>>
  conversations: Array<Pick<Conversation, 'id' | 'channel' | 'status' | 'last_message' | 'created_at'>>
  users: Array<{ id: string; full_name: string | null; avatar_url: string | null }>
}

const ALL_SERVICES = [
  'Social Media', 'Tráfego Pago', 'SEO', 'Email Marketing',
  'Branding', 'Criação de Conteúdo', 'Website', 'Consultoria',
]

/* ── Quick Log Activity Modal ─────────────────────────────────── */

function LogActivityModal({
  clientId,
  open,
  onClose,
  onSaved,
}: {
  clientId: string
  open: boolean
  onClose: () => void
  onSaved: (a: Activity & { user: { full_name: string | null; avatar_url: string | null } | null }) => void
}) {
  const [type, setType] = useState('note')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('id, organization_id, full_name, avatar_url').single()
    if (!me?.organization_id) { setSaving(false); return }
    const { data: act, error } = await supabase.from('activities').insert({
      client_id: clientId,
      organization_id: me.organization_id,
      user_id: me.id,
      type,
      title,
      description: description || null,
    }).select('*, user:user_id(full_name, avatar_url)').single()
    if (error || !act) { toast.error('Erro ao salvar'); setSaving(false); return }
    toast.success('Atividade registrada')
    onSaved(act as Activity & { user: { full_name: string | null; avatar_url: string | null } | null })
    setTitle(''); setDescription(''); setType('note')
    setSaving(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar atividade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tipo</Label>
            <Select value={type} onValueChange={v => setType(v ?? 'note')}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[
                  { value: 'note', label: 'Nota' },
                  { value: 'call', label: 'Ligação' },
                  { value: 'meeting', label: 'Reunião' },
                  { value: 'email', label: 'E-mail' },
                  { value: 'task', label: 'Tarefa' },
                ].map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Reunião de alinhamento mensal" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes da atividade..." className="text-sm resize-none" rows={3} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 text-sm" onClick={onClose}>Cancelar</Button>
            <Button disabled={saving || !title.trim()} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-sm" onClick={save}>
              {saving ? 'Salvando…' : 'Registrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Add Contact Modal ────────────────────────────────────────── */

function AddContactModal({
  clientId,
  open,
  onClose,
  onSaved,
}: {
  clientId: string
  open: boolean
  onClose: () => void
  onSaved: (c: ClientContact) => void
}) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('client_contacts').insert({
      client_id: clientId,
      name,
      role: role || null,
      email: email || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      is_primary: isPrimary,
    }).select().single()
    if (error || !data) { toast.error('Erro ao salvar'); setSaving(false); return }
    toast.success('Contato adicionado')
    onSaved(data as ClientContact)
    setName(''); setRole(''); setEmail(''); setPhone(''); setWhatsapp(''); setIsPrimary(false)
    setSaving(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar contato</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-semibold">Nome *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cargo</Label>
              <Input value={role} onChange={e => setRole(e.target.value)} placeholder="CEO, Marketing..." className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">E-mail</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@empresa.com" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Telefone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">WhatsApp</Label>
              <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" className="h-9 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} className="rounded" />
            Contato principal
          </label>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 text-sm" onClick={onClose}>Cancelar</Button>
            <Button disabled={saving || !name.trim()} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-sm" onClick={save}>
              {saving ? 'Salvando…' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Main Component ───────────────────────────────────────────── */

export function ClientProfile({
  client: initialClient,
  contacts: initialContacts,
  activities: initialActivities,
  approvals,
  contentItems,
  conversations,
  users,
}: ClientProfileProps) {
  const [tab, setTab] = useState('overview')
  const [client, setClient] = useState(initialClient)
  const [contacts, setContacts] = useState(initialContacts)
  const [activities, setActivities] = useState(initialActivities)
  const [logOpen, setLogOpen] = useState(false)
  const [addContactOpen, setAddContactOpen] = useState(false)

  // Inline edit state
  const [editingMrr, setEditingMrr] = useState(false)
  const [mrrInput, setMrrInput] = useState(String(client.mrr ?? 0))
  const [editingContract, setEditingContract] = useState(false)
  const [contractInput, setContractInput] = useState(client.contract_since ?? '')
  const [editingObjectives, setEditingObjectives] = useState(false)
  const [objectivesInput, setObjectivesInput] = useState(client.objectives ?? '')
  const [voiceInput, setVoiceInput] = useState(client.voice_tone ?? '')
  const [editingServices, setEditingServices] = useState(false)
  const [servicesInput, setServicesInput] = useState<string[]>(client.services ?? [])
  const [customService, setCustomService] = useState('')
  const [savingField, setSavingField] = useState(false)

  const addCustomService = () => {
    const v = customService.trim()
    if (!v) return
    if (servicesInput.some(s => s.toLowerCase() === v.toLowerCase())) {
      toast.error('Esse serviço já está adicionado')
      return
    }
    setServicesInput(prev => [...prev, v])
    setCustomService('')
  }

  // Transfer ownership
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferTo, setTransferTo] = useState<string>('')
  const [transferring, setTransferring] = useState(false)

  const supabase = createClient()

  const saveField = async (patch: Partial<Client>) => {
    setSavingField(true)
    const { error } = await supabase.from('clients').update(patch).eq('id', client.id)
    if (error) { toast.error(`Erro: ${error.message}`); setSavingField(false); return false }
    setClient(prev => ({ ...prev, ...patch }))
    setSavingField(false)
    toast.success('Salvo!')
    return true
  }

  const saveMrr = async () => {
    const v = Number(mrrInput)
    if (Number.isNaN(v) || v < 0) { toast.error('Valor inválido'); return }
    if (await saveField({ mrr: v })) setEditingMrr(false)
  }

  const saveContract = async () => {
    if (await saveField({ contract_since: contractInput || null })) setEditingContract(false)
  }

  const saveObjectives = async () => {
    if (await saveField({ objectives: objectivesInput || null, voice_tone: voiceInput || null })) setEditingObjectives(false)
  }

  const toggleService = (s: string) => {
    setServicesInput(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  const saveServices = async () => {
    if (await saveField({ services: servicesInput })) setEditingServices(false)
  }

  const transferOwner = async () => {
    if (!transferTo || transferTo === client.responsible_id) {
      toast.error('Escolha um responsável diferente do atual')
      return
    }
    setTransferring(true)
    const newResp = users.find(u => u.id === transferTo)
    const { error } = await supabase.from('clients').update({ responsible_id: transferTo }).eq('id', client.id)
    if (error) { toast.error(`Erro: ${error.message}`); setTransferring(false); return }

    // Log to activity history
    const { data: me } = await supabase.from('users').select('id, full_name, avatar_url').single()
    const { data: act } = await supabase.from('activities').insert({
      client_id: client.id,
      organization_id: client.organization_id,
      user_id: me?.id,
      type: 'transferencia',
      title: `Transferiu para ${newResp?.full_name ?? '—'}`,
      description: `De ${client.responsible?.full_name ?? '—'} → ${newResp?.full_name ?? '—'}`,
    }).select('*, user:user_id(full_name, avatar_url)').single()
    if (act) setActivities(prev => [act as typeof activities[number], ...prev])

    // In-app notification for new owner
    await supabase.from('notifications').insert({
      organization_id: client.organization_id,
      user_id: transferTo,
      type: 'transferencia',
      title: `${me?.full_name ?? 'Alguém'} transferiu um cliente para você`,
      message: client.name,
      link: `/crm/${client.id}`,
    })

    setClient(prev => ({
      ...prev,
      responsible_id: transferTo,
      responsible: newResp ? { id: newResp.id, full_name: newResp.full_name, avatar_url: newResp.avatar_url } : null,
    }))
    setShowTransfer(false)
    setTransferring(false)
    toast.success(`Cliente transferido para ${newResp?.full_name ?? 'novo dono'}`)
  }

  const deleteContact = async (id: string) => {
    await supabase.from('client_contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
    toast.success('Contato removido')
  }

  const pendingApprovals = approvals.filter(a => a.status === 'pending').length
  const publishedContent = contentItems.filter(c => c.status === 'published').length
  const openConversations = conversations.filter(c => c.status === 'open').length

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Breadcrumb */}
      <Link href="/crm" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para clientes
      </Link>

      {/* Origin banner — when client was converted from a lead */}
      {client.origin_lead && (
        <Link
          href={`/pipeline/${client.origin_lead.id}`}
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-[#12B981]/30 bg-gradient-to-r from-[#12B981]/8 to-transparent hover:border-[#12B981]/50 transition-colors group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#12B981]/15 flex items-center justify-center shrink-0">
              <Star className="w-3.5 h-3.5 text-[#12B981]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#12B981]">Cliente vindo do Pipeline</p>
              <p className="text-[11px] text-muted-foreground truncate">
                Lead origem: <span className="font-semibold">{client.origin_lead.name}</span>
                {client.origin_lead.company && ` — ${client.origin_lead.company}`} · histórico completo herdado
              </p>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#12B981] transition-colors shrink-0" />
        </Link>
      )}

      {/* Header card — compacto e premium */}
      <Card className="border-border shadow-sm overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start gap-4 flex-wrap">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-md"
              style={{ backgroundColor: avatarBg(client.name) }}
            >
              {client.name.slice(0, 2).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black tracking-tight">{client.name}</h1>
                <Badge className={cn('text-[10px] border font-semibold', STATUS_COLORS[client.status] ?? STATUS_COLORS['Inativo'])}>
                  {client.status}
                </Badge>
                {client.sector && <span className="text-[11px] text-muted-foreground">· {client.sector}</span>}
              </div>

              {/* Contato direto */}
              <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
                {client.website && (
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#5B8CFF] hover:underline">
                    <Globe className="w-3 h-3" /> {client.website.replace(/https?:\/\//, '')}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                    <Mail className="w-3 h-3" /> {client.email}
                  </a>
                )}
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                    <Phone className="w-3 h-3" /> {client.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1.5 shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setLogOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Atividade
              </Button>
              {client.phone && (
                <a href={`https://wa.me/${client.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-[#25D366] hover:bg-[#1ebe5a] text-white gap-1.5 text-xs h-8">
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </Button>
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`}>
                  <Button size="sm" className="text-white gap-1.5 text-xs h-8" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                    <Send className="w-3.5 h-3.5" /> E-mail
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* KPI bar — MRR editável, Data contrato, Responsável transferível */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-border">
            {/* MRR editável */}
            <div className="group">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3 h-3 text-[#12B981]" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">MRR</p>
              </div>
              {editingMrr ? (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs">R$</span>
                  <Input
                    type="number"
                    value={mrrInput}
                    onChange={e => setMrrInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveMrr(); if (e.key === 'Escape') { setMrrInput(String(client.mrr ?? 0)); setEditingMrr(false) } }}
                    className="h-7 text-sm flex-1"
                    autoFocus
                  />
                  <button onClick={saveMrr} disabled={savingField} className="p-1 rounded hover:bg-[#12B981]/10 text-[#12B981]"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setMrrInput(String(client.mrr ?? 0)); setEditingMrr(false) }} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button onClick={() => setEditingMrr(true)} className="flex items-center gap-1.5 mt-0.5 group/btn">
                  <p className="text-base font-black tabular-nums" style={{ color: '#12B981' }}>R$ {(client.mrr ?? 0).toLocaleString('pt-BR')}</p>
                  <Edit3 className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {/* Data do contrato editável */}
            <div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-[#5B8CFF]" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Data do contrato</p>
              </div>
              {editingContract ? (
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="date"
                    value={contractInput?.slice(0, 10) ?? ''}
                    onChange={e => setContractInput(e.target.value)}
                    className="h-7 text-xs flex-1"
                    autoFocus
                  />
                  <button onClick={saveContract} disabled={savingField} className="p-1 rounded hover:bg-[#5B8CFF]/10 text-[#5B8CFF]"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setContractInput(client.contract_since ?? ''); setEditingContract(false) }} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button onClick={() => setEditingContract(true)} className="flex items-center gap-1.5 mt-0.5 group/btn">
                  <p className="text-base font-black">{formatDate(client.contract_since)}</p>
                  <Edit3 className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {/* Responsável + Transferir */}
            <div>
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-[#8B5CF6]" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Responsável</p>
              </div>
              <button
                onClick={() => { setTransferTo(client.responsible_id ?? ''); setShowTransfer(true) }}
                className="flex items-center gap-2 mt-1 group/btn w-full"
                title="Clique para transferir o cliente"
              >
                {client.responsible ? (
                  <>
                    <Avatar className="h-6 w-6 ring-2 ring-transparent group-hover/btn:ring-[#5B8CFF]/40 transition-all">
                      <AvatarImage src={client.responsible.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px] bg-[#5B8CFF] text-white">
                        {(client.responsible.full_name ?? 'U').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-bold truncate">{client.responsible.full_name}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover/btn:opacity-100 ml-auto transition-opacity" />
                  </>
                ) : (
                  <span className="text-sm text-[#5B8CFF] underline-offset-2 hover:underline">+ Atribuir responsável</span>
                )}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs">Visão Geral</TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs">
            Contatos {contacts.length > 0 && <span className="ml-1 text-[10px] bg-muted px-1.5 rounded-full">{contacts.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="activities" className="text-xs">
            Histórico {activities.length > 0 && <span className="ml-1 text-[10px] bg-muted px-1.5 rounded-full">{activities.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Overview ─────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* ── Coluna 1: Objetivos e Briefing (editável) ── */}
            <Card className="border-border shadow-sm lg:col-span-2">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#F59E0B]" /> Objetivos e Briefing
                </CardTitle>
                {!editingObjectives ? (
                  <button onClick={() => { setObjectivesInput(client.objectives ?? ''); setVoiceInput(client.voice_tone ?? ''); setEditingObjectives(true) }} className="text-[#5B8CFF] hover:bg-[#5B8CFF]/10 p-1 rounded transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={saveObjectives} disabled={savingField} className="p-1 rounded text-[#12B981] hover:bg-[#12B981]/10">
                      {savingField ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditingObjectives(false)} className="p-1 rounded text-muted-foreground hover:bg-muted">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {editingObjectives ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Objetivo principal</Label>
                      <Textarea value={objectivesInput} onChange={e => setObjectivesInput(e.target.value)} placeholder="Qual o objetivo principal deste cliente?" className="text-sm min-h-[80px] resize-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Tom de voz / Briefing</Label>
                      <Textarea value={voiceInput} onChange={e => setVoiceInput(e.target.value)} placeholder="Como falar com este cliente? Notas de briefing..." className="text-sm min-h-[60px] resize-none" />
                    </div>
                  </>
                ) : (
                  <>
                    {client.objectives ? (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                          <Target className="w-3 h-3" /> Objetivo principal
                        </p>
                        <p className="text-foreground leading-relaxed">{client.objectives}</p>
                      </div>
                    ) : null}
                    {client.voice_tone ? (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3" /> Tom de voz / Briefing
                        </p>
                        <p className="text-foreground">{client.voice_tone}</p>
                      </div>
                    ) : null}
                    {!client.objectives && !client.voice_tone && (
                      <button onClick={() => setEditingObjectives(true)} className="w-full text-left p-4 border border-dashed border-border rounded-lg text-muted-foreground text-xs hover:bg-muted/40 hover:border-[#5B8CFF]/40 hover:text-foreground transition-colors">
                        + Clique para adicionar objetivos e briefing
                      </button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Coluna 2: Atividade Recente (últimas 3) ── */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#F59E0B]" /> Atividade recente
                </CardTitle>
                {activities.length > 0 && (
                  <button onClick={() => setTab('activities')} className="text-[11px] text-[#5B8CFF] hover:underline font-medium">
                    Ver tudo ({activities.length})
                  </button>
                )}
              </CardHeader>
              <CardContent className="pt-1">
                {activities.length === 0 ? (
                  <div className="text-center py-6">
                    <Zap className="w-7 h-7 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">Sem atividades ainda.</p>
                    <button onClick={() => setLogOpen(true)} className="text-[11px] text-[#5B8CFF] hover:underline mt-2">
                      + Registrar primeira
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.slice(0, 3).map(a => (
                      <div key={a.id} className="flex items-start gap-2.5 group">
                        <div className="w-7 h-7 rounded-lg bg-[#5B8CFF]/10 flex items-center justify-center text-[#5B8CFF] shrink-0 mt-0.5">
                          {ACTIVITY_ICONS[a.type ?? 'note'] ?? <FileText className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-tight truncate">{a.title ?? a.type}</p>
                          {a.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{a.description}</p>}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-muted-foreground">{timeAgo(a.created_at)}</span>
                            {a.user && <span className="text-[10px] text-muted-foreground">· {a.user.full_name?.split(' ')[0]}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Empresa (full width) ── */}
            <Card className="border-border shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#5B8CFF]" /> Informações da empresa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {[
                    { icon: Building2, label: 'CNPJ', value: client.cnpj, mono: true },
                    { icon: Globe, label: 'Website', value: client.website },
                    { icon: Mail, label: 'E-mail', value: client.email },
                    { icon: Phone, label: 'Telefone', value: client.phone },
                    { icon: Building2, label: 'Cidade', value: client.city ? `${client.city}${client.state ? ` — ${client.state}` : ''}` : null },
                    { icon: Calendar, label: 'Início do contrato', value: formatDate(client.contract_since) },
                    { icon: Calendar, label: 'Término do contrato', value: formatDate(client.contract_end) },
                    { icon: Briefcase, label: 'Setor', value: client.sector },
                  ].map(f => {
                    const Icon = f.icon
                    const hasValue = f.value && f.value !== '—'
                    return (
                      <div key={f.label} className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{f.label}</p>
                          <p className={cn('font-medium text-sm truncate mt-0.5', !hasValue && 'text-muted-foreground/40 italic font-normal', f.mono && 'font-mono text-xs')}>
                            {hasValue ? f.value : '—'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {client.observations && (
                  <div className={cn(
                    'mt-4 p-3 rounded-lg text-xs leading-relaxed',
                    client.observations.toLowerCase().match(/alerta|urgente/)
                      ? 'bg-red-500/8 text-red-600 border border-red-500/20'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {client.observations.toLowerCase().match(/alerta|urgente/) && (
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                    )}
                    {client.observations}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Serviços contratados (editáveis) ── */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#8B5CF6]" /> Serviços contratados
                </CardTitle>
                {!editingServices ? (
                  <button onClick={() => { setServicesInput(client.services ?? []); setEditingServices(true) }} className="text-[#5B8CFF] hover:bg-[#5B8CFF]/10 p-1 rounded transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={saveServices} disabled={savingField} className="p-1 rounded text-[#12B981] hover:bg-[#12B981]/10">
                      {savingField ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditingServices(false)} className="p-1 rounded text-muted-foreground hover:bg-muted">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-1">
                {editingServices ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_SERVICES.map(s => {
                        const selected = servicesInput.includes(s)
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleService(s)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors',
                              selected
                                ? 'bg-[#8B5CF6]/10 border-[#8B5CF6] text-[#8B5CF6]'
                                : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                            )}
                          >
                            {selected && <Check className="w-2.5 h-2.5 inline mr-0.5" />}
                            {s}
                          </button>
                        )
                      })}
                    </div>
                    {/* Custom services already selected */}
                    {servicesInput.filter(s => !ALL_SERVICES.includes(s)).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {servicesInput.filter(s => !ALL_SERVICES.includes(s)).map(s => (
                          <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30">
                            {s}
                            <button type="button" onClick={() => toggleService(s)} className="hover:bg-[#8B5CF6]/20 rounded-full p-0.5">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Input for custom service */}
                    <div className="flex gap-1.5">
                      <Input
                        value={customService}
                        onChange={e => setCustomService(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomService() } }}
                        placeholder="Adicionar serviço personalizado..."
                        className="h-7 text-xs flex-1"
                      />
                      <Button type="button" size="sm" variant="outline" onClick={addCustomService} disabled={!customService.trim()} className="h-7 px-2 text-xs gap-1 shrink-0">
                        <Plus className="w-3 h-3" /> Add
                      </Button>
                    </div>
                  </div>
                ) : client.services && client.services.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {client.services.map(s => (
                      <Badge key={s} className="text-[11px] bg-[#8B5CF6]/10 text-[#8B5CF6] border-0 font-semibold">{s}</Badge>
                    ))}
                  </div>
                ) : (
                  <button onClick={() => setEditingServices(true)} className="w-full text-left p-3 border border-dashed border-border rounded-lg text-muted-foreground text-xs hover:bg-muted/40 hover:border-[#5B8CFF]/40 hover:text-foreground transition-colors">
                    + Clique para adicionar serviços
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab: Contacts ─────────────────────────────────── */}
        <TabsContent value="contacts" className="mt-4">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Contatos do cliente</CardTitle>
              <Button size="sm" className="h-7 gap-1.5 text-xs bg-[#5B8CFF] hover:bg-[#4a7aee] text-white" onClick={() => setAddContactOpen(true)}>
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {contacts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="w-10 h-10 mx-auto mb-3 opacity-25" />
                  <p className="text-sm">Nenhum contato adicionado.</p>
                  <Button size="sm" className="mt-3 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-xs" onClick={() => setAddContactOpen(true)}>
                    Adicionar contato
                  </Button>
                </div>
              ) : (
                <AnimatePresence>
                  {contacts.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: avatarBg(c.name ?? 'C') }}
                      >
                        {(c.name ?? 'C').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{c.name}</p>
                          {c.is_primary && <Badge className="text-[10px] bg-[#5B8CFF]/10 text-[#5B8CFF] border-0">Principal</Badge>}
                        </div>
                        {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
                        <div className="flex flex-wrap gap-3 mt-1">
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {c.email}
                            </a>
                          )}
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {c.phone}
                            </a>
                          )}
                          {c.whatsapp && (
                            <a
                              href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#25D366] hover:underline flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" /> WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {c.email && (
                          <a href={`mailto:${c.email}`}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Mail className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}
                        {c.whatsapp && (
                          <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[#25D366]">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                          onClick={() => deleteContact(c.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Activities ───────────────────────────────── */}
        <TabsContent value="activities" className="mt-4">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Histórico de atividades</CardTitle>
              <Button size="sm" className="h-7 gap-1.5 text-xs bg-[#5B8CFF] hover:bg-[#4a7aee] text-white" onClick={() => setLogOpen(true)}>
                <Plus className="w-3 h-3" /> Registrar
              </Button>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-25" />
                  <p className="text-sm">Nenhuma atividade registrada.</p>
                  <Button size="sm" className="mt-3 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-xs" onClick={() => setLogOpen(true)}>
                    Registrar atividade
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-5 ml-9">
                    {activities.map((a, i) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="relative"
                      >
                        <div className="absolute -left-[30px] w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-muted-foreground">
                          {ACTIVITY_ICONS[a.type ?? 'note'] ?? <FileText className="w-3 h-3" />}
                        </div>
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm">{a.title ?? a.type}</p>
                            <Badge variant="outline" className="text-[10px] shrink-0">{a.type}</Badge>
                          </div>
                          {a.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{a.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                            {a.user?.full_name && (
                              <>
                                <span className="font-medium">{a.user.full_name.split(' ')[0]}</span>
                                <span>·</span>
                              </>
                            )}
                            <span>{timeAgo(a.created_at)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Modals */}
      <LogActivityModal
        clientId={client.id}
        open={logOpen}
        onClose={() => setLogOpen(false)}
        onSaved={a => setActivities(prev => [a, ...prev])}
      />
      <AddContactModal
        clientId={client.id}
        open={addContactOpen}
        onClose={() => setAddContactOpen(false)}
        onSaved={c => setContacts(prev => [c, ...prev])}
      />

      {/* Transfer ownership dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#0EA5E9]" /> Transferir cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
              <span className="text-xs font-semibold text-muted-foreground">DE</span>
              {client.responsible ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={client.responsible.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px] text-white" style={{ background: '#5B8CFF' }}>
                      {(client.responsible.full_name ?? 'U').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{client.responsible.full_name}</span>
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
                  {users.filter(u => u.id !== client.responsible_id).map(u => (
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
                disabled={transferring || !transferTo || transferTo === client.responsible_id}
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
