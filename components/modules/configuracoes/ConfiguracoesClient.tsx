'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  User, Users, Bell, Shield, LogOut, Plus, Mail,
  Kanban, Trash2, GripVertical, Link2, Tag, Shuffle,
  Building2, Edit3, Check, X, ChevronDown, ChevronRight, RotateCcw,
  Camera, Loader2, Copy, Search, Eye, EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { AppUser } from '@/types/database'
import { ColorPicker } from '@/components/common/ColorPicker'
import { Textarea } from '@/components/ui/textarea'
import { NotificationPrefsPanel } from './NotificationPrefsPanel'

type OrgUser = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  permission: string
  is_active: boolean
  avatar_url: string | null
  created_at: string
}

const PERMISSION_CONFIG: Record<string, { label: string; color: string }> = {
  Admin:        { label: 'Admin',        color: '#e1493c' },
  Gestor:       { label: 'Gestor',       color: '#8B5CF6' },
  Vendedor:     { label: 'Vendedor',     color: '#5B8CFF' },
  Colaborador:  { label: 'Colaborador',  color: '#12B981' },
  Visualizador: { label: 'Visualizador', color: '#6B7280' },
}

const PERMISSION_DESCRIPTIONS: Record<string, { title: string; items: string[] }> = {
  Admin: {
    title: 'Acesso total ao sistema',
    items: [
      'Convida e remove membros, define permissões',
      'Acessa todos os funis, clientes e leads',
      'Configura integrações, white label, SMTP e IA',
      'Visualiza relatórios, metas e financeiro',
      'Exclui registros e gerencia o plano',
    ],
  },
  Gestor: {
    title: 'Gestão de equipe e comercial',
    items: [
      'Acessa todos os funis, leads e clientes',
      'Distribui leads entre vendedores',
      'Visualiza relatórios da equipe',
      'Convida novos membros (não Admin)',
      'Sem acesso a billing, white label ou integrações',
    ],
  },
  Vendedor: {
    title: 'Comercial — foco em vendas',
    items: [
      'Trabalha o pipeline e CRM dos seus próprios leads',
      'Cria, edita e move leads/clientes',
      'Envia e-mails e registra atividades',
      'Visualiza apenas leads dos funis em que está atribuído',
      'Não convida membros nem mexe em configurações',
    ],
  },
  Colaborador: {
    title: 'Operacional — suporte aos times',
    items: [
      'Acessa leads e clientes atribuídos a si',
      'Registra atividades, notas e arquivos',
      'Sem permissão pra excluir registros',
      'Não vê relatórios financeiros',
      'Ideal pra assistentes, SDRs, suporte',
    ],
  },
  Visualizador: {
    title: 'Somente leitura',
    items: [
      'Visualiza pipeline, leads, clientes e relatórios',
      'Não pode criar, editar ou excluir nada',
      'Ideal para sócios, diretores e auditores',
      'Não acessa configurações administrativas',
    ],
  },
}

interface FunnelStage {
  id: string
  funnel_id: string | null
  name: string
  color: string
  order_index: number
  description: string | null
}

interface Funnel {
  id: string
  name: string
  description: string | null
  is_default: boolean
  is_hidden: boolean
  stages: FunnelStage[]
  user_ids: string[]
}

interface LeadTag {
  id: string
  name: string
  color: string
}

interface Segment {
  id: string
  name: string
  color: string
}

const STAGE_PALETTE = ['#5B8CFF', '#12B981', '#F59E0B', '#8B5CF6', '#e1493c', '#06B6D4', '#F97316', '#EC4899', '#14B8A6', '#6B7280']

const LOCAL_TAGS_KEY = 'cyclo_lead_tags'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn('w-10 h-5.5 rounded-full relative transition-colors shrink-0', checked ? 'bg-[#5B8CFF]' : 'bg-border')}
      style={{ width: 40, height: 22 }}
    >
      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all', checked ? 'left-5' : 'left-0.5')} />
    </button>
  )
}

interface Props {
  appUser: AppUser | null
  orgUsers: OrgUser[]
}

export function ConfiguracoesClient({ appUser, orgUsers: initialUsers }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'perfil' | 'equipe' | 'funis' | 'tags' | 'distribuicao' | 'segmentos' | 'notificacoes' | 'seguranca'>('perfil')

  // --- Funnels (Supabase) ---
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [loadingFunnels, setLoadingFunnels] = useState(false)
  const [showNewFunnel, setShowNewFunnel] = useState(false)
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null)
  const [newFunnelName, setNewFunnelName] = useState('')
  const [newFunnelDesc, setNewFunnelDesc] = useState('')
  const [newFunnelDefault, setNewFunnelDefault] = useState(false)
  const [newFunnelUserIds, setNewFunnelUserIds] = useState<string[]>([])
  const [funnelFilter, setFunnelFilter] = useState('')
  const [stageInputByFunnel, setStageInputByFunnel] = useState<Record<string, string>>({})
  const [editingStage, setEditingStage] = useState<{ funnelId: string; stage: FunnelStage } | null>(null)
  const [savingFunnel, setSavingFunnel] = useState(false)
  const [funnelsLoaded, setFunnelsLoaded] = useState(false)

  // --- Tags ---
  const [tags, setTags] = useState<LeadTag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#5B8CFF')

  // --- Segments (Supabase) ---
  const [segments, setSegments] = useState<Segment[]>([])
  const [loadingSegments, setLoadingSegments] = useState(false)
  const [newSegmentName, setNewSegmentName] = useState('')
  const [newSegmentColor, setNewSegmentColor] = useState('#5B8CFF')

  // --- Rotation (Supabase) ---
  const [rotationEnabled, setRotationEnabled] = useState(false)
  const [rotationUserIds, setRotationUserIds] = useState<string[]>([])
  const [savingRotation, setSavingRotation] = useState(false)
  const [rotationLoaded, setRotationLoaded] = useState(false)

  // --- Other ---
  const [orgUsers, setOrgUsers] = useState(initialUsers)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [fullName, setFullName] = useState(appUser?.full_name ?? '')
  const [role, setRole] = useState(appUser?.role ?? '')
  const [emailSignature, setEmailSignature] = useState<string>(
    (appUser as { email_signature?: string | null } | null)?.email_signature ?? ''
  )
  const [signatureImage, setSignatureImage] = useState<string>(
    (appUser as { email_signature_image?: string | null } | null)?.email_signature_image ?? ''
  )
  const [uploadingSigImage, setUploadingSigImage] = useState(false)
  const sigImageInputRef = useRef<HTMLInputElement>(null)
  const [savingSignature, setSavingSignature] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [invitePermission, setInvitePermission] = useState('Vendedor')
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ url: string; emailSent: boolean } | null>(null)
  const [avatarUrl, setAvatarUrl] = useState(appUser?.avatar_url ?? '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Load tags from localStorage
  useEffect(() => {
    try {
      const t = localStorage.getItem(LOCAL_TAGS_KEY)
      if (t) setTags(JSON.parse(t))
    } catch {}
  }, [])

  const saveTags = (updated: LeadTag[]) => {
    setTags(updated)
    localStorage.setItem(LOCAL_TAGS_KEY, JSON.stringify(updated))
  }

  const loadFunnels = async () => {
    if (funnelsLoaded) return
    setLoadingFunnels(true)
    const supabase = createClient()
    const [{ data: funnelRows }, { data: stageRows }, { data: fuRows }] = await Promise.all([
      supabase.from('funnels').select('*').order('created_at'),
      supabase.from('pipeline_stages').select('*').order('order_index'),
      supabase.from('funnel_users').select('funnel_id, user_id'),
    ])
    const built: Funnel[] = (funnelRows ?? []).map(f => ({
      id: f.id,
      name: f.name,
      description: f.description,
      is_default: f.is_default,
      is_hidden: (f as { is_hidden?: boolean }).is_hidden ?? false,
      stages: (stageRows ?? []).filter(s => s.funnel_id === f.id),
      user_ids: (fuRows ?? []).filter(fu => fu.funnel_id === f.id).map(fu => fu.user_id),
    }))
    setFunnels(built)
    setFunnelsLoaded(true)
    setLoadingFunnels(false)
  }

  const loadSegments = async () => {
    setLoadingSegments(true)
    const supabase = createClient()
    const { data } = await supabase.from('segments').select('*').order('name')
    setSegments((data ?? []).map(s => ({ id: s.id, name: s.name, color: s.color })))
    setLoadingSegments(false)
  }

  const loadRotation = async () => {
    if (rotationLoaded) return
    const supabase = createClient()
    const { data } = await supabase.from('lead_rotation_config').select('*').maybeSingle()
    if (data) {
      setRotationEnabled(data.enabled)
      setRotationUserIds(data.user_ids ?? [])
    }
    setRotationLoaded(true)
  }

  const createFunnel = async () => {
    if (!newFunnelName.trim()) return
    setSavingFunnel(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { toast.error('Org não encontrada'); setSavingFunnel(false); return }
    const { data: f, error } = await supabase.from('funnels').insert({
      organization_id: me.organization_id,
      name: newFunnelName.trim(),
      description: newFunnelDesc || null,
      is_default: newFunnelDefault,
    }).select().single()
    if (error || !f) { toast.error('Erro ao criar funil'); setSavingFunnel(false); return }
    const userIdsToInsert = newFunnelUserIds.length > 0 ? newFunnelUserIds : orgUsers.map(u => u.id)
    if (userIdsToInsert.length > 0) {
      await supabase.from('funnel_users').insert(userIdsToInsert.map(uid => ({ funnel_id: f.id, user_id: uid })))
    }
    const newF: Funnel = { id: f.id, name: f.name, description: f.description, is_default: f.is_default, is_hidden: false, stages: [], user_ids: userIdsToInsert }
    setFunnels(prev => [...prev, newF])
    setNewFunnelName(''); setNewFunnelDesc(''); setNewFunnelDefault(false); setNewFunnelUserIds([])
    setShowNewFunnel(false)
    setSavingFunnel(false)
    toast.success(`Funil "${f.name}" criado!`)
  }

  const updateFunnel = async (updated: Funnel) => {
    setSavingFunnel(true)
    const supabase = createClient()
    const { error } = await supabase.from('funnels').update({
      name: updated.name, description: updated.description, is_default: updated.is_default,
    }).eq('id', updated.id)
    if (error) { toast.error('Erro ao atualizar funil'); setSavingFunnel(false); return }
    await supabase.from('funnel_users').delete().eq('funnel_id', updated.id)
    if (updated.user_ids.length > 0) {
      await supabase.from('funnel_users').insert(updated.user_ids.map(uid => ({ funnel_id: updated.id, user_id: uid })))
    }
    setFunnels(prev => prev.map(f => f.id === updated.id ? updated : f))
    setEditingFunnel(null)
    setSavingFunnel(false)
    toast.success('Funil atualizado!')
  }

  const deleteFunnel = async (id: string) => {
    const f = funnels.find(x => x.id === id)
    if (!f) return
    if (!confirm(`Excluir o funil "${f.name}"? Todas as etapas e leads vinculados perderão a referência.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('funnels').delete().eq('id', id)
    if (error) { toast.error('Erro ao remover funil'); return }
    setFunnels(prev => prev.filter(f => f.id !== id))
    toast.success('Funil removido')
  }

  const toggleFunnelHidden = async (id: string) => {
    const f = funnels.find(x => x.id === id)
    if (!f) return
    const next = !f.is_hidden
    const supabase = createClient()
    const { error } = await supabase.from('funnels').update({ is_hidden: next }).eq('id', id)
    if (error) { toast.error('Erro ao atualizar visibilidade'); return }
    setFunnels(prev => prev.map(x => x.id === id ? { ...x, is_hidden: next } : x))
    toast.success(next ? `Funil "${f.name}" ocultado do Pipeline` : `Funil "${f.name}" visível no Pipeline`)
    router.refresh()
  }

  const addFunnelStage = async (funnelId: string, stageName?: string) => {
    const name = (stageName ?? stageInputByFunnel[funnelId] ?? '').trim()
    if (!name) return
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) return
    const funnel = funnels.find(f => f.id === funnelId)
    const nextOrder = funnel ? (funnel.stages.length > 0 ? Math.max(...funnel.stages.map(s => s.order_index)) + 1 : 0) : 0
    const { data, error } = await supabase.from('pipeline_stages').insert({
      organization_id: me.organization_id,
      funnel_id: funnelId,
      name,
      color: '#5B8CFF',
      order_index: nextOrder,
    }).select().single()
    if (error || !data) { toast.error('Erro ao criar etapa'); return }
    const newStage: FunnelStage = { id: data.id, funnel_id: funnelId, name: data.name, color: data.color, order_index: data.order_index, description: data.description }
    setFunnels(prev => prev.map(f => f.id === funnelId ? { ...f, stages: [...f.stages, newStage] } : f))
    setStageInputByFunnel(prev => ({ ...prev, [funnelId]: '' }))
    toast.success(`Etapa "${name}" adicionada!`)
  }

  const updateFunnelStage = async (funnelId: string, updatedStage: FunnelStage) => {
    const supabase = createClient()
    const { error } = await supabase.from('pipeline_stages').update({
      name: updatedStage.name, color: updatedStage.color, description: updatedStage.description,
    }).eq('id', updatedStage.id)
    if (error) { toast.error('Erro ao atualizar etapa'); return }
    setFunnels(prev => prev.map(f => f.id === funnelId ? { ...f, stages: f.stages.map(s => s.id === updatedStage.id ? updatedStage : s) } : f))
    setEditingStage(null)
    toast.success('Etapa atualizada!')
  }

  const deleteFunnelStage = async (funnelId: string, stageId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('pipeline_stages').delete().eq('id', stageId)
    if (error) { toast.error('Erro ao remover etapa'); return }
    setFunnels(prev => prev.map(f => f.id === funnelId ? { ...f, stages: f.stages.filter(s => s.id !== stageId) } : f))
    toast.success('Etapa removida')
  }

  const reorderFunnelStage = async (funnelId: string, stageId: string, direction: 'up' | 'down') => {
    const funnel = funnels.find(f => f.id === funnelId)
    if (!funnel) return
    const idx = funnel.stages.findIndex(s => s.id === stageId)
    const swapIdx = direction === 'down' ? idx + 1 : idx - 1
    if (swapIdx < 0 || swapIdx >= funnel.stages.length) return
    const arr = [...funnel.stages]
    ;[arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
    const reordered = arr.map((s, i) => ({ ...s, order_index: i }))
    setFunnels(prev => prev.map(f => f.id === funnelId ? { ...f, stages: reordered } : f))
    const supabase = createClient()
    await Promise.all(reordered.map(s => supabase.from('pipeline_stages').update({ order_index: s.order_index }).eq('id', s.id)))
  }

  const createSegment = async () => {
    if (!newSegmentName.trim()) return
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) return
    const { data, error } = await supabase.from('segments').insert({
      organization_id: me.organization_id, name: newSegmentName.trim(), color: newSegmentColor,
    }).select().single()
    if (error || !data) { toast.error('Erro ao criar segmento'); return }
    setSegments(prev => [...prev, { id: data.id, name: data.name, color: data.color }])
    setNewSegmentName('')
    toast.success('Segmento criado!')
  }

  const deleteSegment = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('segments').delete().eq('id', id)
    if (error) { toast.error('Erro ao remover segmento'); return }
    setSegments(prev => prev.filter(s => s.id !== id))
    toast.success('Segmento removido')
  }

  const saveRotation = async (enabled: boolean, userIds: string[]) => {
    setRotationEnabled(enabled)
    setRotationUserIds(userIds)
    setSavingRotation(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { setSavingRotation(false); return }
    await supabase.from('lead_rotation_config').upsert({
      organization_id: me.organization_id, enabled, user_ids: userIds,
    }, { onConflict: 'organization_id' })
    setSavingRotation(false)
  }

  const uploadAvatar = async (file: File) => {
    if (!appUser?.id) return
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!ALLOWED.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPEG, WEBP ou SVG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 2MB.')
      return
    }
    setUploadingAvatar(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    const orgId = me?.organization_id ?? 'org'
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const path = `${orgId}/${appUser.id}-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) {
      toast.error(`Erro no upload: ${uploadError.message}`)
      setUploadingAvatar(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithTs = `${publicUrl}?t=${Date.now()}`
    const { error: updateError } = await supabase.from('users').update({ avatar_url: urlWithTs }).eq('id', appUser.id)
    if (updateError) {
      toast.error(`Erro ao salvar foto: ${updateError.message}`)
    } else {
      setAvatarUrl(urlWithTs)
      toast.success('Foto de perfil atualizada!')
      router.refresh()
    }
    setUploadingAvatar(false)
  }

  const createTag = () => {
    if (!newTagName.trim()) return
    const tag: LeadTag = { id: crypto.randomUUID(), name: newTagName.trim(), color: newTagColor }
    saveTags([...tags, tag])
    setNewTagName('')
    toast.success('Tag criada!')
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    const supabase = createClient()
    const { error } = await supabase.from('users').update({ full_name: fullName, role }).eq('id', appUser?.id ?? '')
    if (error) { toast.error('Erro ao salvar'); setSavingProfile(false); return }
    toast.success('Perfil atualizado!')
    setSavingProfile(false)
  }

  const saveSignature = async () => {
    setSavingSignature(true)
    const supabase = createClient()
    const payload: Record<string, string | null> = {
      email_signature: emailSignature || null,
      email_signature_image: signatureImage || null,
    }
    const { error } = await supabase.from('users').update(payload as never).eq('id', appUser?.id ?? '')
    if (error) { toast.error(`Erro: ${error.message}`); setSavingSignature(false); return }
    toast.success('Assinatura salva! Será adicionada automaticamente aos seus emails.')
    setSavingSignature(false)
  }

  const uploadSignatureImage = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande. Máx 2MB.'); return }
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowed.includes(file.type)) { toast.error('Use PNG, JPEG ou WEBP'); return }
    setUploadingSigImage(true)
    const supabase = createClient()
    const ext = (file.name.split('.').pop() ?? 'png').toLowerCase()
    const path = `${appUser?.id ?? 'me'}/signature-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('signatures').upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { toast.error(`Erro no upload: ${upErr.message}`); setUploadingSigImage(false); return }
    const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(path)
    const url = `${urlData.publicUrl}?t=${Date.now()}`
    setSignatureImage(url)
    setUploadingSigImage(false)
    toast.success('Imagem carregada!')
  }

  const insertSignaturePreset = (preset: 'simple' | 'pro' | 'minimal') => {
    const name = fullName || 'Seu nome'
    const roleTxt = role || 'Sua função'
    const email = appUser?.email ?? 'seu@email.com'
    const presets = {
      simple: `${name}\n${roleTxt}\n${email}`,
      pro: `Atenciosamente,\n\n${name}\n${roleTxt}\n📧 ${email}\n📱 (11) 99999-9999\n🌐 acredyta.com.br`,
      minimal: `— ${name} · ${roleTxt}`,
    }
    setEmailSignature(presets[preset])
  }

  const inviteUser = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          full_name: inviteName.trim() || null,
          role: inviteRole.trim() || null,
          permission: invitePermission,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Falha ao convidar')

      setInviteResult({ url: body.accept_url, emailSent: body.email_sent })
      if (body.email_sent) {
        toast.success(`Convite enviado para ${inviteEmail}!`)
      } else {
        toast.warning('Convite criado, mas email não enviado. Copie o link abaixo.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setInviting(false)
    }
  }

  const closeInviteModal = () => {
    setInviteOpen(false)
    setInviteEmail('')
    setInviteName('')
    setInviteRole('')
    setInvitePermission('Vendedor')
    setInviteResult(null)
  }

  const toggleUserStatus = async (userId: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('users').update({ is_active: !current }).eq('id', userId)
    setOrgUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u))
    toast.success(!current ? 'Usuário ativado' : 'Usuário desativado')
  }

  const changeUserPermission = async (userId: string, newPermission: string) => {
    if (appUser?.permission !== 'Admin') {
      toast.error('Apenas Admins podem alterar permissões')
      return
    }
    const supabase = createClient()
    const { error } = await supabase.from('users').update({ permission: newPermission }).eq('id', userId)
    if (error) { toast.error(`Erro: ${error.message}`); return }
    setOrgUsers(prev => prev.map(u => u.id === userId ? { ...u, permission: newPermission } : u))
    toast.success('Permissão atualizada')
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const TABS: { value: 'perfil' | 'equipe' | 'funis' | 'tags' | 'distribuicao' | 'segmentos' | 'notificacoes' | 'seguranca'; label: string; Icon: React.ElementType; onSelect?: () => void }[] = [
    { value: 'perfil', label: 'Perfil', Icon: User },
    { value: 'equipe', label: 'Equipe', Icon: Users },
    { value: 'funis', label: 'Funis', Icon: Kanban, onSelect: loadFunnels },
    { value: 'tags', label: 'Tags', Icon: Tag },
    { value: 'distribuicao', label: 'Distribuição', Icon: Shuffle, onSelect: loadRotation },
    { value: 'segmentos', label: 'Segmentos', Icon: Building2, onSelect: loadSegments },
    { value: 'notificacoes', label: 'Notificações', Icon: Bell },
    { value: 'seguranca', label: 'Segurança', Icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Configurações</h2>
        <p className="text-sm text-muted-foreground">Gerencie sua conta, equipe e fluxos de venda</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-border overflow-x-auto">
        {TABS.map(({ value, label, Icon, onSelect }) => (
          <button
            key={value}
            onClick={() => { setTab(value); onSelect?.() }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
              tab === value ? 'border-[#5B8CFF] text-[#5B8CFF]' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── PERFIL ─── */}
      {tab === 'perfil' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Informações pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className="relative group cursor-pointer shrink-0"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Clique para alterar foto"
                >
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="text-white text-xl font-bold" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                      {(fullName || appUser?.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploadingAvatar
                      ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                      : <Camera className="w-5 h-5 text-white" />
                    }
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }}
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm">{fullName || 'Seu nome'}</p>
                  <p className="text-xs text-muted-foreground">{appUser?.email}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Clique na foto para alterar · Máx 2MB — PNG, JPEG, WEBP ou SVG</p>
                  <Badge className="text-[10px] mt-1 border-0" style={{ backgroundColor: `${PERMISSION_CONFIG[appUser?.permission ?? '']?.color ?? '#6B7280'}15`, color: PERMISSION_CONFIG[appUser?.permission ?? '']?.color ?? '#6B7280' }}>
                    {appUser?.permission ?? 'Usuário'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome completo</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cargo / Função</Label>
                <Input value={role} onChange={e => setRole(e.target.value)} placeholder="Ex: Diretor de Marketing" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">E-mail</Label>
                <Input value={appUser?.email ?? ''} disabled className="h-9 text-sm bg-muted/50" />
              </div>
              <Button onClick={saveProfile} disabled={savingProfile} className="text-white text-sm w-full" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                {savingProfile ? 'Salvando…' : 'Salvar perfil'}
              </Button>
            </CardContent>
          </Card>

          {/* ── Assinatura de email ── */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#5B8CFF]" />
                  Assinatura de e-mail
                </div>
                {emailSignature && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#12B981]/15 text-[#12B981]">
                    ATIVA
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[11px] text-muted-foreground -mt-1">
                Assinatura adicionada automaticamente no fim de cada email que você enviar pelo CYCLO.
              </p>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => insertSignaturePreset('minimal')} className="text-[10px] font-semibold px-2 py-1 rounded border border-border hover:border-[#5B8CFF]/40 hover:bg-[#5B8CFF]/5 transition-colors">
                  Minimalista
                </button>
                <button type="button" onClick={() => insertSignaturePreset('simple')} className="text-[10px] font-semibold px-2 py-1 rounded border border-border hover:border-[#5B8CFF]/40 hover:bg-[#5B8CFF]/5 transition-colors">
                  Simples
                </button>
                <button type="button" onClick={() => insertSignaturePreset('pro')} className="text-[10px] font-semibold px-2 py-1 rounded border border-border hover:border-[#5B8CFF]/40 hover:bg-[#5B8CFF]/5 transition-colors">
                  Profissional
                </button>
                {emailSignature && (
                  <button type="button" onClick={() => setEmailSignature('')} className="text-[10px] font-semibold px-2 py-1 rounded border border-border hover:border-red-500/40 hover:bg-red-50 hover:text-red-600 transition-colors ml-auto">
                    Limpar
                  </button>
                )}
              </div>

              <Textarea
                value={emailSignature}
                onChange={e => setEmailSignature(e.target.value)}
                placeholder="Atenciosamente,&#10;&#10;Victor Hugo&#10;Fundador · ACREDYTA&#10;📧 contato@acredyta.com.br&#10;📱 (11) 99999-9999"
                className="min-h-[160px] text-sm font-mono resize-none"
              />

              {/* Imagem da assinatura (logo / banner) */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Imagem (logo / banner)</Label>
                <input
                  ref={sigImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadSignatureImage(f); if (sigImageInputRef.current) sigImageInputRef.current.value = '' }}
                />
                {signatureImage ? (
                  <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted/20">
                    <img src={signatureImage} alt="Assinatura" className="h-12 max-w-[140px] object-contain rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-muted-foreground">Imagem carregada</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => sigImageInputRef.current?.click()}
                      className="text-[11px] px-2 py-1 rounded border border-border hover:border-[#5B8CFF]/40 transition-colors"
                    >
                      Trocar
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureImage('')}
                      className="text-[11px] px-2 py-1 rounded border border-border hover:border-red-500/40 hover:text-red-600 transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => sigImageInputRef.current?.click()}
                    disabled={uploadingSigImage}
                    className="w-full border-2 border-dashed border-border rounded-lg py-4 px-3 text-center text-xs text-muted-foreground hover:border-[#5B8CFF]/40 hover:bg-[#5B8CFF]/5 transition-colors flex flex-col items-center gap-1"
                  >
                    {uploadingSigImage
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</>
                      : <><Camera className="w-4 h-4" /> Adicionar logo ou banner (PNG/JPG, máx 2MB)</>
                    }
                  </button>
                )}
              </div>

              {/* Preview HTML completo */}
              {(emailSignature || signatureImage) && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pré-visualização no email</p>
                  <div className="border-t border-border pt-2 space-y-2">
                    {emailSignature && (
                      <div className="text-xs whitespace-pre-wrap leading-relaxed text-foreground/80 font-sans">
                        {emailSignature}
                      </div>
                    )}
                    {signatureImage && (
                      <img src={signatureImage} alt="" className="max-h-20 object-contain" />
                    )}
                  </div>
                </div>
              )}

              <Button onClick={saveSignature} disabled={savingSignature} className="text-white text-sm w-full" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                {savingSignature ? 'Salvando…' : 'Salvar assinatura'}
              </Button>
            </CardContent>
          </Card>
          </div>

          <Button variant="outline" className="w-full max-w-lg gap-2 text-sm text-red-500 hover:text-red-500 hover:bg-red-50 border-red-200" onClick={signOut}>
            <LogOut className="w-4 h-4" /> Sair da conta
          </Button>
        </div>
      )}

      {/* ─── EQUIPE ─── */}
      {tab === 'equipe' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="text-white gap-1.5 text-xs" style={{ background: 'var(--brand-primary,#5B8CFF)' }} onClick={() => setInviteOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Convidar membro
            </Button>
          </div>
          <Card className="border-border shadow-none overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Membro</span><span>Função</span><span>Permissão</span><span className="text-right">Status</span>
            </div>
            {orgUsers.map(u => {
              const permCfg = PERMISSION_CONFIG[u.permission] ?? PERMISSION_CONFIG.Visualizador
              const isMe = u.id === appUser?.id
              return (
                <div key={u.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-border last:border-0 items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs font-bold" style={{ background: 'var(--brand-primary,#5B8CFF)20', color: 'var(--brand-primary,#5B8CFF)' }}>
                        {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{u.full_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{u.role ?? '—'}</span>
                  {appUser?.permission === 'Admin' && !isMe ? (
                    <Select value={u.permission} onValueChange={v => v && changeUserPermission(u.id, v)}>
                      <SelectTrigger className="h-7 text-[11px] w-fit min-w-[120px] gap-1">
                        <span className="font-semibold" style={{ color: permCfg.color }}>{permCfg.label}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PERMISSION_CONFIG).map(([val, cfg]) => (
                          <SelectItem key={val} value={val}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                              <span style={{ color: cfg.color }}>{cfg.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className="text-[10px] border-0 w-fit" style={{ backgroundColor: `${permCfg.color}15`, color: permCfg.color }}>{permCfg.label}</Badge>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    {isMe ? (
                      <Badge className="text-[10px] bg-[#12B981]/10 text-[#12B981] border-0">Você</Badge>
                    ) : (
                      <button
                        onClick={() => toggleUserStatus(u.id, u.is_active)}
                        className={cn('text-xs px-2 py-1 rounded-md font-medium border transition-colors', u.is_active ? 'border-[#12B981]/30 text-[#12B981] hover:bg-[#12B981]/10' : 'border-border text-muted-foreground')}
                      >
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </Card>

          <Dialog open={inviteOpen} onOpenChange={open => { if (!open) closeInviteModal(); else setInviteOpen(true) }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Convidar membro</DialogTitle></DialogHeader>

              {inviteResult ? (
                /* Success / link state */
                <div className="space-y-4 mt-2">
                  <div className={cn(
                    'rounded-lg border p-3 space-y-2',
                    inviteResult.emailSent
                      ? 'bg-[#12B981]/8 border-[#12B981]/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  )}>
                    <div className="flex items-center gap-2">
                      {inviteResult.emailSent
                        ? <Check className="w-4 h-4 text-[#12B981]" />
                        : <Mail className="w-4 h-4 text-amber-600" />}
                      <p className="text-sm font-bold">
                        {inviteResult.emailSent ? 'Convite enviado por email!' : 'Convite criado'}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {inviteResult.emailSent
                        ? `Email enviado para ${inviteEmail}. O convidado tem 7 dias pra aceitar.`
                        : `Email não foi enviado (configure SMTP em Integrações). Copie o link abaixo e envie manualmente.`}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Link de aceitação</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={inviteResult.url} className="h-8 text-xs font-mono bg-muted" />
                      <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1 shrink-0" onClick={() => { navigator.clipboard.writeText(inviteResult.url); toast.success('Link copiado!') }}>
                        <Copy className="w-3 h-3" /> Copiar
                      </Button>
                    </div>
                  </div>

                  <Button onClick={closeInviteModal} className="w-full text-white text-sm" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                    Concluir
                  </Button>
                </div>
              ) : (
                /* Invite form */
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Nome (opcional)</Label>
                      <Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Maria Silva" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Função (opcional)</Label>
                      <Input value={inviteRole} onChange={e => setInviteRole(e.target.value)} placeholder="Vendedora SDR" className="h-9 text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">E-mail *</Label>
                    <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colaborador@email.com" type="email" className="h-9 text-sm" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Permissão</Label>
                    <Select value={invitePermission} onValueChange={v => { if (v) setInvitePermission(v) }}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PERMISSION_CONFIG).map(([v, cfg]) => (
                          <SelectItem key={v} value={v}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                              {cfg.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {PERMISSION_DESCRIPTIONS[invitePermission] && (
                      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PERMISSION_CONFIG[invitePermission]?.color }} />
                          <p className="text-xs font-semibold">{PERMISSION_DESCRIPTIONS[invitePermission].title}</p>
                        </div>
                        <ul className="space-y-1">
                          {PERMISSION_DESCRIPTIONS[invitePermission].items.map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <Check className="w-3 h-3 mt-0.5 shrink-0 text-[#12B981]" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1 text-sm" onClick={closeInviteModal}>Cancelar</Button>
                    <Button onClick={inviteUser} disabled={inviting || !inviteEmail} className="flex-1 text-white text-sm gap-1.5" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                      <Mail className="w-3.5 h-3.5" />{inviting ? 'Enviando…' : 'Enviar convite'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ─── FUNIS ─── */}
      {tab === 'funis' && (
        <div className="space-y-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Funis e etapas</h3>
              <p className="text-xs text-muted-foreground">Funis são compartilhados com o Pipeline de Vendas — um único mundo.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={funnelFilter} onChange={e => setFunnelFilter(e.target.value)} placeholder="Filtrar funis..." className="h-8 pl-8 text-xs w-40" />
              </div>
              <Button size="sm" className="text-white gap-1.5 text-xs h-8" style={{ background: '#12B981' }} onClick={() => setShowNewFunnel(true)}>
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
          </div>

          {loadingFunnels ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando funis...
            </div>
          ) : funnels.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              <Kanban className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Nenhum funil criado ainda</p>
              <p className="text-xs mt-1">Clique em &quot;+ Adicionar&quot; para criar seu primeiro funil</p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {funnels
                .filter(f => !funnelFilter || f.name.toLowerCase().includes(funnelFilter.toLowerCase()))
                .map(f => {
                  const stageInput = stageInputByFunnel[f.id] ?? ''
                  return (
                    <div key={f.id} className={cn(
                      'w-72 flex flex-col bg-card border rounded-xl overflow-hidden shrink-0 shadow-sm transition-opacity',
                      f.is_hidden ? 'border-dashed border-muted-foreground/40 opacity-60' : 'border-border'
                    )}>
                      {/* Column header */}
                      <div className="px-3 pt-3 pb-2 border-b border-border">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">{f.stages.length} etapa{f.stages.length !== 1 ? 's' : ''} · {f.user_ids.length} usuário{f.user_ids.length !== 1 ? 's' : ''}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleFunnelHidden(f.id)}
                              title={f.is_hidden ? 'Mostrar no Pipeline' : 'Ocultar do Pipeline'}
                              className="p-1.5 text-white rounded transition-colors"
                              style={{ background: f.is_hidden ? '#64748B' : '#F59E0B' }}
                            >
                              {f.is_hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button onClick={() => setEditingFunnel({ ...f })} title="Editar funil" className="p-1.5 text-white rounded transition-colors" style={{ background: '#12B981' }}>
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => f.is_default ? toast.error('Funil padrão não pode ser excluído. Ative outro como padrão antes.') : deleteFunnel(f.id)}
                              title={f.is_default ? 'Funil padrão — promova outro a padrão antes de excluir' : 'Excluir funil'}
                              className={cn(
                                'p-1.5 text-white rounded transition-colors',
                                f.is_default && 'opacity-50 cursor-not-allowed'
                              )}
                              style={{ background: '#e1493c' }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="font-bold text-sm text-foreground leading-tight">{f.name}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {f.is_default && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-[#12B981]/15 text-[#12B981]">Padrão</span>
                          )}
                          {f.is_hidden && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-[#F59E0B]/15 text-[#F59E0B]">Oculto</span>
                          )}
                          {f.description && (
                            <span className="text-[9px] text-muted-foreground truncate max-w-[160px]">{f.description}</span>
                          )}
                        </div>
                      </div>

                      {/* Inline add stage */}
                      <div className="flex gap-1.5 p-2 border-b border-border bg-muted/30">
                        <Input
                          value={stageInput}
                          onChange={e => setStageInputByFunnel(prev => ({ ...prev, [f.id]: e.target.value }))}
                          placeholder="Nova etapa..."
                          className="h-7 text-xs flex-1 bg-card"
                          onKeyDown={e => { if (e.key === 'Enter') addFunnelStage(f.id, stageInput) }}
                        />
                        <button
                          onClick={() => addFunnelStage(f.id, stageInput)}
                          disabled={!stageInput.trim()}
                          className="h-7 px-2.5 text-white text-xs rounded-md font-semibold disabled:opacity-40 transition-opacity shrink-0"
                          style={{ background: '#12B981' }}
                        >
                          + Add
                        </button>
                      </div>

                      {/* Stages */}
                      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 480 }}>
                        {f.stages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                            <Kanban className="w-7 h-7 text-muted-foreground/30 mb-2" />
                            <p className="text-xs text-muted-foreground">Nenhuma etapa ainda.</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Use o campo acima para adicionar.</p>
                          </div>
                        ) : (
                          f.stages.map((stage) => (
                            <div key={stage.id} className="flex items-stretch border-b border-border last:border-0 bg-card hover:bg-muted/20 transition-colors group">
                              <div className="w-1 shrink-0" style={{ background: stage.color }} />
                              <div className="flex-1 px-3 py-2.5 min-w-0">
                                <p className="text-[13px] font-semibold text-foreground leading-snug">{stage.name}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{stage.description || 'Descrição não definida'}</p>
                              </div>
                              <div className="flex flex-col items-center justify-center gap-0.5 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  title="Mover para cima"
                                  onClick={() => reorderFunnelStage(f.id, stage.id, 'up')}
                                  className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors rotate-180"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  title="Mover para baixo"
                                  onClick={() => reorderFunnelStage(f.id, stage.id, 'down')}
                                  className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  title="Editar etapa"
                                  onClick={() => setEditingStage({ funnelId: f.id, stage: { ...stage } })}
                                  className="p-1 text-muted-foreground hover:text-[#5B8CFF] rounded transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  title="Excluir etapa"
                                  onClick={() => deleteFunnelStage(f.id, stage.id)}
                                  className="p-1 text-muted-foreground hover:text-red-500 rounded transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })
              }
            </div>
          </div>
          )}

          {/* ── Edit stage dialog ── */}
          <Dialog open={!!editingStage} onOpenChange={open => { if (!open) setEditingStage(null) }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Edit3 className="w-4 h-4" /> Editar etapa</DialogTitle></DialogHeader>
              {editingStage && (
                <div className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nome da etapa *</Label>
                    <Input value={editingStage.stage.name} onChange={e => setEditingStage(p => p ? { ...p, stage: { ...p.stage, name: e.target.value } } : p)} className="h-9 text-sm" autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Descrição (opcional)</Label>
                    <Input value={editingStage.stage.description ?? ''} onChange={e => setEditingStage(p => p ? { ...p, stage: { ...p.stage, description: e.target.value } } : p)} placeholder="Descreva o que acontece nesta etapa..." className="h-9 text-sm" />
                  </div>
                  <ColorPicker
                    label="Cor da etapa"
                    value={editingStage.stage.color}
                    onChange={c => setEditingStage(p => p ? { ...p, stage: { ...p.stage, color: c } } : p)}
                  />
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1 text-sm" onClick={() => setEditingStage(null)}>Cancelar</Button>
                    <Button onClick={() => updateFunnelStage(editingStage.funnelId, editingStage.stage)} disabled={!editingStage.stage.name.trim()} className="flex-1 text-white text-sm" style={{ background: '#12B981' }}>
                      Salvar etapa
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* ── Edit funnel dialog ── */}
          <Dialog open={!!editingFunnel} onOpenChange={open => { if (!open) setEditingFunnel(null) }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Editar funil</DialogTitle></DialogHeader>
              {editingFunnel && (
                <div className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nome *</Label>
                    <Input value={editingFunnel.name} onChange={e => setEditingFunnel(p => p ? { ...p, name: e.target.value } : p)} className="h-9 text-sm" autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Descrição</Label>
                    <textarea
                      value={editingFunnel.description ?? ''}
                      onChange={e => setEditingFunnel(p => p ? { ...p, description: e.target.value || null } : p)}
                      placeholder="Descrição do funil..."
                      rows={2}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5B8CFF]/30"
                    />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                    <input
                      type="checkbox"
                      id="edit-is-default"
                      checked={editingFunnel.is_default}
                      onChange={e => setEditingFunnel(p => p ? { ...p, is_default: e.target.checked } : p)}
                      className="w-4 h-4 accent-[#5B8CFF]"
                    />
                    <label htmlFor="edit-is-default" className="text-sm font-medium cursor-pointer select-none">
                      Funil padrão <span className="text-xs text-muted-foreground">(leads sem funil são atribuídos a este)</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Usuários com acesso a este funil</Label>
                    <p className="text-[10px] text-muted-foreground">Se nenhum selecionado, todos os usuários da organização terão acesso.</p>
                    <div className="flex flex-wrap gap-2 p-3 bg-[#5B8CFF]/5 border border-[#5B8CFF]/20 rounded-lg min-h-[48px]">
                      {orgUsers.map(u => {
                        const sel = editingFunnel.user_ids.includes(u.id)
                        return (
                          <button key={u.id}
                            onClick={() => setEditingFunnel(p => p ? { ...p, user_ids: sel ? p.user_ids.filter(id => id !== u.id) : [...p.user_ids, u.id] } : p)}
                            className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all font-medium',
                              sel ? 'bg-[#5B8CFF] text-white border-transparent' : 'border-border text-muted-foreground hover:border-[#5B8CFF]/40')}>
                            {sel && <Check className="w-2.5 h-2.5" />}
                            {u.full_name ?? u.email}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {!editingFunnel.is_default && (
                      <Button variant="destructive" className="text-sm" onClick={() => { deleteFunnel(editingFunnel.id); setEditingFunnel(null) }}>Remover</Button>
                    )}
                    <div className="flex-1" />
                    <Button variant="outline" className="text-sm" onClick={() => setEditingFunnel(null)}>Cancelar</Button>
                    <Button onClick={() => updateFunnel(editingFunnel)} disabled={!editingFunnel.name.trim() || savingFunnel} className="text-white text-sm" style={{ background: '#12B981' }}>
                      {savingFunnel ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* ── New funnel dialog ── */}
          <Dialog open={showNewFunnel} onOpenChange={setShowNewFunnel}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Novo funil</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nome *</Label>
                  <Input value={newFunnelName} onChange={e => setNewFunnelName(e.target.value)} placeholder="Ex: Funil Principal, Pré-Vendas..." className="h-9 text-sm" autoFocus onKeyDown={e => e.key === 'Enter' && createFunnel()} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Descrição</Label>
                  <Input value={newFunnelDesc} onChange={e => setNewFunnelDesc(e.target.value)} placeholder="Opcional..." className="h-9 text-sm" />
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    id="new-is-default"
                    checked={newFunnelDefault}
                    onChange={e => setNewFunnelDefault(e.target.checked)}
                    className="w-4 h-4 accent-[#5B8CFF]"
                  />
                  <label htmlFor="new-is-default" className="text-sm font-medium cursor-pointer select-none">Funil padrão</label>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Usuários com acesso <span className="text-muted-foreground font-normal">(vazio = todos)</span></Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-[#5B8CFF]/5 border border-[#5B8CFF]/20 rounded-lg min-h-[44px]">
                    {orgUsers.map(u => {
                      const sel = newFunnelUserIds.includes(u.id)
                      return (
                        <button key={u.id}
                          onClick={() => setNewFunnelUserIds(prev => sel ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                          className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all font-medium',
                            sel ? 'bg-[#5B8CFF] text-white border-transparent' : 'border-border text-muted-foreground hover:border-[#5B8CFF]/40')}>
                          {sel && <Check className="w-2.5 h-2.5" />}
                          {u.full_name ?? u.email}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1 text-sm" onClick={() => setShowNewFunnel(false)}>Cancelar</Button>
                  <Button onClick={createFunnel} disabled={!newFunnelName.trim() || savingFunnel} className="flex-1 text-white text-sm" style={{ background: '#12B981' }}>
                    {savingFunnel ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar funil'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ─── TAGS ─── */}
      {tab === 'tags' && (
        <div className="max-w-lg space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Tags de leads</h3>
            <p className="text-xs text-muted-foreground">Crie tags coloridas para categorizar oportunidades no Pipeline. Arraste tags sobre os cards.</p>
          </div>

          <Card className="border-border shadow-none">
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome da tag</Label>
                <Input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Ex: Reunião Agendada, Proposta Enviada..." className="h-9 text-sm" onKeyDown={e => e.key === 'Enter' && createTag()} />
              </div>
              <ColorPicker label="Cor" value={newTagColor} onChange={setNewTagColor} />
              <Button onClick={createTag} disabled={!newTagName.trim()} className="w-full text-white text-xs gap-1.5" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                <Plus className="w-3.5 h-3.5" /> Criar tag
              </Button>
            </CardContent>
          </Card>

          {tags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              <Tag className="w-7 h-7 mx-auto mb-2 opacity-30" />
              Nenhuma tag criada ainda.
            </div>
          ) : (
            <Card className="border-border shadow-none">
              <CardContent className="p-4 flex flex-wrap gap-2">
                {tags.map(t => (
                  <div key={t.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: `${t.color}20`, color: t.color }}>
                    {t.name}
                    <button onClick={() => saveTags(tags.filter(tag => tag.id !== t.id))} className="hover:opacity-70 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── DISTRIBUIÇÃO ─── */}
      {tab === 'distribuicao' && (
        <div className="max-w-lg space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Distribuição automática de leads</h3>
            <p className="text-xs text-muted-foreground">Ative o round-robin para distribuir novos leads automaticamente entre os vendedores selecionados.</p>
          </div>

          <Card className="border-border shadow-none">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Rotação automática de leads</p>
                  <p className="text-xs text-muted-foreground">Cada novo lead é atribuído ao próximo vendedor na fila (round-robin)</p>
                </div>
                <div className="flex items-center gap-2">
                  {savingRotation && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                  <Toggle checked={rotationEnabled} onChange={v => saveRotation(v, rotationUserIds)} />
                </div>
              </div>

              {rotationEnabled && (
                <>
                  <div className="border-t border-border pt-4 space-y-2">
                    <p className="text-xs font-semibold">Vendedores na fila de rotação:</p>
                    <div className="space-y-2">
                      {orgUsers.map((u, idx) => {
                        const isInQueue = rotationUserIds.includes(u.id)
                        const queuePos = rotationUserIds.indexOf(u.id)
                        return (
                          <div key={u.id} className={cn('flex items-center gap-3 p-2 rounded-lg border transition-colors', isInQueue ? 'border-[#5B8CFF]/30 bg-[#5B8CFF]/5' : 'border-border')}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: isInQueue ? 'var(--brand-primary,#5B8CFF)' : '#e5e7eb', color: isInQueue ? 'white' : '#6B7280' }}>
                              {isInQueue ? queuePos + 1 : '—'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{u.full_name ?? u.email ?? '—'}</p>
                              <p className="text-[10px] text-muted-foreground">{u.role ?? 'Vendedor'}</p>
                            </div>
                            <Toggle
                              checked={isInQueue}
                              onChange={v => saveRotation(rotationEnabled, v ? [...rotationUserIds, u.id] : rotationUserIds.filter(id => id !== u.id))}
                            />

                          </div>
                        )
                      })}
                    </div>
                    {rotationUserIds.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                        <RotateCcw className="w-3 h-3" />
                        {rotationUserIds.length} vendedor{rotationUserIds.length > 1 ? 'es' : ''} na fila. Próximo lead → {orgUsers.find(u => u.id === rotationUserIds[0])?.full_name ?? '—'}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl dark:bg-amber-950/20 dark:border-amber-900/30">
            <Shuffle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              A distribuição automática se aplica aos leads que chegam via formulário (WordPress/Elementor) e webhook. Leads criados manualmente no Pipeline seguem a atribuição manual.
            </p>
          </div>
        </div>
      )}

      {/* ─── SEGMENTOS ─── */}
      {tab === 'segmentos' && (
        <div className="max-w-lg space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Segmentos de mercado</h3>
            <p className="text-xs text-muted-foreground">Categorize clientes e leads por segmento de atuação (ex: Imobiliário, Saúde, Varejo).</p>
          </div>

          <Card className="border-border shadow-none">
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome do segmento</Label>
                <div className="flex gap-2">
                  <Input value={newSegmentName} onChange={e => setNewSegmentName(e.target.value)} placeholder="Ex: Imobiliário, Saúde, Advocacia..." className="h-9 text-sm flex-1" onKeyDown={e => e.key === 'Enter' && createSegment()} />
                  <Button onClick={createSegment} disabled={!newSegmentName.trim()} className="text-white text-xs h-9 shrink-0" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>
              <ColorPicker label="Cor do segmento" value={newSegmentColor} onChange={setNewSegmentColor} />
            </CardContent>
          </Card>

          {loadingSegments ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando...
            </div>
          ) : segments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              <Building2 className="w-7 h-7 mx-auto mb-2 opacity-30" />
              Nenhum segmento criado ainda.
            </div>
          ) : (
            <Card className="border-border shadow-none overflow-hidden">
              {segments.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="flex-1 text-sm font-medium">{s.name}</span>
                  <button onClick={() => deleteSegment(s.id)} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </Card>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Sugestões rápidas:</p>
            <div className="flex flex-wrap gap-1.5">
              {['Imobiliário', 'Saúde', 'Educação', 'Varejo', 'Advocacia', 'Contabilidade', 'Construtora', 'Tecnologia', 'Agronegócio', 'Indústria', 'Condomínio', 'E-commerce'].map(preset => (
                <button
                  key={preset}
                  onClick={async () => {
                    if (segments.find(s => s.name === preset)) { toast.info('Segmento já existe'); return }
                    const supabase = createClient()
                    const { data: me } = await supabase.from('users').select('organization_id').single()
                    if (!me?.organization_id) return
                    const { data, error } = await supabase.from('segments').insert({ organization_id: me.organization_id, name: preset, color: newSegmentColor }).select().single()
                    if (!error && data) { setSegments(prev => [...prev, { id: data.id, name: data.name, color: data.color }]); toast.success(`"${preset}" adicionado!`) }
                  }}
                  className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-[#5B8CFF]/40 hover:bg-[#5B8CFF]/5 transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── NOTIFICAÇÕES ─── */}
      {tab === 'notificacoes' && <NotificationPrefsPanel appUser={appUser} />}

      {/* ─── SEGURANÇA ─── */}
      {tab === 'seguranca' && (
        <div className="max-w-lg space-y-4">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Segurança da conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                <div>
                  <p className="text-sm font-medium">Senha</p>
                  <p className="text-xs text-muted-foreground">Receba um link de redefinição por email</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs" onClick={async () => {
                  const supabase = createClient()
                  await supabase.auth.resetPasswordForEmail(appUser?.email ?? '', { redirectTo: `${window.location.origin}/auth/callback` })
                  toast.success('Email de redefinição enviado!')
                }}>
                  Alterar senha
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                <div>
                  <p className="text-sm font-medium">Autenticação 2 fatores</p>
                  <p className="text-xs text-muted-foreground">Camada extra de segurança</p>
                </div>
                <Badge className="text-[10px] bg-muted border-0 text-muted-foreground">Em breve</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                <div>
                  <p className="text-sm font-medium">Sessões ativas</p>
                  <p className="text-xs text-muted-foreground">1 sessão ativa agora</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs text-red-500 hover:text-red-500 border-red-200" onClick={signOut}>
                  Encerrar sessão
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50 shadow-none dark:bg-red-950/20 dark:border-red-900/30">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-red-600">Zona de perigo</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Ações irreversíveis — prossiga com cuidado.</p>
              <Button size="sm" variant="outline" className="text-xs border-red-300 text-red-500 hover:bg-red-50" onClick={() => toast.error('Entre em contato com o suporte para excluir sua conta.')}>
                Excluir conta
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
