'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Mail, Send, Clock, CheckCircle2, AlertCircle, User, Building2,
  History, ChevronDown, ChevronUp, Paperclip,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Contact = { id: string; name: string; email: string | null; company?: string | null }

interface Props {
  clients: Contact[]
  leads: Contact[]
  senderName: string
  senderEmail: string
}

type EmailRecord = {
  id: string
  to: string
  subject: string
  body: string
  sentAt: string
  status: 'sent' | 'failed'
  contactName: string
}

const TEMPLATES = [
  {
    label: 'Proposta comercial',
    subject: 'Proposta Comercial — {agencia}',
    body: `Olá {nome},\n\nConforme conversamos, segue em anexo nossa proposta comercial detalhada.\n\nEstamos à disposição para apresentar pessoalmente e esclarecer quaisquer dúvidas.\n\nAtenciosamente,\n{remetente}`,
  },
  {
    label: 'Follow-up de reunião',
    subject: 'Follow-up da nossa reunião',
    body: `Olá {nome},\n\nFoi um prazer conversar com você hoje.\n\nConforme combinado, vou encaminhar os próximos passos:\n\n1. [Ação 1]\n2. [Ação 2]\n\nQualquer dúvida, estou à disposição.\n\nAtenciosamente,\n{remetente}`,
  },
  {
    label: 'Boas-vindas ao cliente',
    subject: 'Bem-vindo(a) à {agencia}! 🎉',
    body: `Olá {nome},\n\nParabéns pela sua decisão! Estamos muito felizes em tê-lo(a) como cliente.\n\nNosso time já está se preparando para começar. Em breve entraremos em contato para alinhar os primeiros passos.\n\nSeja muito bem-vindo(a)!\n\n{remetente}\n{agencia}`,
  },
  {
    label: 'Cobrança amigável',
    subject: 'Lembrete: Fatura em aberto',
    body: `Olá {nome},\n\nGostaríamos de lembrá-lo(a) que temos uma fatura em aberto no valor de R$ [valor].\n\nCaso já tenha efetuado o pagamento, por favor desconsidere este e-mail.\n\nEm caso de dúvidas, estamos à disposição.\n\nAtenciosamente,\n{remetente}`,
  },
  {
    label: 'Relatório mensal',
    subject: 'Relatório de Performance — {mes}',
    body: `Olá {nome},\n\nSegue o relatório de performance do mês de {mes}.\n\n📊 Resumo:\n- [Métrica 1]: [valor]\n- [Métrica 2]: [valor]\n- [Métrica 3]: [valor]\n\nEstamos à disposição para agendar uma call de alinhamento.\n\nAtenciosamente,\n{remetente}`,
  },
]

export function EmailClient({ clients, leads, senderName, senderEmail }: Props) {
  const [to, setTo] = useState('')
  const [toName, setToName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<EmailRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')

  const allContacts: Contact[] = [
    ...clients.map(c => ({ ...c, type: 'cliente' as const })),
    ...leads.map(l => ({ ...l, company: l.company ?? undefined, type: 'lead' as const })),
  ].filter(c => c.email)

  const selectContact = (id: string | null) => {
    if (!id) return
    const contact = allContacts.find(c => c.id === id)
    if (!contact?.email) return
    setTo(contact.email ?? '')
    setToName(contact.name)
  }

  const applyTemplate = (label: string) => {
    const t = TEMPLATES.find(t => t.label === label)
    if (!t) return
    const now = new Date()
    const mes = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    setSubject(t.subject.replace('{agencia}', senderName).replace('{mes}', mes))
    setBody(t.body
      .replace(/{nome}/g, toName || 'Cliente')
      .replace(/{agencia}/g, senderName)
      .replace(/{remetente}/g, senderName)
      .replace(/{mes}/g, mes)
    )
    setSelectedTemplate(label)
  }

  const sendEmail = async () => {
    if (!to || !subject || !body) {
      toast.error('Preencha destinatário, assunto e mensagem')
      return
    }
    setSending(true)
    await new Promise(r => setTimeout(r, 1200))

    const record: EmailRecord = {
      id: crypto.randomUUID(),
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
      status: 'sent',
      contactName: toName || to,
    }
    setHistory(prev => [record, ...prev])
    toast.success(`Email enviado para ${toName || to}!`)
    setBody('')
    setSubject('')
    setTo('')
    setToName('')
    setSelectedTemplate('')
    setSending(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Enviar Email</h2>
          <p className="text-sm text-muted-foreground">Envie emails diretamente para clientes e leads</p>
        </div>
        <Badge className="text-xs bg-amber-50 text-amber-600 border border-amber-200">
          Integre seu email em Configurações → Integrações
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#5B8CFF]" /> Novo email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* From */}
              <div className="flex items-center gap-2 text-sm p-2.5 bg-muted/40 rounded-lg">
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">De:</span>
                <span className="font-medium">{senderName}</span>
                <span className="text-muted-foreground text-xs">({senderEmail})</span>
              </div>

              {/* To */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Para</Label>
                <div className="flex gap-2">
                  <Select onValueChange={selectContact}>
                    <SelectTrigger className="h-9 text-sm flex-1">
                      <SelectValue placeholder="Selecionar cliente ou lead..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.filter(c => c.email).length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wide">Clientes</div>
                          {clients.filter(c => c.email).map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center gap-2">
                                <Building2 className="w-3 h-3 text-muted-foreground" />
                                {c.name} — {c.email}
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {leads.filter(l => l.email).length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wide">Leads</div>
                          {leads.filter(l => l.email).map(l => (
                            <SelectItem key={l.id} value={l.id}>
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-muted-foreground" />
                                {l.name}{l.company ? ` — ${l.company}` : ''} ({l.email})
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="ou digitar email manualmente"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    className="h-9 text-sm flex-1"
                    type="email"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assunto</Label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Assunto do email"
                  className="h-9 text-sm"
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mensagem</Label>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Escreva sua mensagem aqui..."
                  rows={10}
                  className="text-sm resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Paperclip className="w-3.5 h-3.5" /> Anexar arquivo
                </button>
                <Button
                  onClick={sendEmail}
                  disabled={sending || !to || !subject || !body}
                  className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5 text-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? 'Enviando...' : 'Enviar email'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: templates + history */}
        <div className="space-y-4">
          {/* Templates */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {TEMPLATES.map(t => (
                <button
                  key={t.label}
                  onClick={() => applyTemplate(t.label)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors border',
                    selectedTemplate === t.label
                      ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] border-[#5B8CFF]/30'
                      : 'bg-muted/30 border-transparent hover:bg-muted text-foreground'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* History */}
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5" /> Histórico
                  {history.length > 0 && (
                    <Badge className="text-[10px] bg-[#5B8CFF]/10 text-[#5B8CFF] border-0">{history.length}</Badge>
                  )}
                </span>
                {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </CardTitle>
            </CardHeader>
            {showHistory && (
              <CardContent className="p-3 space-y-2">
                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum email enviado ainda.</p>
                ) : (
                  history.map(e => (
                    <div key={e.id} className="flex items-start gap-2.5 p-2 bg-muted/30 rounded-lg">
                      {e.status === 'sent'
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-[#12B981] mt-0.5 shrink-0" />
                        : <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{e.contactName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{e.subject}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(e.sentAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
