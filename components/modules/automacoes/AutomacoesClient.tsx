'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Plus, Zap, Play, Pause, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Automation = {
  id: string
  name: string
  trigger_type: string | null
  action_type: string | null
  status: string
  runs_count: number
  errors_count: number
  last_run_at: string | null
  created_at: string
}

const TRIGGER_LABELS: Record<string, string> = {
  'novo_lead': 'Novo lead criado',
  'lead_mudou_etapa': 'Lead mudou de etapa',
  'aprovacao_pendente': 'Aprovação pendente',
  'cliente_em_risco': 'Cliente em risco',
  'aniversario_cliente': 'Aniversário do cliente',
  'prazo_proximo': 'Prazo se aproximando',
  'pagamento_recebido': 'Pagamento recebido',
  'novo_contrato': 'Novo contrato fechado',
}

const ACTION_LABELS: Record<string, string> = {
  'enviar_email': 'Enviar e-mail',
  'enviar_whatsapp': 'Enviar WhatsApp',
  'criar_tarefa': 'Criar tarefa',
  'notificar_equipe': 'Notificar equipe',
  'atualizar_status': 'Atualizar status',
  'criar_atividade': 'Criar atividade',
  'webhook_n8n': 'Webhook / N8N',
}

const EXAMPLE_AUTOMATIONS = [
  {
    name: 'Boas-vindas ao novo lead',
    trigger_type: 'novo_lead',
    action_type: 'enviar_email',
    desc: 'Lead criado → Email automático de boas-vindas',
  },
  {
    name: 'Parabéns pela decisão — novo cliente',
    trigger_type: 'novo_contrato',
    action_type: 'enviar_whatsapp',
    desc: 'Contrato fechado → WhatsApp de parabéns',
  },
  {
    name: 'Lembrete: clientes para ligar hoje',
    trigger_type: 'lead_mudou_etapa',
    action_type: 'criar_tarefa',
    desc: 'Lead em nova etapa → Cria tarefa de follow-up',
  },
  {
    name: 'Follow-up de proposta enviada',
    trigger_type: 'prazo_proximo',
    action_type: 'enviar_whatsapp',
    desc: 'Prazo chegando → WhatsApp de follow-up',
  },
  {
    name: 'Alerta de cliente em risco',
    trigger_type: 'cliente_em_risco',
    action_type: 'notificar_equipe',
    desc: 'Health score baixo → Notifica equipe interna',
  },
  {
    name: 'Lembrete de aprovação pendente',
    trigger_type: 'aprovacao_pendente',
    action_type: 'enviar_whatsapp',
    desc: 'Aprovação aguardando → WhatsApp para o cliente',
  },
  {
    name: 'Parabéns de aniversário',
    trigger_type: 'aniversario_cliente',
    action_type: 'enviar_whatsapp',
    desc: 'Aniversário do cliente → Mensagem personalizada',
  },
  {
    name: 'Confirmação de pagamento recebido',
    trigger_type: 'pagamento_recebido',
    action_type: 'notificar_equipe',
    desc: 'Pagamento confirmado → Notifica financeiro',
  },
]

const DEFAULT_MESSAGES: Record<string, string> = {
  'novo_lead|enviar_email': `Olá {nome}!\n\nFicamos muito felizes em receber seu contato. Nossa equipe já está analisando suas necessidades e em breve entraremos em contato.\n\nQualquer dúvida, estamos à disposição!\n\nAtenciosamente,\n{agencia}`,
  'novo_contrato|enviar_whatsapp': `🎉 Parabéns pela excelente decisão, {nome}!\n\nÉ um prazer tê-lo(a) como cliente. Nossa equipe já está se preparando para entregar os melhores resultados para sua empresa.\n\nVamos juntos! 🚀\n\n{agencia}`,
  'aniversario_cliente|enviar_whatsapp': `🎂 Feliz aniversário, {nome}!\n\nEm nome de toda a equipe {agencia}, desejamos um dia incrível repleto de realizações.\n\nMuito obrigado por confiar no nosso trabalho! 🙏`,
  'prazo_proximo|enviar_whatsapp': `Olá {nome}! 👋\n\nPassando para dar um olá e ver se ficou alguma dúvida sobre a proposta que enviamos.\n\nEstamos à disposição para uma conversa rápida. Quando for bom para você?`,
  'aprovacao_pendente|enviar_whatsapp': `Olá {nome}!\n\nTemos um conteúdo aguardando sua aprovação. 📋\n\nAcesse o portal para visualizar e aprovar: {link}\n\nQualquer ajuste é só nos dizer!`,
}

function timeAgo(date: string | null) {
  if (!date) return 'Nunca'
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

interface AutomacoesClientProps {
  automations: Automation[]
}

export function AutomacoesClient({ automations: initial }: AutomacoesClientProps) {
  const [automations, setAutomations] = useState(initial)
  const [creating, setCreating] = useState(false)

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'ativo' ? 'pausado' : 'ativo'
    const supabase = createClient()
    const { error } = await supabase.from('automations').update({ status: next }).eq('id', id)
    if (error) { toast.error('Erro ao atualizar'); return }
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, status: next } : a))
    toast.success(next === 'ativo' ? 'Automação ativada' : 'Automação pausada')
  }

  const createExample = async (example: (typeof EXAMPLE_AUTOMATIONS)[0]) => {
    setCreating(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('users').select('organization_id').single()
    if (!me?.organization_id) { setCreating(false); return }

    const msgKey = `${example.trigger_type}|${example.action_type}`
    const defaultMsg = DEFAULT_MESSAGES[msgKey] ?? ''

    const { data, error } = await supabase.from('automations').insert({
      organization_id: me.organization_id,
      name: example.name,
      trigger_type: example.trigger_type,
      action_type: example.action_type,
      status: 'pausado',
      config: { message: defaultMsg },
    }).select().single()

    if (error) { toast.error('Erro ao criar'); setCreating(false); return }
    setAutomations(prev => [data as Automation, ...prev])
    toast.success('Automação criada!')
    setCreating(false)
  }

  const active = automations.filter(a => a.status === 'ativo').length
  const totalRuns = automations.reduce((s, a) => s + a.runs_count, 0)
  const totalErrors = automations.reduce((s, a) => s + a.errors_count, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Automações</h2>
          <p className="text-sm text-muted-foreground">{active} ativas · {totalRuns} execuções</p>
        </div>
        <Button size="sm" className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-xs" disabled>
          <Plus className="w-3.5 h-3.5" /> Nova automação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Ativas', value: active, color: '#12B981', Icon: Zap },
          { label: 'Execuções', value: totalRuns, color: '#5B8CFF', Icon: RefreshCw },
          { label: 'Erros', value: totalErrors, color: totalErrors > 0 ? '#e1493c' : '#6B7280', Icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
              <s.Icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Automation list */}
      {automations.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-muted-foreground">Comece com um template:</p>
          <div className="grid gap-3">
            {EXAMPLE_AUTOMATIONS.map((ex, i) => (
              <button
                key={i}
                onClick={() => createExample(ex)}
                disabled={creating}
                className="flex items-center gap-4 p-4 bg-card border border-dashed border-border rounded-xl hover:border-[#5B8CFF]/60 hover:bg-[#5B8CFF]/5 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-full bg-[#5B8CFF]/10 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-[#5B8CFF]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{ex.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ex.desc}</p>
                </div>
                <Badge className="text-[10px] bg-[#5B8CFF]/10 text-[#5B8CFF] border-0 group-hover:bg-[#5B8CFF] group-hover:text-white transition-colors shrink-0">
                  + Adicionar
                </Badge>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map((auto, i) => (
            <motion.div
              key={auto.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl"
            >
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                auto.status === 'ativo' ? 'bg-[#12B981]/10' : 'bg-muted',
              )}>
                <Zap className={cn('w-4 h-4', auto.status === 'ativo' ? 'text-[#12B981]' : 'text-muted-foreground')} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{auto.name}</p>
                {(auto.trigger_type || auto.action_type) && (
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                    {auto.trigger_type && <span>{TRIGGER_LABELS[auto.trigger_type] ?? auto.trigger_type}</span>}
                    {auto.trigger_type && auto.action_type && <ArrowRight className="w-3 h-3 shrink-0" />}
                    {auto.action_type && <span>{ACTION_LABELS[auto.action_type] ?? auto.action_type}</span>}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-xs font-medium">{auto.runs_count} execuções</p>
                  <p className="text-[10px] text-muted-foreground">{timeAgo(auto.last_run_at)}</p>
                </div>
                {auto.errors_count > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <AlertTriangle className="w-3 h-3" />
                    {auto.errors_count}
                  </div>
                )}
                <button
                  onClick={() => toggleStatus(auto.id, auto.status)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                    auto.status === 'ativo'
                      ? 'border-[#12B981]/30 text-[#12B981] hover:bg-[#12B981]/10'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {auto.status === 'ativo'
                    ? <><Pause className="w-3 h-3" /> Pausar</>
                    : <><Play className="w-3 h-3" /> Ativar</>
                  }
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
