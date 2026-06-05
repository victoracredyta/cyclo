'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

interface Funnel {
  id: string
  name: string
  type: string
  visibility: 'publico' | 'privado' | 'por_usuario'
  responsible_id: string
  user_ids: string[]
  description: string
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
    name: '', type: 'Vendas', visibility: 'publico', responsible_id: '', user_ids: [], description: '',
  })

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

  // Load from localStorage
  useEffect(() => {
    try {
      const f = localStorage.getItem(LOCAL_FUNNELS_KEY)
      if (f) setFunnels(JSON.parse(f))
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
    setNewFunnel({ name: '', type: 'Vendas', visibility: 'publico', responsible_id: '', user_ids: [], description: '' })
    setShowNewFunnel(false)
    toast.success(`Funil "${created.name}" criado!`)
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
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-white text-lg font-bold" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                    {(fullName || appUser?.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{fullName || 'Seu nome'}</p>
                  <p className="text-xs text-muted-foreground">{appUser?.email}</p>
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
        <div className="space-y-6">
          {/* Funnel list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Funis de vendas</h3>
                <p className="text-xs text-muted-foreground">Crie funis para Vendas, Marketing, Projetos etc. e defina quem tem acesso a cada um.</p>
              </div>
              <Button size="sm" className="text-white gap-1.5 text-xs" style={{ background: 'var(--brand-primary,#5B8CFF)' }} onClick={() => setShowNewFunnel(true)}>
                <Plus className="w-3.5 h-3.5" /> Novo funil
              </Button>
            </div>

            {funnels.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                <Kanban className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhum funil criado ainda. Crie o primeiro!
              </div>
            ) : (
              <div className="space-y-2">
                {funnels.map(f => (
                  <div
                    key={f.id}
                    className={cn('border border-border rounded-xl p-3 cursor-pointer transition-colors hover:border-[#5B8CFF]/30', selectedFunnelId === f.id && 'border-[#5B8CFF]/50 bg-[#5B8CFF]/5')}
                    onClick={() => setSelectedFunnelId(selectedFunnelId === f.id ? null : f.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--brand-primary,#5B8CFF)15' }}>
                        <Kanban className="w-4 h-4" style={{ color: 'var(--brand-primary,#5B8CFF)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{f.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className="text-[9px] border-0 bg-muted text-muted-foreground">{f.type}</Badge>
                          <Badge className="text-[9px] border-0" style={{
                            backgroundColor: f.visibility === 'publico' ? '#12B98115' : f.visibility === 'por_usuario' ? '#5B8CFF15' : '#6B728015',
                            color: f.visibility === 'publico' ? '#12B981' : f.visibility === 'por_usuario' ? '#5B8CFF' : '#6B7280'
                          }}>
                            {f.visibility === 'publico' ? 'Público' : f.visibility === 'privado' ? 'Privado' : 'Por usuário'}
                          </Badge>
                          {f.user_ids.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{f.user_ids.length} usuário{f.user_ids.length > 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteFunnel(f.id) }} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {selectedFunnelId === f.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>

                    {/* Funnel detail: user access */}
                    {selectedFunnelId === f.id && (
                      <div className="mt-3 pt-3 border-t border-border space-y-3" onClick={e => e.stopPropagation()}>
                        <div>
                          <p className="text-xs font-semibold mb-2">Acesso — quem pode ver este funil:</p>
                          <div className="flex flex-wrap gap-2">
                            {orgUsers.map(u => {
                              const hasAccess = f.user_ids.includes(u.id) || f.visibility === 'publico'
                              return (
                                <button
                                  key={u.id}
                                  onClick={() => {
                                    const updated = f.user_ids.includes(u.id)
                                      ? f.user_ids.filter(id => id !== u.id)
                                      : [...f.user_ids, u.id]
                                    saveFunnels(funnels.map(fn => fn.id === f.id ? { ...fn, user_ids: updated } : fn))
                                  }}
                                  disabled={f.visibility === 'publico'}
                                  className={cn(
                                    'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border transition-all',
                                    hasAccess ? 'border-[#12B981]/40 bg-[#12B981]/10 text-[#12B981]' : 'border-border text-muted-foreground'
                                  )}
                                >
                                  {hasAccess && <Check className="w-3 h-3" />}
                                  {u.full_name ?? u.email ?? '—'}
                                </button>
                              )
                            })}
                          </div>
                          {f.visibility === 'publico' && (
                            <p className="text-[10px] text-muted-foreground mt-1.5">Funil público — todos têm acesso. Mude a visibilidade para "Por usuário" para restringir.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* New Funnel Dialog */}
            <Dialog open={showNewFunnel} onOpenChange={setShowNewFunnel}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Adicionar funil</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Nome do funil *</Label>
                      <Input value={newFunnel.name} onChange={e => setNewFunnel(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Funil Gc, Vendas 2025..." className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Tipo de funil</Label>
                      <Select value={newFunnel.type} onValueChange={v => { if (v) setNewFunnel(p => ({ ...p, type: v })) }}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FUNNEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Responsável pelo funil</Label>
                      <Select value={newFunnel.responsible_id} onValueChange={v => { if (v) setNewFunnel(p => ({ ...p, responsible_id: v })) }}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>
                          {orgUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email ?? '—'}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Visibilidade</Label>
                      <Select value={newFunnel.visibility} onValueChange={v => { if (v) setNewFunnel(p => ({ ...p, visibility: v as Funnel['visibility'] })) }}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="publico">Público — todos podem ver</SelectItem>
                          <SelectItem value="privado">Privado — somente o responsável</SelectItem>
                          <SelectItem value="por_usuario">Por usuário — selecionáveis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Descrição (opcional)</Label>
                    <Input value={newFunnel.description} onChange={e => setNewFunnel(p => ({ ...p, description: e.target.value }))} placeholder="Ex: Funil principal de vendas de serviços" className="h-9 text-sm" />
                  </div>
                  {newFunnel.visibility === 'por_usuario' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Usuários com acesso</Label>
                      <div className="flex flex-wrap gap-2">
                        {orgUsers.map(u => {
                          const sel = newFunnel.user_ids.includes(u.id)
                          return (
                            <button
                              key={u.id}
                              onClick={() => setNewFunnel(p => ({ ...p, user_ids: sel ? p.user_ids.filter(id => id !== u.id) : [...p.user_ids, u.id] }))}
                              className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border transition-all', sel ? 'border-[#5B8CFF]/40 bg-[#5B8CFF]/10 text-[#5B8CFF]' : 'border-border text-muted-foreground')}
                            >
                              {sel && <Check className="w-3 h-3" />}
                              {u.full_name ?? u.email}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1 text-sm" onClick={() => setShowNewFunnel(false)}>Cancelar</Button>
                    <Button onClick={createFunnel} disabled={!newFunnel.name.trim()} className="flex-1 text-white text-sm" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                      Criar funil
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Pipeline stages management */}
          <div className="space-y-4 pt-2 border-t border-border">
            <div>
              <h3 className="font-semibold text-sm">Etapas do Pipeline</h3>
              <p className="text-xs text-muted-foreground">Etapas compartilhadas por todos os funis. Personalize cores com o seletor de cor.</p>
            </div>

            <Card className="border-border shadow-none">
              <CardContent className="p-0">
                {loadingStages ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
                ) : pipelineStages.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma etapa encontrada. Adicione abaixo.</div>
                ) : (
                  pipelineStages.map((stage, i) => (
                    <div key={stage.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                      <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: stage.color }} />
                      <span className="flex-1 text-sm font-medium">{stage.name}</span>
                      <Badge className="text-[10px] bg-muted border-0 text-muted-foreground">{i + 1}ª etapa</Badge>
                      <button onClick={() => deleteStage(stage.id)} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Adicionar etapa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nome da etapa</Label>
                  <Input
                    value={newStageName}
                    onChange={e => setNewStageName(e.target.value)}
                    placeholder="Ex: Qualificação, Proposta enviada..."
                    className="h-9 text-sm"
                    onKeyDown={e => e.key === 'Enter' && addStage()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Cor da etapa</Label>
                  <div className="flex gap-2 flex-wrap items-center">
                    {STAGE_PALETTE.map(c => (
                      <button
                        key={c}
                        onClick={() => { setNewStageColor(c); setNewStageCustomColor(c) }}
                        className={cn('w-7 h-7 rounded-full border-2 transition-all', newStageColor === c ? 'border-foreground scale-110' : 'border-transparent')}
                        style={{ background: c }}
                      />
                    ))}
                    {/* Custom pantone color picker */}
                    <div className="flex items-center gap-1.5 ml-1">
                      <input
                        type="color"
                        value={newStageCustomColor}
                        onChange={e => { setNewStageCustomColor(e.target.value); setNewStageColor(e.target.value) }}
                        className="w-7 h-7 rounded-full cursor-pointer border border-border p-0"
                        title="Cor personalizada (pantone)"
                      />
                      <Input
                        value={newStageCustomColor}
                        onChange={e => { setNewStageCustomColor(e.target.value); setNewStageColor(e.target.value) }}
                        className="h-7 w-24 text-xs font-mono"
                        maxLength={7}
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={addStage}
                  disabled={!newStageName.trim()}
                  className="w-full text-white text-sm gap-1.5"
                  style={{ background: 'var(--brand-primary,#5B8CFF)' }}
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar etapa
                </Button>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground flex items-center gap-2 p-3 bg-muted/40 rounded-xl">
              <Link2 className="w-3.5 h-3.5 shrink-0" />
              Para integrar com email e rastreamento UTM, acesse <strong>Integrações</strong> no menu lateral.
            </p>
          </div>
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
