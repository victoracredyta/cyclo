'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ChevronRight, ChevronLeft, Upload, Plus, X,
  Users, Kanban, BarChart2, CheckSquare, Bot, Zap,
  PartyPopper, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const SERVICES = [
  'Social Media', 'Tráfego Pago', 'SEO', 'Email Marketing',
  'Branding', 'Criação de Conteúdo', 'Website', 'Consultoria',
]

const SECTORS = [
  'E-commerce', 'Saúde', 'Educação', 'Imobiliário', 'Gastronomia',
  'Tecnologia', 'Varejo', 'Serviços', 'Indústria', 'Outro',
]

const PERMISSIONS = ['Admin', 'Gestor', 'Social Media', 'Designer']

const MODULES = [
  { href: '/crm', icon: Users, label: 'CRM', desc: 'Gerencie sua carteira de clientes' },
  { href: '/pipeline', icon: Kanban, label: 'Pipeline', desc: 'Acompanhe oportunidades de venda' },
  { href: '/planner', icon: BarChart2, label: 'Planner', desc: 'Calendário editorial de conteúdo' },
  { href: '/aprovacoes', icon: CheckSquare, label: 'Aprovações', desc: 'Portal de aprovação de posts' },
  { href: '/ia', icon: Bot, label: 'CYCLO AI', desc: 'Assistente estratégico com IA' },
  { href: '/automacoes', icon: Zap, label: 'Automações', desc: 'Workflows automáticos' },
]

interface Props {
  initialOrgName: string
  orgId: string
}

export function AgencyOnboarding({ initialOrgName, orgId }: Props) {
  const router = useRouter()
  const { step, data, nextStep, prevStep, setData } = useOnboardingStore()
  const [saving, setSaving] = useState(false)
  const [newInviteEmail, setNewInviteEmail] = useState('')
  const [newInvitePermission, setNewInvitePermission] = useState('Social Media')
  const [confetti, setConfetti] = useState(false)

  // Initialize agencyName from prop
  const agencyName = data.agencyName || initialOrgName

  const progress = ((step - 1) / 5) * 100

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `logos/${orgId}.${ext}`
    const { error } = await supabase.storage.from('assets').upload(path, file, { upsert: true })
    if (error) { toast.error('Erro ao fazer upload do logo'); return }
    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path)
    setData({ logoUrl: publicUrl })
    toast.success('Logo enviado!')
  }, [orgId, setData])

  const addInvite = () => {
    if (!newInviteEmail || !newInviteEmail.includes('@')) return
    setData({ teamInvites: [...data.teamInvites, { email: newInviteEmail, permission: newInvitePermission }] })
    setNewInviteEmail('')
    setNewInvitePermission('Social Media')
  }

  const removeInvite = (i: number) => {
    setData({ teamInvites: data.teamInvites.filter((_, idx) => idx !== i) })
  }

  const toggleService = (s: string) => {
    const cur = data.firstClient?.services ?? []
    const next = cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]
    setData({ firstClient: { ...(data.firstClient ?? { name: '', sector: '', mrr: '', email: '' }), services: next } })
  }

  const handleFinish = async () => {
    setSaving(true)
    const supabase = createClient()

    // Save org branding
    await supabase.from('organizations').update({
      logo_url: data.logoUrl || undefined,
      primary_color: data.primaryColor,
      secondary_color: data.secondaryColor,
      tagline: data.tagline || undefined,
      onboarding_completed: true,
    }).eq('id', orgId)

    // Save first client
    if (data.firstClient?.name) {
      await supabase.from('clients').insert({
        organization_id: orgId,
        name: data.firstClient.name,
        sector: data.firstClient.sector || undefined,
        mrr: Number(data.firstClient.mrr) || 0,
        email: data.firstClient.email || undefined,
        services: data.firstClient.services,
      })
    }

    // Mark user onboarding complete
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('users').update({ onboarding_completed: true }).eq('id', user.id)

    setSaving(false)
    setConfetti(true)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  const stepVariants = {
    enter: { opacity: 0, x: 32 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -32 },
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-12 px-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-8">
        <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7">
          <circle cx="16" cy="16" r="12" stroke="#5B8CFF" strokeWidth="2.5" fill="none"/>
          <path d="M16 4 A12 12 0 0 1 28 16" stroke="#5B8CFF" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          <path d="M26.5 12.5 L28 16 L24.5 15" stroke="#5B8CFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <circle cx="16" cy="16" r="2.5" fill="#5B8CFF"/>
        </svg>
        <span className="text-white font-bold text-lg">CYCLO</span>
      </div>

      {/* Progress bar */}
      {step <= 5 && (
        <div className="w-full max-w-lg mb-6">
          <div className="flex justify-between text-xs text-white/40 mb-2">
            <span>Etapa {step} de 5</span>
            <span>{Math.round(progress)}% concluído</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-white/10 [&>div]:bg-[#5B8CFF]" />
        </div>
      )}

      {/* Step card */}
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >

            {/* ── STEP 1: Welcome ─────────────────────────────── */}
            {step === 1 && (
              <div className="text-center space-y-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
                  className="w-20 h-20 mx-auto"
                >
                  <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
                    <circle cx="40" cy="40" r="30" stroke="#5B8CFF" strokeWidth="4" fill="none" strokeDasharray="60 130"/>
                    <circle cx="40" cy="40" r="6" fill="#5B8CFF"/>
                  </svg>
                </motion.div>
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    Bem-vindo ao CYCLO, {initialOrgName}! 👋
                  </h1>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Vamos configurar sua agência em 5 minutos e você já começa a usar a plataforma completa.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { icon: '🎯', label: 'Pipeline de Vendas' },
                    { icon: '📅', label: 'Planner de Conteúdo' },
                    { icon: '🤖', label: 'CYCLO AI' },
                  ].map(f => (
                    <div key={f.label} className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <div className="text-2xl mb-1">{f.icon}</div>
                      <p className="text-xs text-white/70 font-medium">{f.label}</p>
                    </div>
                  ))}
                </div>
                <Button onClick={nextStep} className="w-full bg-[#5B8CFF] hover:bg-[#4a7aee] text-white h-11 font-semibold">
                  Começar configuração <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* ── STEP 2: Agency Identity ──────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Identidade da agência</h2>
                  <p className="text-white/50 text-sm mt-1">Personalize a plataforma com as cores da sua marca</p>
                </div>

                {/* Logo upload */}
                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Logo da agência</Label>
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-[#5B8CFF]/60 transition-colors bg-white/5 group">
                    {data.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.logoUrl} alt="Logo" className="h-16 object-contain" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-white/30 mx-auto mb-1 group-hover:text-[#5B8CFF] transition-colors" />
                        <p className="text-xs text-white/40">PNG, SVG ou JPG · Max 2MB</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                </div>

                {/* Name + Tagline */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Nome da agência</Label>
                    <Input
                      value={agencyName}
                      onChange={e => setData({ agencyName: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="ACREDYTA"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Tagline</Label>
                    <Input
                      value={data.tagline}
                      onChange={e => setData({ tagline: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Sua frase de impacto"
                    />
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Cor primária', key: 'primaryColor' as const, val: data.primaryColor },
                    { label: 'Cor secundária', key: 'secondaryColor' as const, val: data.secondaryColor },
                  ].map(c => (
                    <div key={c.key} className="space-y-1.5">
                      <Label className="text-white/70 text-sm">{c.label}</Label>
                      <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 h-10">
                        <input
                          type="color"
                          value={c.val}
                          onChange={e => setData({ [c.key]: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-white/70 text-sm font-mono">{c.val}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sidebar preview */}
                <div className="rounded-xl overflow-hidden border border-white/10 h-24 flex">
                  <div className="w-14 flex flex-col items-center pt-3 gap-2" style={{ backgroundColor: '#07111F' }}>
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: data.primaryColor }} />
                    {[1,2,3].map(i => <div key={i} className="w-8 h-1.5 rounded-full bg-white/20" />)}
                  </div>
                  <div className="flex-1 flex flex-col pt-3 px-3 gap-1.5" style={{ backgroundColor: '#F6F8FB' }}>
                    <div className="h-2.5 w-24 rounded-full" style={{ backgroundColor: data.primaryColor, opacity: 0.8 }} />
                    <div className="h-2 w-32 rounded-full bg-gray-300" />
                    <div className="h-2 w-20 rounded-full bg-gray-200" />
                  </div>
                </div>
                <p className="text-xs text-white/30 text-center -mt-2">Preview do portal</p>

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={prevStep} className="text-white/50 hover:text-white">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                  <Button onClick={nextStep} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white font-semibold">
                    Continuar <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Team Invites ─────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Convide sua equipe</h2>
                  <p className="text-white/50 text-sm mt-1">Quem vai usar o CYCLO com você?</p>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@agencia.com.br"
                    value={newInviteEmail}
                    onChange={e => setNewInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addInvite()}
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/30"
                  />
                  <Select value={newInvitePermission} onValueChange={v => setNewInvitePermission(v ?? 'Social Media')}>
                    <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERMISSIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={addInvite} size="icon" className="bg-[#5B8CFF] hover:bg-[#4a7aee] shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {data.teamInvites.length > 0 && (
                  <div className="space-y-2">
                    {data.teamInvites.map((inv, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                        <span className="text-sm text-white/80">{inv.email}</span>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[10px] bg-[#5B8CFF]/20 text-[#5B8CFF] border-0">{inv.permission}</Badge>
                          <button onClick={() => removeInvite(i)} className="text-white/30 hover:text-white/70">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {data.teamInvites.length === 0 && (
                  <div className="text-center py-6 text-white/30 text-sm border border-dashed border-white/10 rounded-xl">
                    Adicione membros da equipe acima
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={prevStep} className="text-white/50 hover:text-white">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                  <Button variant="ghost" onClick={nextStep} className="text-white/40 hover:text-white border border-white/10 hover:border-white/30">
                    Pular por agora
                  </Button>
                  <Button onClick={nextStep} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white font-semibold">
                    {data.teamInvites.length > 0 ? `Convidar ${data.teamInvites.length} pessoa(s)` : 'Avançar'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 4: First Client ─────────────────────────── */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Cadastre seu primeiro cliente</h2>
                  <p className="text-white/50 text-sm mt-1">Comece a trabalhar imediatamente</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-white/70 text-sm">Nome do cliente *</Label>
                    <Input
                      placeholder="Ex: FitLife Academia"
                      value={data.firstClient?.name ?? ''}
                      onChange={e => setData({ firstClient: { ...(data.firstClient ?? { sector: '', mrr: '', email: '', services: [] }), name: e.target.value } })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Setor</Label>
                    <Select
                      value={data.firstClient?.sector ?? ''}
                      onValueChange={v => setData({ firstClient: { ...(data.firstClient ?? { name: '', mrr: '', email: '', services: [] }), sector: v ?? '' } })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">MRR (R$)</Label>
                    <Input
                      type="number"
                      placeholder="3500"
                      value={data.firstClient?.mrr ?? ''}
                      onChange={e => setData({ firstClient: { ...(data.firstClient ?? { name: '', sector: '', email: '', services: [] }), mrr: e.target.value } })}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70 text-sm">Serviços contratados</Label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICES.map(s => {
                      const active = data.firstClient?.services.includes(s) ?? false
                      return (
                        <button
                          key={s}
                          onClick={() => toggleService(s)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                            active
                              ? 'bg-[#5B8CFF]/20 border-[#5B8CFF] text-[#5B8CFF]'
                              : 'bg-white/5 border-white/15 text-white/50 hover:text-white/80'
                          )}
                        >
                          {s}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={prevStep} className="text-white/50 hover:text-white">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                  <Button onClick={nextStep} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white font-semibold">
                    {data.firstClient?.name ? 'Salvar e continuar' : 'Pular por agora'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 5: Module Tour ──────────────────────────── */}
            {step === 5 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Conheça os módulos</h2>
                  <p className="text-white/50 text-sm mt-1">Tudo que você precisa em um só lugar</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {MODULES.map(m => {
                    const Icon = m.icon
                    return (
                      <div key={m.label} className="bg-white/5 border border-white/10 rounded-xl p-3 hover:border-[#5B8CFF]/40 transition-colors">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="p-1.5 rounded-lg bg-[#5B8CFF]/15">
                            <Icon className="w-3.5 h-3.5 text-[#5B8CFF]" />
                          </div>
                          <span className="text-sm font-semibold text-white">{m.label}</span>
                        </div>
                        <p className="text-xs text-white/45">{m.desc}</p>
                      </div>
                    )
                  })}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={prevStep} className="text-white/50 hover:text-white">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                  <Button onClick={handleFinish} disabled={saving} className="flex-1 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white font-semibold">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {saving ? 'Salvando...' : 'Ir para o Dashboard'}
                    {!saving && <ChevronRight className="w-4 h-4 ml-1" />}
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 6: Celebration ─────────────────────────── */}
            {confetti && (
              <div className="text-center space-y-5 py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <PartyPopper className="w-16 h-16 text-[#F59E0B] mx-auto" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-white">CYCLO configurado! 🎉</h2>
                  <p className="text-white/60 text-sm mt-2">Redirecionando para o seu dashboard...</p>
                </div>
                <div className="flex justify-center gap-4 text-sm text-white/50">
                  <span>✓ Identidade salva</span>
                  {data.teamInvites.length > 0 && <span>✓ {data.teamInvites.length} convites</span>}
                  {data.firstClient?.name && <span>✓ 1 cliente</span>}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
