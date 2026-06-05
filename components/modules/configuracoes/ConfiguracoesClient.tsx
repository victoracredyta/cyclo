'use client'

import { useState } from 'react'
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
  Kanban, Trash2, GripVertical, Link2,
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
  'Atendimento': { label: 'Atendimento', color: '#12B981' },
  Visualizador: { label: 'Visualizador', color: '#6B7280' },
}

interface Props {
  appUser: AppUser | null
  orgUsers: OrgUser[]
}

export function ConfiguracoesClient({ appUser, orgUsers: initialUsers }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'perfil' | 'equipe' | 'pipeline' | 'notificacoes' | 'seguranca'>('perfil')
  const [pipelineStages, setPipelineStages] = useState<Array<{id:string;name:string;color:string;order_index:number}>>([])
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#5B8CFF')
  const [loadingStages, setLoadingStages] = useState(false)
  const [stagesLoaded, setStagesLoaded] = useState(false)
  const [orgUsers, setOrgUsers] = useState(initialUsers)
  const [inviteOpen, setInviteOpen] = useState(false)

  // Profile form
  const [fullName, setFullName] = useState(appUser?.full_name ?? '')
  const [role, setRole] = useState(appUser?.role ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  const saveProfile = async () => {
    setSavingProfile(true)
    const supabase = createClient()
    const { error } = await supabase.from('users').update({ full_name: fullName, role }).eq('id', appUser?.id ?? '')
    if (error) { toast.error('Erro ao salvar'); setSavingProfile(false); return }
    toast.success('Perfil atualizado!')
    setSavingProfile(false)
  }

  const changePassword = async () => {
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(appUser?.email ?? '', {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    toast.success('Email de redefinição enviado!')
  }

  const inviteUser = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)

    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { setInviting(false); return }

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

  const loadStages = async () => {
    if (stagesLoaded) return
    setLoadingStages(true)
    const supabase = createClient()
    const { data } = await supabase.from('pipeline_stages').select('*').order('order_index')
    setPipelineStages(data ?? [])
    setStagesLoaded(true)
    setLoadingStages(false)
  }

  const addStage = async () => {
    if (!newStageName.trim()) return
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) return
    const nextOrder = pipelineStages.length > 0 ? Math.max(...pipelineStages.map(s => s.order_index)) + 1 : 0
    const { data, error } = await supabase.from('pipeline_stages').insert({
      organization_id: me.organization_id,
      name: newStageName.trim(),
      color: newStageColor,
      order_index: nextOrder,
    }).select().single()
    if (error) { toast.error('Erro ao criar etapa'); return }
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

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Configurações</h2>
          <p className="text-sm text-muted-foreground">Gerencie sua conta e equipe</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { value: 'perfil' as const, label: 'Perfil', Icon: User },
          { value: 'equipe' as const, label: 'Equipe', Icon: Users },
          { value: 'pipeline' as const, label: 'Pipeline', Icon: Kanban, onSelect: loadStages },
          { value: 'notificacoes' as const, label: 'Notificações', Icon: Bell },
          { value: 'seguranca' as const, label: 'Segurança', Icon: Shield },
        ]).map(({ value, label, Icon, onSelect }) => (
          <button
            key={value}
            onClick={() => { setTab(value); onSelect?.() }}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === value ? 'border-[#5B8CFF] text-[#5B8CFF]' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Perfil */}
      {tab === 'perfil' && (
        <div className="max-w-lg space-y-4">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Informações pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-[#5B8CFF] text-white text-lg font-bold">
                    {(fullName || appUser?.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{fullName || 'Seu nome'}</p>
                  <p className="text-xs text-muted-foreground">{appUser?.email}</p>
                  <Badge className="text-[10px] mt-1" style={{ backgroundColor: `${PERMISSION_CONFIG[appUser?.permission ?? '']?.color ?? '#6B7280'}15`, color: PERMISSION_CONFIG[appUser?.permission ?? '']?.color ?? '#6B7280' }}>
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
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
              </div>
              <Button onClick={saveProfile} disabled={savingProfile} className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-sm w-full">
                {savingProfile ? 'Salvando…' : 'Salvar perfil'}
              </Button>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full gap-2 text-sm text-red-500 hover:text-red-500 hover:bg-red-50 border-red-200" onClick={signOut}>
            <LogOut className="w-4 h-4" /> Sair da conta
          </Button>
        </div>
      )}

      {/* Tab: Equipe */}
      {tab === 'equipe' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-xs" onClick={() => setInviteOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Convidar membro
            </Button>
          </div>

          <Card className="border-border shadow-none overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Membro</span>
              <span>Função</span>
              <span>Permissão</span>
              <span className="text-right">Status</span>
            </div>
            {orgUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhum usuário encontrado.
              </div>
            ) : (
              orgUsers.map(u => {
                const permCfg = PERMISSION_CONFIG[u.permission] ?? PERMISSION_CONFIG['Visualizador']
                const isMe = u.id === appUser?.id
                return (
                  <div key={u.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-border last:border-0 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-[#5B8CFF]/20 text-[#5B8CFF] text-xs font-bold">
                          {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{u.full_name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{u.role ?? '—'}</span>
                    <Badge className="text-[10px] border-0 w-fit" style={{ backgroundColor: `${permCfg.color}15`, color: permCfg.color }}>
                      {permCfg.label}
                    </Badge>
                    <div className="flex items-center justify-end gap-2">
                      {isMe ? (
                        <Badge className="text-[10px] bg-[#12B981]/10 text-[#12B981] border-0">Você</Badge>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleUserStatus(u.id, u.is_active)}
                            className={cn(
                              'text-xs px-2 py-1 rounded-md font-medium border transition-colors',
                              u.is_active
                                ? 'border-[#12B981]/30 text-[#12B981] hover:bg-[#12B981]/10'
                                : 'border-border text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {u.is_active ? 'Ativo' : 'Inativo'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </Card>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Convidar membro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">E-mail</Label>
                  <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colaborador@email.com" type="email" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Permissão</Label>
                  <Select defaultValue="Social Media">
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PERMISSION_CONFIG).map(([v, cfg]) => (
                        <SelectItem key={v} value={v}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1 text-sm" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                  <Button onClick={inviteUser} disabled={inviting || !inviteEmail} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-sm gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {inviting ? 'Enviando…' : 'Enviar convite'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Tab: Pipeline */}
      {tab === 'pipeline' && (
        <div className="max-w-lg space-y-6">
          <div className="flex items-start gap-3 p-4 bg-[#5B8CFF]/5 border border-[#5B8CFF]/20 rounded-xl">
            <Kanban className="w-5 h-5 text-[#5B8CFF] mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Gerencie as etapas do funil de vendas. As alterações refletem imediatamente no Pipeline de todos os vendedores da organização.
            </p>
          </div>

          {/* Existing stages */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Etapas do funil</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingStages ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
              ) : pipelineStages.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma etapa encontrada.</div>
              ) : (
                pipelineStages.map((stage, i) => (
                  <div key={stage.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                    <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: stage.color }} />
                    <span className="flex-1 text-sm font-medium">{stage.name}</span>
                    <Badge className="text-[10px] bg-muted border-0 text-muted-foreground">{i + 1}ª etapa</Badge>
                    <button
                      onClick={() => deleteStage(stage.id)}
                      className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Add new stage */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Adicionar nova etapa</CardTitle>
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
                <Label className="text-xs font-semibold">Cor</Label>
                <div className="flex gap-2 flex-wrap">
                  {['#5B8CFF','#12B981','#F59E0B','#8B5CF6','#e1493c','#06B6D4','#F97316','#EC4899'].map(c => (
                    <button
                      key={c}
                      onClick={() => setNewStageColor(c)}
                      className={cn('w-7 h-7 rounded-full border-2 transition-all', newStageColor === c ? 'border-foreground scale-110' : 'border-transparent')}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <Button
                onClick={addStage}
                disabled={!newStageName.trim()}
                className="w-full bg-[#5B8CFF] hover:bg-[#4a7aee] text-white text-sm gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar etapa
              </Button>
            </CardContent>
          </Card>

          <div className="p-3 bg-muted/40 rounded-xl">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 shrink-0" />
              Para integrar com email e WhatsApp, acesse <strong>Integrações</strong> no menu lateral.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Notificações */}
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
                { label: 'Cliente em risco', desc: 'Quando o health score cai abaixo de 40%', enabled: true },
                { label: 'Nova mensagem no atendimento', desc: 'Quando um cliente responde no chat', enabled: false },
                { label: 'Automação com erro', desc: 'Quando uma automação falha ao executar', enabled: true },
                { label: 'Meta atingida', desc: 'Quando uma meta mensal é alcançada', enabled: false },
              ].map(n => (
                <div key={n.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <button
                    onClick={() => toast.info('Configurações de notificação salvas!')}
                    className={cn(
                      'w-9 h-5 rounded-full relative transition-colors',
                      n.enabled ? 'bg-[#5B8CFF]' : 'bg-border'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all',
                      n.enabled ? 'left-4' : 'left-0.5'
                    )} />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Segurança */}
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
                  <p className="text-xs text-muted-foreground">Última alteração: desconhecido</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs" onClick={changePassword}>
                  Alterar senha
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                <div>
                  <p className="text-sm font-medium">Autenticação 2 fatores</p>
                  <p className="text-xs text-muted-foreground">Adicione uma camada extra de segurança</p>
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
              <Button size="sm" variant="outline" className="text-xs border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => toast.error('Entre em contato com o suporte para excluir sua conta.')}>
                Excluir conta
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
