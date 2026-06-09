'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Mail, Send, Clock, CheckCircle2, AlertCircle, User, Building2,
  History, ChevronDown, ChevronUp, Paperclip, Plus, Sparkles,
  Loader2, Check, X, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Contact = { id: string; name: string; email: string | null; company?: string | null }

interface Props {
  clients: Contact[]
  leads: Contact[]
  senderName: string
  senderEmail: string
  senderSignature?: string
  senderSignatureImage?: string
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

type Template = {
  id: string
  label: string
  subject: string
  body: string
  isCustom?: boolean
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'proposta',
    label: 'Proposta comercial',
    subject: 'Proposta Comercial — {agencia}',
    body: `Olá {nome},\n\nConforme conversamos, segue em anexo nossa proposta comercial detalhada.\n\nEstamos à disposição para apresentar pessoalmente e esclarecer quaisquer dúvidas.\n\nAtenciosamente,\n{remetente}`,
  },
  {
    id: 'followup',
    label: 'Follow-up de reunião',
    subject: 'Follow-up da nossa reunião',
    body: `Olá {nome},\n\nFoi um prazer conversar com você hoje.\n\nConforme combinado, vou encaminhar os próximos passos:\n\n1. [Ação 1]\n2. [Ação 2]\n\nQualquer dúvida, estou à disposição.\n\nAtenciosamente,\n{remetente}`,
  },
  {
    id: 'boasvindas',
    label: 'Boas-vindas ao cliente',
    subject: 'Bem-vindo(a) à {agencia}! 🎉',
    body: `Olá {nome},\n\nParabéns pela sua decisão! Estamos muito felizes em tê-lo(a) como cliente.\n\nNosso time já está se preparando para começar. Em breve entraremos em contato para alinhar os primeiros passos.\n\nSeja muito bem-vindo(a)!\n\n{remetente}\n{agencia}`,
  },
  {
    id: 'cobranca',
    label: 'Cobrança amigável',
    subject: 'Lembrete: Fatura em aberto',
    body: `Olá {nome},\n\nGostaríamos de lembrá-lo(a) que temos uma fatura em aberto no valor de R$ [valor].\n\nCaso já tenha efetuado o pagamento, por favor desconsidere este e-mail.\n\nEm caso de dúvidas, estamos à disposição.\n\nAtenciosamente,\n{remetente}`,
  },
  {
    id: 'relatorio',
    label: 'Relatório mensal',
    subject: 'Relatório de Performance — {mes}',
    body: `Olá {nome},\n\nSegue o relatório de performance do mês de {mes}.\n\n📊 Resumo:\n- [Métrica 1]: [valor]\n- [Métrica 2]: [valor]\n- [Métrica 3]: [valor]\n\nEstamos à disposição para agendar uma call de alinhamento.\n\nAtenciosamente,\n{remetente}`,
  },
]

export function EmailClient({ clients, leads, senderName, senderEmail, senderSignature = '', senderSignatureImage = '' }: Props) {
  const [to, setTo] = useState('')
  const [toName, setToName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState(() => senderSignature ? `\n\n\n--\n${senderSignature}` : '')
  const [sending, setSending] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ filename: string; content: string; contentType: string; size: number }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [useSignature, setUseSignature] = useState(!!senderSignature || !!senderSignatureImage)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const totalSize = attachments.reduce((s, a) => s + a.size, 0)
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: máximo 10MB por arquivo`)
        continue
      }
      if (totalSize + file.size > 25 * 1024 * 1024) {
        toast.error('Total de anexos excede 25MB (limite de email)')
        break
      }
      const buffer = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      setAttachments(prev => [...prev, {
        filename: file.name,
        content: base64,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      }])
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx))
  const [history, setHistory] = useState<EmailRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [customTemplates, setCustomTemplates] = useState<Template[]>([])

  // New template modal
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newTplLabel, setNewTplLabel] = useState('')
  const [newTplSubject, setNewTplSubject] = useState('')
  const [newTplBody, setNewTplBody] = useState('')

  // AI improve
  const [aiImproving, setAiImproving] = useState(false)
  const [aiImproveOpen, setAiImproveOpen] = useState(false)
  const [aiImprovedText, setAiImprovedText] = useState('')

  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates]

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

  const applyTemplate = (id: string) => {
    const t = allTemplates.find(t => t.id === id)
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
    setSelectedTemplate(id)
  }

  const saveCustomTemplate = () => {
    if (!newTplLabel || !newTplBody) { toast.error('Preencha o nome e corpo do template'); return }
    const tpl: Template = {
      id: `custom-${Date.now()}`,
      label: newTplLabel,
      subject: newTplSubject,
      body: newTplBody,
      isCustom: true,
    }
    setCustomTemplates(prev => [...prev, tpl])
    setNewTplLabel('')
    setNewTplSubject('')
    setNewTplBody('')
    setShowNewTemplate(false)
    toast.success('Template criado!')
  }

  const deleteCustomTemplate = (id: string) => {
    setCustomTemplates(prev => prev.filter(t => t.id !== id))
    if (selectedTemplate === id) setSelectedTemplate('')
  }

  const improveWithAI = async () => {
    if (!body) { toast.error('Escreva a mensagem primeiro'); return }
    setAiImproving(true)
    setAiImprovedText('')
    setAiImproveOpen(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Melhore o seguinte email profissional de agência de marketing, tornando-o mais persuasivo, claro e com CTA forte. Mantenha o mesmo contexto e tom. Retorne APENAS o texto melhorado do email, sem explicações ou introdução:\n\n${body}`,
          }],
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Falha desconhecida')
      }
      if (!res.body) throw new Error('Resposta vazia')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let improved = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        improved += decoder.decode(value)
        setAiImprovedText(improved)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error(msg, {
        action: {
          label: 'Configurar',
          onClick: () => { window.location.href = '/integracoes?tab=api' },
        },
        duration: 7000,
      })
      setAiImproveOpen(false)
    } finally {
      setAiImproving(false)
    }
  }

  const applyAiImprovement = () => {
    setBody(aiImprovedText)
    setAiImproveOpen(false)
    toast.success('Email melhorado aplicado!')
  }

  const sendEmail = async () => {
    if (!to || !subject || !body) {
      toast.error('Preencha destinatário, assunto e mensagem')
      return
    }
    setSending(true)
    try {
      // The body already contains the signature text (pre-filled on mount).
      // If user turned off signature, strip everything after the "--" separator.
      let finalBody = body
      if (!useSignature) {
        const sigIdx = finalBody.lastIndexOf('\n--\n')
        if (sigIdx > -1) finalBody = finalBody.slice(0, sigIdx).trimEnd()
      }

      // Build HTML if signature image is present and enabled
      const signatureImage = useSignature && senderSignatureImage ? senderSignatureImage : null

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          body: finalBody,
          signatureImage,
          attachments: attachments.map(a => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          })),
        }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error ?? 'Falha ao enviar email')
      }

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
      toast.success(`Email enviado para ${toName || to}!${attachments.length ? ` Com ${attachments.length} anexo(s).` : ''}`)
      setBody(senderSignature ? `\n\n\n--\n${senderSignature}` : '')
      setSubject('')
      setTo('')
      setToName('')
      setSelectedTemplate('')
      setAttachments([])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error(msg, {
        action: { label: 'Configurar SMTP', onClick: () => { window.location.href = '/integracoes?tab=email' } },
        duration: 7000,
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Enviar Email</h2>
          <p className="text-sm text-muted-foreground">Envie emails diretamente para clientes e leads</p>
        </div>
        <Badge className="text-xs bg-amber-50 text-amber-600 border border-amber-200">
          Configure SMTP em Integrações → Email
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4" style={{ color: 'var(--brand-primary,#5B8CFF)' }} /> Novo email
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
                  <Select value="" onValueChange={selectContact}>
                    <SelectTrigger className="h-9 text-sm flex-1">
                      <span className="text-muted-foreground">Selecionar cliente ou lead...</span>
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
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Mensagem</Label>
                  <button
                    type="button"
                    onClick={improveWithAI}
                    disabled={!body || aiImproving}
                    className={cn(
                      'group relative inline-flex items-center gap-1.5 h-8 px-3 rounded-lg overflow-hidden text-xs font-bold text-white transition-all',
                      'bg-gradient-to-r from-[#5B8CFF] via-[#8B5CF6] to-[#EC4899] bg-[length:200%_100%] bg-left',
                      'hover:bg-right hover:shadow-lg hover:shadow-[#8B5CF6]/30',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                    style={{ transition: 'background-position 0.6s ease, box-shadow 0.3s ease' }}
                  >
                    {/* Shimmer overlay */}
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                    />
                    {aiImproving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin relative" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 relative group-hover:rotate-12 transition-transform" />
                    )}
                    <span className="relative">
                      {aiImproving ? 'Melhorando...' : 'Melhorar com CYCLO IA'}
                    </span>
                  </button>
                </div>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Escreva sua mensagem aqui..."
                  rows={12}
                  className="text-sm resize-none font-sans"
                />

                {/* Signature image preview — parses #w=N from URL to render at saved width */}
                {useSignature && senderSignatureImage && (() => {
                  const [imgSrc, hash] = senderSignatureImage.split('#')
                  const widthMatch = hash?.match(/w=(\d+)/)
                  const width = widthMatch ? Math.min(400, Math.max(80, parseInt(widthMatch[1]))) : 200
                  return (
                    <div className="mt-2 pl-3 border-l-2 border-[#5B8CFF]/30">
                      <p className="text-[10px] text-muted-foreground mb-1">Imagem da assinatura ({width}px — aparece no email enviado)</p>
                      <img src={imgSrc} alt="Assinatura" style={{ width, maxWidth: '100%', height: 'auto' }} />
                    </div>
                  )
                })()}
              </div>

              {/* Signature toggle */}
              {senderSignature && (
                <div className="flex items-center justify-between gap-2 p-2.5 bg-muted/30 border border-border rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSignature}
                        onChange={e => setUseSignature(e.target.checked)}
                        className="accent-[#5B8CFF] w-3.5 h-3.5"
                      />
                      <span className="text-xs font-semibold">Incluir assinatura automática</span>
                    </label>
                  </div>
                  <details className="text-[10px] text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">Pré-visualizar</summary>
                    <div className="mt-1.5 pt-1.5 border-t border-border whitespace-pre-wrap font-mono text-foreground/70 max-w-[400px]">
                      {senderSignature}
                    </div>
                  </details>
                </div>
              )}
              {!senderSignature && (
                <button
                  type="button"
                  onClick={() => { window.location.href = '/configuracoes?tab=perfil' }}
                  className="text-[11px] text-muted-foreground hover:text-[#5B8CFF] flex items-center gap-1 transition-colors"
                >
                  + Configurar uma assinatura automática em Configurações → Perfil
                </button>
              )}

              {/* Attachments list */}
              {attachments.length > 0 && (
                <div className="space-y-1.5 p-2.5 bg-muted/30 border border-border rounded-lg">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate flex-1">{a.filename}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {(a.size / 1024).toFixed(0)} KB
                      </span>
                      <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-red-500 p-0.5 shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                    Total: {(attachments.reduce((s, a) => s + a.size, 0) / 1024).toFixed(0)} KB de 25 MB
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Anexar arquivo{attachments.length > 0 ? ` (${attachments.length})` : ''}
                </button>
                <Button
                  onClick={sendEmail}
                  disabled={sending || !to || !subject || !body}
                  className="text-white gap-1.5 text-sm"
                  style={{ background: 'var(--brand-primary,#5B8CFF)' }}
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
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Templates</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  style={{ color: 'var(--brand-primary,#5B8CFF)' }}
                  onClick={() => setShowNewTemplate(true)}
                >
                  <Plus className="w-3 h-3" /> Novo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 p-3">
              {allTemplates.map(t => (
                <div key={t.id} className="flex items-center gap-1">
                  <button
                    onClick={() => applyTemplate(t.id)}
                    className={cn(
                      'flex-1 text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors border',
                      selectedTemplate === t.id
                        ? 'text-white border-transparent'
                        : 'bg-muted/30 border-transparent hover:bg-muted text-foreground'
                    )}
                    style={selectedTemplate === t.id ? { background: 'var(--brand-primary,#5B8CFF)', borderColor: 'transparent' } : undefined}
                  >
                    {t.label}
                    {t.isCustom && <span className="ml-1 text-[9px] opacity-60">· custom</span>}
                  </button>
                  {t.isCustom && (
                    <button
                      onClick={() => deleteCustomTemplate(t.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
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
                    <Badge className="text-[10px] border-0" style={{ background: 'var(--brand-primary,#5B8CFF)1A', color: 'var(--brand-primary,#5B8CFF)' }}>
                      {history.length}
                    </Badge>
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

      {/* New template modal */}
      <Dialog open={showNewTemplate} onOpenChange={setShowNewTemplate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Criar novo template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Nome do template *</Label>
              <Input value={newTplLabel} onChange={e => setNewTplLabel(e.target.value)} placeholder="Ex: Proposta de Tráfego Pago" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Assunto</Label>
              <Input value={newTplSubject} onChange={e => setNewTplSubject(e.target.value)} placeholder="Assunto do email (use {nome}, {agencia}, {mes})" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Corpo do email *</Label>
              <Textarea
                value={newTplBody}
                onChange={e => setNewTplBody(e.target.value)}
                placeholder="Corpo do email. Variáveis: {nome}, {agencia}, {remetente}, {mes}"
                rows={8}
                className="text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis: <code className="text-xs bg-muted px-1 rounded">{'{nome}'}</code>{' '}
                <code className="text-xs bg-muted px-1 rounded">{'{agencia}'}</code>{' '}
                <code className="text-xs bg-muted px-1 rounded">{'{remetente}'}</code>{' '}
                <code className="text-xs bg-muted px-1 rounded">{'{mes}'}</code>
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowNewTemplate(false)} className="flex-1">Cancelar</Button>
              <Button onClick={saveCustomTemplate} className="flex-1 text-white" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                Salvar template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Improve modal */}
      <Dialog open={aiImproveOpen} onOpenChange={v => { if (!aiImproving) setAiImproveOpen(v) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" /> CYCLO IA — Melhorando seu email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            {aiImproving && !aiImprovedText && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Reescrevendo com IA...
              </div>
            )}
            {aiImprovedText && (
              <Textarea
                value={aiImprovedText}
                onChange={e => setAiImprovedText(e.target.value)}
                rows={12}
                className="text-sm resize-none"
              />
            )}
            {!aiImproving && aiImprovedText && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setAiImproveOpen(false)} className="flex-1 gap-1.5">
                  <X className="w-3.5 h-3.5" /> Descartar
                </Button>
                <Button onClick={applyAiImprovement} className="flex-1 text-white gap-1.5" style={{ background: 'var(--brand-primary,#5B8CFF)' }}>
                  <Check className="w-3.5 h-3.5" /> Aplicar melhoria
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
