'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronDown, Bell, UserPlus, ArrowRight, Activity, AlertCircle, Trophy, MessageSquare, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type EventDef = {
  key: string
  title: string
  desc: string
  defaultSubject: string
  defaultBody: string
  Icon: React.ElementType
  color: string
}

const EVENTS: EventDef[] = [
  {
    key: 'lead_transfer',
    title: 'Lead transferido para você',
    desc: 'Quando outro usuário transfere uma oportunidade pra você.',
    defaultSubject: 'Você recebeu um lead — {lead}',
    defaultBody: '{remetente} transferiu o lead "{lead}" para você. Acesse o CYCLO para dar continuidade.',
    Icon: UserPlus,
    color: '#0EA5E9',
  },
  {
    key: 'lead_stage_change',
    title: 'Lead mudou de etapa',
    desc: 'Quando um lead seu avança ou recua no pipeline.',
    defaultSubject: 'Lead movido — {lead}',
    defaultBody: 'O lead "{lead}" foi movido de {de} para {para}.',
    Icon: ArrowRight,
    color: '#5B8CFF',
  },
  {
    key: 'lead_assigned',
    title: 'Lead novo atribuído por distribuição automática',
    desc: 'Quando a rotação automática (round-robin) te atribui um novo lead.',
    defaultSubject: 'Novo lead recebido — {lead}',
    defaultBody: 'Um novo lead "{lead}" chegou e foi atribuído a você pela distribuição automática.',
    Icon: UserPlus,
    color: '#12B981',
  },
  {
    key: 'task_due',
    title: 'Atividade vencendo hoje',
    desc: 'Lembrete diário (8h da manhã) das atividades que vencem hoje.',
    defaultSubject: 'Você tem {qtd} atividade(s) hoje',
    defaultBody: 'Suas atividades de hoje no CYCLO:\n\n{lista_atividades}',
    Icon: Activity,
    color: '#F59E0B',
  },
  {
    key: 'client_risk',
    title: 'Cliente em risco',
    desc: 'Quando um cliente seu fica com sinais de churn (sem atividade há muito tempo).',
    defaultSubject: 'Atenção — cliente em risco',
    defaultBody: 'O cliente "{cliente}" precisa de atenção. Última interação há {dias} dias.',
    Icon: AlertCircle,
    color: '#e1493c',
  },
  {
    key: 'meta_achieved',
    title: 'Meta atingida',
    desc: 'Quando uma meta sua chega a 100%.',
    defaultSubject: '🏆 Parabéns! Meta "{meta}" atingida',
    defaultBody: 'Você bateu a meta "{meta}" — {valor_atual} de {valor_alvo}. 🎉',
    Icon: Trophy,
    color: '#8B5CF6',
  },
  {
    key: 'new_message',
    title: 'Nova mensagem de cliente',
    desc: 'Quando um cliente responde no módulo Atendimento.',
    defaultSubject: '{cliente} respondeu uma mensagem',
    defaultBody: 'Você recebeu uma nova mensagem do cliente "{cliente}".',
    Icon: MessageSquare,
    color: '#0EA5E9',
  },
]

type Pref = {
  event_type: string
  in_app_enabled: boolean
  email_enabled: boolean
  email_to: string | null
  email_subject: string | null
  email_body: string | null
}

type AppUser = { id: string; email: string | null } | null

export function NotificationPrefsPanel({ appUser }: { appUser: AppUser }) {
  const [prefs, setPrefs] = useState<Record<string, Pref>>({})
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('notification_prefs').select('*')
      const map: Record<string, Pref> = {}
      ;(data ?? []).forEach((p) => { map[p.event_type] = p as Pref })
      setPrefs(map)
      setLoaded(true)
    }
    load()
  }, [])

  const getPref = (key: string): Pref => {
    return prefs[key] ?? {
      event_type: key,
      in_app_enabled: true,
      email_enabled: true,
      email_to: null,
      email_subject: null,
      email_body: null,
    }
  }

  const savePref = async (key: string, patch: Partial<Pref>) => {
    if (!appUser?.id) return
    setSavingKey(key)
    const current = getPref(key)
    const next: Pref = { ...current, ...patch }
    setPrefs(prev => ({ ...prev, [key]: next }))

    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { toast.error('Org não encontrada'); setSavingKey(null); return }

    const { error } = await supabase.from('notification_prefs').upsert({
      user_id: appUser.id,
      organization_id: me.organization_id,
      event_type: key,
      in_app_enabled: next.in_app_enabled,
      email_enabled: next.email_enabled,
      email_to: next.email_to,
      email_subject: next.email_subject,
      email_body: next.email_body,
    }, { onConflict: 'user_id,event_type' })

    if (error) toast.error(`Erro: ${error.message}`)
    setSavingKey(null)
  }

  if (!loaded) {
    return (
      <div className="max-w-2xl text-center py-8 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" /> Carregando preferências...
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h3 className="font-semibold text-sm">Preferências de notificação</h3>
        <p className="text-xs text-muted-foreground">
          Escolha como e quando ser avisado de cada tipo de evento. Email usa o SMTP configurado em Integrações.
        </p>
      </div>

      {EVENTS.map(ev => {
        const p = getPref(ev.key)
        const isOpen = expanded === ev.key
        const Icon = ev.Icon
        const subject = p.email_subject ?? ev.defaultSubject
        const body = p.email_body ?? ev.defaultBody
        const to = p.email_to ?? (appUser?.email ?? '')
        return (
          <Card key={ev.key} className="border-border shadow-none overflow-hidden">
            <CardContent className="p-0">
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${ev.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: ev.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight">{ev.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{ev.desc}</p>
                </div>

                {/* Quick toggles */}
                <div className="flex items-center gap-3 shrink-0">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Bell className="w-3 h-3 text-muted-foreground" />
                    <input
                      type="checkbox"
                      checked={p.in_app_enabled}
                      onChange={e => savePref(ev.key, { in_app_enabled: e.target.checked })}
                      className="accent-[#5B8CFF] w-3.5 h-3.5"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    <input
                      type="checkbox"
                      checked={p.email_enabled}
                      onChange={e => savePref(ev.key, { email_enabled: e.target.checked })}
                      className="accent-[#5B8CFF] w-3.5 h-3.5"
                    />
                  </label>
                  <button
                    onClick={() => setExpanded(isOpen ? null : ev.key)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                  </button>
                </div>
              </div>

              {/* Expanded: customize email */}
              {isOpen && (
                <div className="border-t border-border bg-muted/10 px-4 py-4 space-y-3">
                  {!p.email_enabled && (
                    <div className="text-[11px] bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-2.5 py-1.5 rounded-md border border-yellow-500/20">
                      Email desativado — os campos abaixo só passam a valer quando o ícone ✉️ estiver marcado.
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Email destino</Label>
                    <Input
                      value={to}
                      onChange={e => savePref(ev.key, { email_to: e.target.value || null })}
                      placeholder={appUser?.email ?? 'seu@email.com'}
                      className="h-8 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">Vazio = usa seu email do CYCLO ({appUser?.email})</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Assunto do email</Label>
                    <Input
                      value={subject}
                      onChange={e => savePref(ev.key, { email_subject: e.target.value || null })}
                      placeholder={ev.defaultSubject}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Corpo do email</Label>
                    <textarea
                      value={body}
                      onChange={e => savePref(ev.key, { email_body: e.target.value || null })}
                      placeholder={ev.defaultBody}
                      className="w-full text-xs rounded-md border border-input bg-background px-2.5 py-2 min-h-[80px] resize-y font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Variáveis disponíveis: {'{lead}'}, {'{remetente}'}, {'{de}'}, {'{para}'}, {'{cliente}'}, {'{meta}'}</p>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => savePref(ev.key, { email_subject: null, email_body: null, email_to: null })}
                    >
                      Restaurar padrão
                    </Button>
                    {savingKey === ev.key && (
                      <span className="ml-2 text-[11px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> salvando
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      <p className="text-[11px] text-muted-foreground text-center pt-2">
        Os ícones <Bell className="inline w-3 h-3" /> e <Mail className="inline w-3 h-3" /> controlam notificações in-app (sininho) e por email respectivamente.
      </p>
    </div>
  )
}
