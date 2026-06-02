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
  ArrowLeft, Globe, Mail, Phone, Building2, Calendar,
  User, Target, MessageSquare, AlertTriangle, FileText,
  CheckSquare, Clock, ExternalLink, Plus, Trash2,
  Layers, Send, Eye, MessageCircle, Zap,
  Star, Shield, Copy, Check, Camera, Briefcase, Users,
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

function healthColor(score: number) {
  if (score >= 70) return '#12B981'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
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
  client: Client & { responsible: { id: string; full_name: string | null; avatar_url: string | null } | null }
  contacts: ClientContact[]
  activities: Array<Activity & { user: { full_name: string | null; avatar_url: string | null } | null }>
  approvals: Array<Pick<Approval, 'id' | 'title' | 'status' | 'due_date' | 'channel' | 'type' | 'created_at'>>
  contentItems: Array<Pick<ContentItem, 'id' | 'title' | 'status' | 'channel' | 'scheduled_date' | 'created_at'>>
  conversations: Array<Pick<Conversation, 'id' | 'channel' | 'status' | 'last_message' | 'created_at'>>
}

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
}: ClientProfileProps) {
  const [tab, setTab] = useState('overview')
  const [client] = useState(initialClient)
  const [contacts, setContacts] = useState(initialContacts)
  const [activities, setActivities] = useState(initialActivities)
  const [logOpen, setLogOpen] = useState(false)
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const deleteContact = async (id: string) => {
    const supabase = createClient()
    await supabase.from('client_contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
    toast.success('Contato removido')
  }

  const copyPortalLink = () => {
    const link = `${window.location.origin}/portal/${client.id}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  const pendingApprovals = approvals.filter(a => a.status === 'pending').length
  const publishedContent = contentItems.filter(c => c.status === 'published').length
  const openConversations = conversations.filter(c => c.status === 'open').length

  const kpis = [
    { label: 'MRR', value: `R$ ${(client.mrr ?? 0).toLocaleString('pt-BR')}`, color: '#5B8CFF' },
    { label: 'Health Score', value: `${client.health_score}%`, color: healthColor(client.health_score) },
    { label: 'Aprovações', value: `${pendingApprovals} pendentes`, color: pendingApprovals > 0 ? '#F59E0B' : '#12B981' },
    { label: 'Conteúdos', value: `${publishedContent} publicados`, color: '#8B5CF6' },
    { label: 'Contrato', value: formatDate(client.contract_since), color: undefined },
    { label: 'Responsável', value: client.responsible?.full_name?.split(' ')[0] ?? '—', color: undefined },
  ]

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Breadcrumb */}
      <Link href="/crm" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para clientes
      </Link>

      {/* Header card */}
      <Card className="border-border shadow-none">
        <CardContent className="pt-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0"
              style={{ backgroundColor: avatarBg(client.name) }}
            >
              {client.name.slice(0, 2).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold">{client.name}</h1>
                <Badge className={cn('text-xs border', STATUS_COLORS[client.status] ?? STATUS_COLORS['Inativo'])}>
                  {client.status}
                </Badge>
                {client.health_score < 50 && (
                  <Badge className="text-xs bg-red-500/10 text-red-500 border-red-500/20 gap-1">
                    <AlertTriangle className="w-3 h-3" /> Em risco
                  </Badge>
                )}
                {pendingApprovals > 0 && (
                  <Badge className="text-xs bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 gap-1">
                    <Clock className="w-3 h-3" /> {pendingApprovals} aprovações pendentes
                  </Badge>
                )}
              </div>

              {client.sector && <p className="text-sm text-muted-foreground mt-0.5">{client.sector}</p>}

              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                {client.website && (
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#5B8CFF] hover:underline">
                    <Globe className="w-3.5 h-3.5" /> {client.website.replace(/https?:\/\//, '')}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                    <Mail className="w-3.5 h-3.5" /> {client.email}
                  </a>
                )}
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                    <Phone className="w-3.5 h-3.5" /> {client.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0 flex-wrap justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setLogOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Atividade
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={copyPortalLink}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Portal
              </Button>
              {client.phone && (
                <a
                  href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" className="bg-[#25D366] hover:bg-[#1ebe5a] text-white gap-1.5 text-xs">
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </Button>
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`}>
                  <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-xs">
                    <Send className="w-3.5 h-3.5" /> E-mail
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* KPI bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-5 pt-4 border-t border-border">
            {kpis.map(k => (
              <div key={k.label}>
                <p className="text-[11px] text-muted-foreground">{k.label}</p>
                <p className="font-bold text-sm mt-0.5" style={k.color ? { color: k.color } : undefined}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Services */}
          {client.services && client.services.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {client.services.map(s => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
            </div>
          )}
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
          <TabsTrigger value="approvals" className="text-xs">
            Aprovações {pendingApprovals > 0 && <span className="ml-1 text-[10px] bg-[#F59E0B]/20 text-[#F59E0B] px-1.5 rounded-full">{pendingApprovals}</span>}
          </TabsTrigger>
          <TabsTrigger value="content" className="text-xs">Conteúdo</TabsTrigger>
          <TabsTrigger value="portal" className="text-xs">Portal</TabsTrigger>
        </TabsList>

        {/* ── Tab: Overview ─────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Health Score gauge */}
            <Card className="border-border shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#5B8CFF]" /> Health Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-bold tabular-nums" style={{ color: healthColor(client.health_score) }}>
                    {client.health_score}
                  </span>
                  <span className="text-muted-foreground text-sm mb-1.5">/ 100</span>
                  <div className="ml-auto flex flex-col items-end gap-1">
                    {[
                      { label: 'Aprovações', val: approvals.length, color: '#F59E0B' },
                      { label: 'Conteúdos', val: contentItems.length, color: '#5B8CFF' },
                      { label: 'Conversas', val: openConversations, color: '#12B981' },
                    ].map(m => (
                      <div key={m.label} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{m.label}</span>
                        <span className="font-bold" style={{ color: m.color }}>{m.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Progress value={client.health_score} className="h-2.5 bg-muted" style={{ '--progress-color': healthColor(client.health_score) } as React.CSSProperties} />
                <div className="flex gap-2">
                  {[
                    { min: 0, max: 40, label: 'Crítico', color: '#EF4444' },
                    { min: 40, max: 70, label: 'Atenção', color: '#F59E0B' },
                    { min: 70, max: 100, label: 'Saudável', color: '#12B981' },
                  ].map(z => (
                    <div
                      key={z.label}
                      className={cn(
                        'flex-1 text-center text-[10px] font-semibold py-1 rounded-md',
                        client.health_score >= z.min && client.health_score < z.max
                          ? 'text-white'
                          : 'text-muted-foreground bg-muted'
                      )}
                      style={client.health_score >= z.min && client.health_score < z.max
                        ? { backgroundColor: z.color }
                        : undefined}
                    >
                      {z.label}
                    </div>
                  ))}
                  {client.health_score >= 70 && (
                    <div className="flex-1 text-center text-[10px] font-semibold py-1 rounded-md text-white" style={{ backgroundColor: '#12B981' }}>
                      Saudável
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {client.health_score >= 70
                    ? '✅ Cliente saudável e engajado. Continue o bom trabalho!'
                    : client.health_score >= 40
                    ? '⚠️ Atenção: o cliente pode precisar de reengajamento.'
                    : '🚨 Cliente em risco — agende uma reunião urgente!'}
                </p>
              </CardContent>
            </Card>

            {/* Objectives + Voice tone */}
            <Card className="border-border shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#F59E0B]" /> Objetivos e Briefing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {client.objectives && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-1 flex items-center gap-1.5">
                      <Target className="w-3 h-3" /> Objetivo
                    </p>
                    <p className="text-foreground leading-relaxed">{client.objectives}</p>
                  </div>
                )}
                {client.voice_tone && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-1 flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" /> Tom de Voz
                    </p>
                    <p className="text-foreground">{client.voice_tone}</p>
                  </div>
                )}
                {client.observations && (
                  <div className={cn(
                    'p-2.5 rounded-lg text-xs leading-relaxed',
                    client.observations.toLowerCase().includes('alerta') || client.observations.toLowerCase().includes('urgente')
                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {(client.observations.toLowerCase().includes('alerta') || client.observations.toLowerCase().includes('urgente')) && (
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                    )}
                    {client.observations}
                  </div>
                )}
                {!client.objectives && !client.voice_tone && !client.observations && (
                  <p className="text-muted-foreground text-xs">Nenhuma informação adicionada.</p>
                )}
              </CardContent>
            </Card>

            {/* Company info */}
            <Card className="border-border shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" /> Informações da empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                {[
                  { icon: Building2, label: 'CNPJ', value: client.cnpj },
                  { icon: Globe, label: 'Website', value: client.website },
                  { icon: Mail, label: 'E-mail', value: client.email },
                  { icon: Phone, label: 'Telefone', value: client.phone },
                  { icon: Building2, label: 'Cidade', value: client.city ? `${client.city}${client.state ? ` — ${client.state}` : ''}` : null },
                  { icon: Calendar, label: 'Início do contrato', value: formatDate(client.contract_since) },
                  { icon: Calendar, label: 'Término do contrato', value: formatDate(client.contract_end) },
                ].filter(f => f.value && f.value !== '—').map(f => {
                  const Icon = f.icon
                  return (
                    <div key={f.label} className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground w-32 shrink-0 text-xs">{f.label}</span>
                      <span className="font-medium truncate text-sm">{f.value}</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Responsible + Recent activity */}
            <div className="space-y-4">
              {client.responsible && (
                <Card className="border-border shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" /> Responsável
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={client.responsible.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-[#5B8CFF] text-white text-sm">
                          {(client.responsible.full_name ?? 'U').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{client.responsible.full_name}</p>
                        <p className="text-xs text-muted-foreground">Gestor de conta</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Activity snapshot */}
              <Card className="border-border shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#F59E0B]" /> Atividade Recente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Nenhuma atividade registrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {activities.slice(0, 3).map(a => (
                        <div key={a.id} className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                            {ACTIVITY_ICONS[a.type ?? 'note'] ?? <FileText className="w-3 h-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{a.title ?? a.type}</p>
                            <p className="text-[10px] text-muted-foreground">{timeAgo(a.created_at)}</p>
                          </div>
                        </div>
                      ))}
                      {activities.length > 3 && (
                        <button
                          onClick={() => setTab('activities')}
                          className="text-[11px] text-[#5B8CFF] hover:underline"
                        >
                          Ver mais {activities.length - 3} atividades →
                        </button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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

        {/* ── Tab: Approvals ────────────────────────────────── */}
        <TabsContent value="approvals" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{approvals.length} aprovações no total</p>
              <Link href="/aprovacoes">
                <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
                  <ExternalLink className="w-3 h-3" /> Ver todas
                </Button>
              </Link>
            </div>
            {approvals.length === 0 ? (
              <Card className="border-border shadow-none">
                <CardContent className="text-center py-12 text-muted-foreground">
                  <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-25" />
                  <p className="text-sm">Nenhuma aprovação encontrada.</p>
                </CardContent>
              </Card>
            ) : (
              approvals.map((a, i) => {
                const s = APPROVAL_STATUS[a.status] ?? { label: a.status, color: '#6B7280' }
                const isOverdue = a.due_date && new Date(a.due_date) < new Date() && a.status === 'pending'
                return (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className={cn('border-border shadow-none', isOverdue && 'border-red-500/30 bg-red-500/5')}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.color}15` }}>
                            {CHANNEL_ICONS[a.channel ?? ''] ?? <Layers className="w-4 h-4" style={{ color: s.color }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{a.title}</p>
                              <Badge className="text-[10px] border-0" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                                {s.label}
                              </Badge>
                              {isOverdue && (
                                <Badge className="text-[10px] bg-red-500/10 text-red-500 border-0">
                                  <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Atrasado
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                              {a.channel && <span className="capitalize">{a.channel}</span>}
                              {a.type && <><span>·</span><span>{a.type}</span></>}
                              {a.due_date && <><span>·</span><span>Prazo: {formatDate(a.due_date)}</span></>}
                              <span>·</span>
                              <span>{formatDate(a.created_at)}</span>
                            </div>
                          </div>
                          <Link href={`/aprovacoes/${a.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* ── Tab: Content ──────────────────────────────────── */}
        <TabsContent value="content" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{contentItems.length} conteúdos</p>
              <Link href="/planner">
                <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
                  <ExternalLink className="w-3 h-3" /> Ver planner
                </Button>
              </Link>
            </div>
            {contentItems.length === 0 ? (
              <Card className="border-border shadow-none">
                <CardContent className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-25" />
                  <p className="text-sm">Nenhum conteúdo encontrado.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contentItems.map((c, i) => {
                  const s = CONTENT_STATUS[c.status] ?? { label: c.status, color: '#6B7280' }
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Card className="border-border shadow-none">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              {CHANNEL_ICONS[c.channel ?? ''] ?? <Layers className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">{c.title ?? 'Sem título'}</p>
                                <Badge className="text-[10px] border-0 shrink-0" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                                  {s.label}
                                </Badge>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                                {c.channel && <span className="capitalize">{c.channel}</span>}
                                {c.scheduled_date && <><span>·</span><span>{formatDate(c.scheduled_date)}</span></>}
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
          </div>
        </TabsContent>

        {/* ── Tab: Portal ───────────────────────────────────── */}
        <TabsContent value="portal" className="mt-4 space-y-4">
          {/* Portal status */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-[#5B8CFF]" /> Portal do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-semibold">Status do portal</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {client.portal_enabled
                      ? 'Portal ativo — o cliente pode acessar aprovações e conteúdos'
                      : 'Portal desativado — clique para ativar'}
                  </p>
                </div>
                <Badge
                  className={cn(
                    'text-xs border',
                    client.portal_enabled
                      ? 'bg-[#12B981]/10 text-[#12B981] border-[#12B981]/20'
                      : 'bg-muted text-muted-foreground border-border'
                  )}
                >
                  {client.portal_enabled ? '● Ativo' : '○ Inativo'}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Link do portal</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`/portal/${client.id}`}
                    className="h-9 text-sm font-mono bg-muted"
                  />
                  <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs shrink-0" onClick={copyPortalLink}>
                    {copied ? <Check className="w-3.5 h-3.5 text-[#12B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                  <a href={`/portal/${client.id}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs">
                      <Eye className="w-3.5 h-3.5" /> Abrir
                    </Button>
                  </a>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Aprovações', value: approvals.length, icon: CheckSquare, color: '#F59E0B' },
                  { label: 'Pendentes', value: pendingApprovals, icon: Clock, color: '#EF4444' },
                  { label: 'Conversas', value: conversations.length, icon: MessageCircle, color: '#5B8CFF' },
                ].map(s => {
                  const Icon = s.icon
                  return (
                    <div key={s.label} className="text-center p-3 rounded-lg border border-border">
                      <Icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: s.color }} />
                      <p className="text-xl font-bold">{s.value}</p>
                      <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Conversations */}
          {conversations.length > 0 && (
            <Card className="border-border shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#5B8CFF]" /> Conversas recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {conversations.map((conv, i) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {CHANNEL_ICONS[conv.channel] ?? <MessageSquare className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{conv.channel}</span>
                        <Badge
                          className={cn(
                            'text-[10px] border-0',
                            conv.status === 'open'
                              ? 'bg-[#12B981]/10 text-[#12B981]'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {conv.status === 'open' ? 'Aberto' : 'Fechado'}
                        </Badge>
                      </div>
                      {conv.last_message && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                      )}
                    </div>
                    <Link href={`/atendimento?conversation=${conv.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          )}
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
    </div>
  )
}
