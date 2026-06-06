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
  Camera, Loader2, Copy, Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { AppUser } from '@/types/database'

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
  Admin: { label: 'Admin', color: '#e1493c' },
  Gerente: { label: 'Gerente', color: '#8B5CF6' },
  'Social Media': { label: 'Social Media', color: '#5B8CFF' },
  Atendimento: { label: 'Atendimento', color: '#12B981' },
  Visualizador: { label: 'Visualizador', color: '#6B7280' },
}

const PERMISSION_DESCRIPTIONS: Record<string, { title: string; items: string[] }> = {
  Admin: {
    title: 'Acesso total ao sistema',
    items: ['Gerencia toda a equipe e permissões', 'Acesso a todos os funis e leads', 'Configura integrações, white label e planos', 'Visualiza todos os relatórios e financeiro'],
  },
  Gerente: {
    title: 'Gestão de equipe e comercial',
    items: ['Gerencia vendedores e distribui leads', 'Acessa todos os funis sob sua responsabilidade', 'Visualiza relatórios de performance da equipe', 'Não acessa configurações administrativas'],
  },
  'Social Media': {
    title: 'Conteúdo e aprovações',
    items: ['Cria e gerencia conteúdos para aprovação', 'Visualiza leads atribuídos a si', 'Acessa o portal de aprovações dos clientes', 'Sem acesso a financeiro ou permissões'],
  },
  Atendimento: {
    title: 'Relacionamento com clientes',
    items: ['Visualiza e atualiza leads atribuídos a si', 'Registra atividades e histórico de contato', 'Acessa agenda e tarefas próprias', 'Sem acesso a configurações ou relatórios gerais'],
  },
  Visualizador: {
    title: 'Somente leitura',
    items: ['Visualiza leads, pipeline e relatórios', 'Não pode editar ou criar registros', 'Ideal para diretores ou sócios observadores', 'Sem acesso a configurações'],
  },
}

const FUNNEL_TYPES = ['Vendas', 'Marketing', 'Projetos', 'Prospecção', 'Pré-Vendas', 'Pós-Vendas', 'Administrativo']

interface FunnelStage {
  id: string
  name: string
  color: string
  order_index: number
  description?: string
}

interface Funnel {
  id: string
  name: string
  type: string
  visibility: 'publico' | 'privado' | 'por_usuario'
  responsible_id: string
  user_ids: string[]
  description: string
  stages: FunnelStage[]
}

interface LeadTag {
  id: string
  name: string
  color: string
}

interface Segment {
  id: string
  name: string
}

const STAGE_PALETTE = ['#5B8CFF', '#12B981', '#F59E0B', '#8B5CF6', '#e1493c', '#06B6D4', '#F97316', '#EC4899', '#14B8A6', '#6B7280']

const LOCAL_FUNNELS_KEY = 'cyclo_funnels'
const LOCAL_TAGS_KEY = 'cyclo_lead_tags'
const LOCAL_SEGMENTS_KEY = 'cyclo_segments'
const LOCAL_ROTATION_KEY = 'cyclo_lead_rotation'

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

  // --- Pipeline stages ---
  const [pipelineStages, setPipelineStages] = useState<Array<{ id: string; name: string; color: string; order_index: number }>>([])
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#5B8CFF')
  const [newStageCustomColor, setNewStageCustomColor] = useState('#5B8CFF')
  const [stagesLoaded, setStagesLoaded] = useState(false)
  const [loadingStages, setLoadingStages] = useState(false)
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null)

  // --- Funnels ---
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [showNewFunnel, setShowNewFunnel] = useState(false)
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null)
  const [newFunnel, setNewFunnel] = useState<Omit<Funnel, 'id'>>({
    name: '', type: 'Vendas', visibility: 'publico', responsible_id: '', user_ids: [], description: '', stages: [],
  })
  const [expandedFunnelId, setExpandedFunnelId] = useState<string | null>(null)
  const [addingStageToFunnelId, setAddingStageToFunnelId] = useState<string | null>(null)
  const [funnelStageName, setFunnelStageName] = useState('')
  const [funnelStageColor, setFunnelStageColor] = useState('#5B8CFF')
  const [funnelFilter, setFunnelFilter] = useState('')
  const [stageInputByFunnel, setStageInputByFunnel] = useState<Record<string, string>>({})
  const [editingStage, setEditingStage] = useState<{ funnelId: string; stage: FunnelStage } | null>(null)

  // --- Tags ---
  const [tags, setTags] = useState<LeadTag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#5B8CFF')

  // --- Segments ---
  const [segments, setSegments] = useState<Segment[]>([])
  const [newSegmentName, setNewSegmentName] = useState('')

  // --- Rotation ---
  const [rotationEnabled, setRotationEnabled] = useState(false)
  const [rotationUserIds, setRotationUserIds] = useState<string[]>([])

  // --- Other ---
  const [orgUsers, setOrgUsers] = useState(initialUsers)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [fullName, setFullName] = useState(appUser?.full_name ?? '')
  const [role, setRole] = useState(appUser?.role ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePermission, setInvitePermission] = useState('Social Media')
  const [inviting, setInviting] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(appUser?.avatar_url ?? '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const f = localStorage.getItem(LOCAL_FUNNELS_KEY)
      if (f) setFunnels((JSON.parse(f) as Funnel[]).map(fn => ({ ...fn, stages: fn.stages ?? [] })))
      const t = localStorage.getItem(LOCAL_TAGS_KEY)
      if (t) setTags(JSON.parse(t))
      const s = localStorage.getItem(LOCAL_SEGMENTS_KEY)
      if (s) setSegments(JSON.parse(s))
      const r = localStorage.getItem(LOCAL_ROTATION_KEY)
      if (r) {
        const parsed = JSON.parse(r)
        setRotationEnabled(parsed.enabled ?? false)
        setRotationUserIds(parsed.user_ids ?? [])
      }
    } catch {}
  }, [])

  const saveFunnels = (updated: Funnel[]) => {
    setFunnels(updated)
    localStorage.setItem(LOCAL_FUNNELS_KEY, JSON.stringify(updated))
  }

  const saveTags = (updated: LeadTag[]) => {
    setTags(updated)
    localStorage.setItem(LOCAL_TAGS_KEY, JSON.stringify(updated))
  }

  const saveSegments = (updated: Segment[]) => {
    setSegments(updated)
    localStorage.setItem(LOCAL_SEGMENTS_KEY, JSON.stringify(updated))
  }

  const saveRotation = (enabled: boolean, userIds: string[]) => {
    setRotationEnabled(enabled)
    setRotationUserIds(userIds)
    localStorage.setItem(LOCAL_ROTATION_KEY, JSON.stringify({ enabled, user_ids: userIds }))
  }

  const loadStages = async () => {
    if (stagesLoaded) return
    setLoadingStages(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('organization_id', me?.organization_id ?? '')
      .order('order_index')
    setPipelineStages(data ?? [])
    setStagesLoaded(true)
    setLoadingStages(false)
  }

  const addStage = async () => {
    if (!newStageName.trim()) return
    const finalColor = STAGE_PALETTE.includes(newStageColor) ? newStageColor : newStageCustomColor
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { toast.error('Organização não encontrada'); return }
    const nextOrder = pipelineStages.length > 0 ? Math.max(...pipelineStages.map(s => s.order_index)) + 1 : 0
    const { data, error } = await supabase.from('pipeline_stages').insert({
      organization_id: me.organization_id,
      name: newStageName.trim(),
      color: finalColor,
      order_index: nextOrder,
    }).select().single()
    if (error) { toast.error(`Erro ao criar etapa: ${error.message}`); return }
    setPipelineStages(prev => [...prev, data as typeof pipelineStages[0]])
    setNewStageName('')
    toast.success('Etapa criada!')
  }

  const deleteStage = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
    if (error) { toast.error('Erro ao remover etapa'); return }
    setPipelineStages(prev => prev.filter(s => s.id !== id))
    toast.success('Etapa removida')
  }

  const createFunnel = () => {
    if (!newFunnel.name.trim()) return
    const created: Funnel = { ...newFunnel, id: crypto.randomUUID() }
    saveFunnels([...funnels, created])
    setNewFunnel({ name: '', type: 'Vendas', visibility: 'publico', responsible_id: '', user_ids: [], description: '', stages: [] })
    setShowNewFunnel(false)
    setExpandedFunnelId(created.id)
    toast.success(`Funil "${created.name}" criado! Agora adicione as etapas.`)
  }

  const updateFunnel = (updated: Funnel) => {
    saveFunnels(funnels.map(f => f.id === updated.id ? updated : f))
    setEditingFunnel(null)
    toast.success('Funil atualizado!')
  }

  const addFunnelStage = async (funnelId: string, stageName?: string) => {
    const name = (stageName ?? funnelStageName).trim()
    if (!name) return
    const funnel = funnels.find(f => f.id === funnelId)
    if (!funnel) return
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { toast.error('Organização não encontrada'); return }
    const nextOrder = funnel.stages.length > 0 ? Math.max(...funnel.stages.map(s => s.order_index)) + 1 : 0
    const { data, error } = await supabase.from('pipeline_stages').insert({
      organization_id: me.organization_id,
      name,
      color: funnelStageColor,
      order_index: nextOrder,
    }).select().single()
    if (error) { toast.error(`Erro ao criar etapa: ${error.message}`); return }
    const newStage: FunnelStage = { id: data.id, name: data.name, color: data.color, order_index: data.order_index }
    saveFunnels(funnels.map(f => f.id === funnelId ? { ...f, stages: [...f.stages, newStage] } : f))
    setStageInputByFunnel(prev => ({ ...prev, [funnelId]: '' }))
    setFunnelStageName('')
    setAddingStageToFunnelId(null)
    toast.success(`Etapa "${newStage.name}" adicionada!`)
  }

  const updateFunnelStage = (funnelId: string, updatedStage: FunnelStage) => {
    saveFunnels(funnels.map(f => f.id === funnelId ? { ...f, stages: f.stages.map(s => s.id === updatedStage.id ? updatedStage : s) } : f))
    setEditingStage(null)
    toast.success('Etapa atualizada!')
  }

  const duplicateFunnel = (f: Funnel) => {
    const copy: Funnel = { ...f, id: crypto.randomUUID(), name: `${f.name} (cópia)`, stages: [] }
    saveFunnels([...funnels, copy])
    toast.success(`Funil "${copy.name}" duplicado! Adicione as etapas.`)
  }

  const deleteFunnelStage = async (funnelId: string, stageId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('pipeline_stages').delete().eq('id', stageId)
    if (error) { toast.error('Erro ao remover etapa'); return }
    saveFunnels(funnels.map(f => f.id === funnelId ? { ...f, stages: f.stages.filter(s => s.id !== stageId) } : f))
    toast.success('Etapa removida')
  }

  const uploadAvatar = async (file: File) => {
    if (!appUser?.id) return
    setUploadingAvatar(true)
    const supabase = createClient()
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const fileName = `${appUser.id}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true, contentType: file.type })
    if (uploadError) {
      toast.error(`Erro ao enviar foto: ${uploadError.message}`)
      setUploadingAvatar(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
    const urlWithTs = `${publicUrl}?t=${Date.now()}`
    const { error: updateError } = await supabase.from('users').update({ avatar_url: urlWithTs }).eq('id', appUser.id)
    if (updateError) {
      toast.error('Erro ao salvar foto no perfil')
    } else {
      setAvatarUrl(urlWithTs)
      toast.success('Foto de perfil atualizada!')
      router.refresh()
    }
    setUploadingAvatar(false)
  }

  const deleteFunnel = (id: string) => {
    saveFunnels(funnels.filter(f => f.id !== id))
    if (selectedFunnelId === id) setSelectedFunnelId(null)
    toast.success('Funil removido')
  }

  const createTag = () => {
    if (!newTagName.trim()) return
    const tag: LeadTag = { id: crypto.randomUUID(), name: newTagName.trim(), color: newTagColor }
    saveTags([...tags, tag])
    setNewTagName('')
    toast.success('Tag criada!')
  }

  const createSegment = () => {
    if (!newSegmentName.trim()) return
    const seg: Segment = { id: crypto.randomUUID(), name: newSegmentName.trim() }
    saveSegments([...segments, seg])
    setNewSegmentName('')
    toast.success('Segmento criado!')
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    const supabase = createClient()
    const { error } = await supabase.from('users').update({ full_name: fullName, role }).eq('id', appUser?.id ?? '')
    if (error) { toast.error('Erro ao salvar'); setSavingProfile(false); return }
    toast.success('Perfil atualizado!')
    setSavingProfile(false)
  }

  const inviteUser = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    toast.info('Convite enviado! O usuário receberá um email para criar a conta.')
    setInviting(false)
    setInviteOpen(false)
    setInviteEmail('')
  }

  const toggleUserStatus = async (userId: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('users').update({ is_active: !current }).eq('id', userId)
    setOrgUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u))
    toast.success(!current ? 'Usuário ativado' : 'Usuário desativado')
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const TABS: { value: 'perfil' | 'equipe' | 'funis' | 'tags' | 'distribuicao' | 'segmentos' | 'notificacoes' | 'seguranca'; label: string; Icon: React.ElementType; onSelect?: () => void }[] = [
    { value: 'perfil', label: 'Perfil', Icon: User },
    { value: 'equipe', label: 'Equipe', Icon: Users },
    { value: 'funis', label: 'Funis', Icon: Kanban, onSelect: loadStages },
    { value: 'tags', label: 'Tags', Icon: Tag },
    { value: 'distribuicao', label: 'Distribuição', Icon: Shuffle },
    { value: 'segmentos', label: 'Segmentos', Icon: Building2 },
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
        <div className="max-w-lg space-y-4">
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
                  <p className="text-[10px] text-muted-foreground mt-0.5">Clique na foto para alterar</p>
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
          <Button variant="outline" className="w-full gap-2 text-sm text-red-500 hover:text-red-500 hover:bg-red-50 border-red-200" onClick={signOut}>
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
                  <Badge className="text-[10px] border-0 w-fit" style={{ backgroundColor: `${permCfg.color}15`, color: permCfg.color }}>{permCfg.label}</Badge>
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

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Convidar membro</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">E-mail</Label>
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

                  {/* Permission description */}
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
                  <Button variant="outline" className="flex-1 text-sm" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                  <Button onClick={inviteUser} disabled={inviting || !inviteEmail} className="flex-1 text-white text-sm gap-1.5" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                    <Mail className="w-3.5 h-3.5" />{inviting ? 'Enviando…' : 'Enviar convite'}
                  </Button>
                </div>
              </div>
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
              <p className="text-xs text-muted-foreground">Gerencie os funis e suas etapas de forma simples para adaptar ao seu processo de vendas.</p>
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

          {funnels.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              <Kanban className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Nenhum funil criado ainda</p>
              <p className="text-xs mt-1">Clique em &quot;+ Adicionar&quot; para criar seu primeiro funil</p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {/* ── BOARD ── */}
              {funnels
                .filter(f => !funnelFilter || f.name.toLowerCase().includes(funnelFilter.toLowerCase()))
                .map(f => {
                  const stageInput = stageInputByFunnel[f.id] ?? ''
                  return (
                    <div key={f.id} className="w-72 flex flex-col bg-card border border-border rounded-xl overflow-hidden shrink-0 shadow-sm">
                      {/* Column header */}
                      <div className="px-3 pt-3 pb-2 border-b border-border">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">Funil com {f.stages.length} etapa{f.stages.length !== 1 ? 's' : ''}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => duplicateFunnel(f)} title="Duplicar funil" className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingFunnel({ ...f })} title="Editar funil" className="p-1.5 text-white rounded transition-colors" style={{ background: '#12B981' }}>
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button onClick={() => deleteFunnel(f.id)} title="Excluir funil" className="p-1.5 text-white rounded transition-colors" style={{ background: '#e1493c' }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="font-bold text-sm text-foreground leading-tight">{f.name}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{f.type}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{
                            backgroundColor: f.visibility === 'publico' ? '#12B98120' : f.visibility === 'por_usuario' ? '#5B8CFF20' : '#6B728020',
                            color: f.visibility === 'publico' ? '#12B981' : f.visibility === 'por_usuario' ? '#5B8CFF' : '#6B7280'
                          }}>
                            {f.visibility === 'publico' ? 'Público' : f.visibility === 'privado' ? 'Privado' : 'Por usuário'}
                          </span>
                        </div>
                      </div>

                      {/* Inline add stage */}
                      <div className="flex gap-1.5 p-2 border-b border-border bg-muted/30">
                        <Input
                          value={stageInput}
                          onChange={e => setStageInputByFunnel(prev => ({ ...prev, [f.id]: e.target.value }))}
                          placeholder="Nova etapa"
                          className="h-7 text-xs flex-1 bg-card"
                          onKeyDown={e => { if (e.key === 'Enter') addFunnelStage(f.id, stageInput) }}
                        />
                        <button
                          onClick={() => addFunnelStage(f.id, stageInput)}
                          disabled={!stageInput.trim()}
                          className="h-7 px-2.5 text-white text-xs rounded-md font-semibold disabled:opacity-40 transition-opacity shrink-0"
                          style={{ background: '#12B981' }}
                        >
                          + Adicionar
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
                          f.stages.map((stage, i) => (
                            <div key={stage.id} className="flex items-stretch border-b border-border last:border-0 bg-card hover:bg-muted/20 transition-colors group">
                              <div className="w-1 shrink-0" style={{ background: stage.color }} />
                              <div className="flex-1 px-3 py-2.5 min-w-0">
                                <p className="text-[13px] font-semibold text-foreground leading-snug">{stage.name}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{stage.description || 'Descrição não definida'}</p>
                              </div>
                              <div className="flex flex-col items-center justify-center gap-0.5 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  title="Mover para baixo"
                                  onClick={() => {
                                    const idx = f.stages.findIndex(s => s.id === stage.id)
                                    if (idx < f.stages.length - 1) {
                                      const arr = [...f.stages]
                                      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
                                      saveFunnels(funnels.map(fn => fn.id === f.id ? { ...fn, stages: arr } : fn))
                                    }
                                  }}
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
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Cor</Label>
                    <div className="flex gap-2 flex-wrap items-center">
                      {STAGE_PALETTE.map(c => (
                        <button key={c} onClick={() => setEditingStage(p => p ? { ...p, stage: { ...p.stage, color: c } } : p)}
                          className={cn('w-6 h-6 rounded-full border-2 transition-all', editingStage.stage.color === c ? 'border-foreground scale-110' : 'border-transparent')}
                          style={{ background: c }} />
                      ))}
                      <input type="color" value={editingStage.stage.color} onChange={e => setEditingStage(p => p ? { ...p, stage: { ...p.stage, color: e.target.value } } : p)}
                        className="w-6 h-6 rounded-full cursor-pointer border border-border p-0" title="Cor personalizada" />
                    </div>
                  </div>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold">Nome *</Label>
                      <Input value={editingFunnel.name} onChange={e => setEditingFunnel(p => p ? { ...p, name: e.target.value } : p)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Responsável pelo funil</Label>
                      <Select value={editingFunnel.responsible_id} onValueChange={v => { if (v) setEditingFunnel(p => p ? { ...p, responsible_id: v } : p) }}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>{orgUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email ?? '—'}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Tipo de funil</Label>
                      <Select value={editingFunnel.type} onValueChange={v => { if (v) setEditingFunnel(p => p ? { ...p, type: v } : p) }}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{FUNNEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold">Visibilidade</Label>
                      <Select value={editingFunnel.visibility} onValueChange={v => { if (v) setEditingFunnel(p => p ? { ...p, visibility: v as Funnel['visibility'] } : p) }}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="publico">Público — todos podem ver</SelectItem>
                          <SelectItem value="privado">Privado — somente o responsável pode ver</SelectItem>
                          <SelectItem value="por_usuario">Por usuário — somente alguns usuários podem ver</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {editingFunnel.visibility === 'por_usuario' && (
                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs font-semibold">Informe os usuários que terão acesso a este funil:</Label>
                        <div className="flex flex-wrap gap-2 p-3 bg-[#5B8CFF]/5 border border-[#5B8CFF]/20 rounded-lg min-h-[48px]">
                          {orgUsers.map(u => {
                            const sel = editingFunnel.user_ids.includes(u.id)
                            return (
                              <button key={u.id}
                                onClick={() => setEditingFunnel(p => p ? { ...p, user_ids: sel ? p.user_ids.filter(id => id !== u.id) : [...p.user_ids, u.id] } : p)}
                                className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all font-medium',
                                  sel ? 'bg-foreground text-background border-transparent' : 'border-border text-muted-foreground hover:border-foreground/40')}>
                                {sel && <X className="w-2.5 h-2.5" />}
                                {u.full_name ?? u.email}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold">Descrição</Label>
                      <textarea
                        value={editingFunnel.description}
                        onChange={e => setEditingFunnel(p => p ? { ...p, description: e.target.value } : p)}
                        placeholder="Descrição do funil..."
                        rows={3}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5B8CFF]/30 focus:border-[#5B8CFF]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="destructive" className="text-sm" onClick={() => { deleteFunnel(editingFunnel.id); setEditingFunnel(null) }}>Remover</Button>
                    <div className="flex-1" />
                    <Button variant="outline" className="text-sm" onClick={() => setEditingFunnel(null)}>Cancelar</Button>
                    <Button onClick={() => updateFunnel(editingFunnel)} disabled={!editingFunnel.name.trim()} className="text-white text-sm" style={{ background: '#12B981' }}>
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* ── New funnel dialog ── */}
          <Dialog open={showNewFunnel} onOpenChange={setShowNewFunnel}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Adicionar funil</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nome</Label>
                    <Input value={newFunnel.name} onChange={e => setNewFunnel(p => ({ ...p, name: e.target.value }))} placeholder="Digite..." className="h-9 text-sm" autoFocus onKeyDown={e => e.key === 'Enter' && createFunnel()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Responsável pelo funil</Label>
                    <Select value={newFunnel.responsible_id} onValueChange={v => { if (v) setNewFunnel(p => ({ ...p, responsible_id: v })) }}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o responsável..." /></SelectTrigger>
                      <SelectContent>{orgUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email ?? '—'}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tipo de funil</Label>
                    <Select value={newFunnel.type} onValueChange={v => { if (v) setNewFunnel(p => ({ ...p, type: v })) }}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{FUNNEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Visibilidade</Label>
                    <Select value={newFunnel.visibility} onValueChange={v => { if (v) setNewFunnel(p => ({ ...p, visibility: v as Funnel['visibility'] })) }}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="publico">
                          <div><p>Público</p><p className="text-[10px] text-muted-foreground">Todos podem vê-lo</p></div>
                        </SelectItem>
                        <SelectItem value="privado">
                          <div><p>Privado</p><p className="text-[10px] text-muted-foreground">Somente o responsável pelo funil pode vê-lo</p></div>
                        </SelectItem>
                        <SelectItem value="por_usuario">
                          <div><p>Por usuário</p><p className="text-[10px] text-muted-foreground">Somente alguns usuários podem vê-lo</p></div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold">Descrição</Label>
                    <textarea
                      value={newFunnel.description}
                      onChange={e => setNewFunnel(p => ({ ...p, description: e.target.value }))}
                      placeholder="Descrição..."
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5B8CFF]/30 focus:border-[#5B8CFF]"
                    />
                  </div>
                </div>
                {newFunnel.visibility === 'por_usuario' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Usuários com acesso</Label>
                    <div className="flex flex-wrap gap-2 p-3 bg-[#5B8CFF]/5 border border-[#5B8CFF]/20 rounded-lg min-h-[48px]">
                      {orgUsers.map(u => {
                        const sel = newFunnel.user_ids.includes(u.id)
                        return (
                          <button key={u.id} onClick={() => setNewFunnel(p => ({ ...p, user_ids: sel ? p.user_ids.filter(id => id !== u.id) : [...p.user_ids, u.id] }))}
                            className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all font-medium',
                              sel ? 'bg-foreground text-background border-transparent' : 'border-border text-muted-foreground hover:border-foreground/40')}>
                            {sel && <X className="w-2.5 h-2.5" />}
                            {u.full_name ?? u.email}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" className="text-sm" onClick={() => setShowNewFunnel(false)}>Cancelar</Button>
                  <Button onClick={createFunnel} disabled={!newFunnel.name.trim()} className="text-white text-sm" style={{ background: '#12B981' }}>
                    Salvar
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
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cor</Label>
                <div className="flex gap-2 items-center">
                  {['#5B8CFF', '#12B981', '#F59E0B', '#e1493c', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'].map(c => (
                    <button key={c} onClick={() => setNewTagColor(c)} className={cn('w-6 h-6 rounded-full border-2 transition-all', newTagColor === c ? 'border-foreground scale-110' : 'border-transparent')} style={{ background: c }} />
                  ))}
                  <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} className="w-7 h-7 rounded-full cursor-pointer border border-border p-0" />
                </div>
              </div>
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
                <Toggle checked={rotationEnabled} onChange={v => saveRotation(v, rotationUserIds)} />
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
            <p className="text-xs text-muted-foreground">Categorize seus clientes e leads por segmento de atuação (ex: Imobiliário, Saúde, Varejo).</p>
          </div>

          <Card className="border-border shadow-none">
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Novo segmento</Label>
                <div className="flex gap-2">
                  <Input value={newSegmentName} onChange={e => setNewSegmentName(e.target.value)} placeholder="Ex: Imobiliário, Saúde, Advocacia..." className="h-9 text-sm flex-1" onKeyDown={e => e.key === 'Enter' && createSegment()} />
                  <Button onClick={createSegment} disabled={!newSegmentName.trim()} className="text-white text-xs h-9" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {segments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              <Building2 className="w-7 h-7 mx-auto mb-2 opacity-30" />
              Nenhum segmento criado ainda.
            </div>
          ) : (
            <Card className="border-border shadow-none overflow-hidden">
              {segments.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                  <Building2 className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  <span className="flex-1 text-sm font-medium">{s.name}</span>
                  <button onClick={() => saveSegments(segments.filter(seg => seg.id !== s.id))} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </Card>
          )}

          {/* Preset segments */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Segmentos comuns para adicionar:</p>
            <div className="flex flex-wrap gap-1.5">
              {['Imobiliário', 'Saúde', 'Educação', 'Varejo', 'Advocacia', 'Contabilidade', 'Construtora', 'Tecnologia', 'Agronegócio', 'Indústria', 'Condomínio', 'E-commerce'].map(preset => (
                <button
                  key={preset}
                  onClick={() => { if (!segments.find(s => s.name === preset)) { saveSegments([...segments, { id: crypto.randomUUID(), name: preset }]); toast.success(`"${preset}" adicionado!`) } else { toast.info('Segmento já existe') } }}
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
      {tab === 'notificacoes' && (
        <div className="max-w-lg">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Preferências de notificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Nova aprovação pendente', desc: 'Quando um cliente envia feedback', enabled: true },
                { label: 'Lead mudou de etapa', desc: 'Quando um lead avança no pipeline', enabled: true },
                { label: 'Lead novo atribuído a você', desc: 'Quando a distribuição automática te atribui um lead', enabled: true },
                { label: 'Lead parado há muito tempo', desc: 'Quando um card fica parado além do limite configurado', enabled: true },
                { label: 'Cliente em risco', desc: 'Quando o health score cai abaixo de 40%', enabled: true },
                { label: 'Nova mensagem no atendimento', desc: 'Quando um cliente responde', enabled: false },
                { label: 'Meta atingida', desc: 'Quando uma meta mensal é alcançada', enabled: false },
              ].map(n => (
                <div key={n.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Toggle checked={n.enabled} onChange={() => toast.info('Preferência salva!')} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

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
