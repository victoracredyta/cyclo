'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, XCircle, RefreshCw, Clock, Lock, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Approval = {
  id: string
  title: string
  status: string
  channel: string | null
  type: string | null
  due_date: string | null
  versions: Array<{ id: string; version_number: number; media_urls: string[]; created_at: string }>
  comments: Array<{ id: string; author_name: string | null; author_role: string | null; content: string; created_at: string }>
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  aguardando: { label: 'Aguardando', color: '#F59E0B' },
  aprovado:   { label: 'Aprovado',   color: '#12B981' },
  ajuste:     { label: 'Ajuste',     color: '#e1493c' },
  reprovado:  { label: 'Reprovado',  color: '#6B7280' },
}

interface PortalClientProps {
  client: { id: string; name: string; logo_url: string | null }
  org: { name: string; logo_url: string | null; primary_color: string; tagline: string | null } | null
  approvals: Record<string, unknown>[]
  isAuthenticated: boolean
  needsPassword: boolean
  verifyPassword: (password: string) => Promise<{ ok?: boolean; error?: string }>
  submitFeedback: (approvalId: string, status: 'aprovado' | 'ajuste', comment: string, authorName: string) => Promise<{ ok?: boolean; error?: string }>
}

function ApprovalCard({
  approval: initial,
  primaryColor,
  submitFeedback,
}: {
  approval: Approval
  primaryColor: string
  submitFeedback: (id: string, status: 'aprovado' | 'ajuste', comment: string, name: string) => Promise<{ ok?: boolean; error?: string }>
}) {
  const [approval, setApproval] = useState(initial)
  const [expanded, setExpanded] = useState(false)
  const [comment, setComment] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [pending, startTransition] = useTransition()
  const cfg = STATUS_CONFIG[approval.status] ?? STATUS_CONFIG.aguardando

  const handleFeedback = (status: 'aprovado' | 'ajuste') => {
    startTransition(async () => {
      const result = await submitFeedback(approval.id, status, comment, authorName)
      if (result.error) { toast.error(result.error); return }
      setApproval(prev => ({ ...prev, status }))
      setComment('')
      toast.success(status === 'aprovado' ? 'Aprovado com sucesso!' : 'Solicitação de ajuste enviada!')
    })
  }

  const latestVersion = approval.versions.at(-1)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-base truncate">{approval.title}</p>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500">
            {approval.channel && <span>{approval.channel}</span>}
            {approval.type && <><span>·</span><span>{approval.type}</span></>}
            {approval.due_date && (
              <><span>·</span><span>Prazo: {new Date(approval.due_date + 'T12:00').toLocaleDateString('pt-BR')}</span></>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <Badge
            className="text-xs px-2.5 py-1 border font-medium"
            style={{ backgroundColor: `${cfg.color}15`, color: cfg.color, borderColor: `${cfg.color}30` }}
          >
            {cfg.label}
          </Badge>
          {approval.comments.length > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> {approval.comments.length}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Latest version media */}
          {latestVersion && latestVersion.media_urls.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {latestVersion.media_urls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Peça ${i + 1}`}
                  className="w-full h-48 object-cover rounded-xl bg-gray-100"
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
              Nenhum arquivo disponível
            </div>
          )}

          {/* Comment history */}
          {approval.comments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Histórico</p>
              {approval.comments.map(c => (
                <div key={c.id} className={cn('flex gap-2.5', c.author_role === 'cliente' && 'flex-row-reverse')}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: c.author_role === 'agencia' ? primaryColor : '#6B7280' }}>
                    {(c.author_name ?? 'U').charAt(0)}
                  </div>
                  <div className={cn('flex-1', c.author_role === 'cliente' && 'text-right')}>
                    <p className="text-[10px] text-gray-400 mb-0.5">
                      {c.author_name} · {c.author_role === 'agencia' ? 'Agência' : 'Você'}
                    </p>
                    <div className={cn(
                      'inline-block text-sm px-3 py-2 rounded-xl',
                      c.author_role === 'agencia' ? 'bg-gray-100 text-gray-800' : 'text-white',
                    )} style={c.author_role !== 'agencia' ? { backgroundColor: primaryColor } : {}}>
                      {c.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Feedback form (only if awaiting) */}
          {approval.status === 'aguardando' && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Seu feedback</p>
              <Input
                placeholder="Seu nome"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                className="text-sm"
              />
              <Textarea
                placeholder="Deixe um comentário (opcional)..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
              <div className="flex gap-2">
                <Button
                  disabled={pending}
                  onClick={() => handleFeedback('aprovado')}
                  className="flex-1 gap-1.5 text-white"
                  style={{ backgroundColor: '#12B981' }}
                >
                  <CheckCircle className="w-4 h-4" /> Aprovar
                </Button>
                <Button
                  disabled={pending}
                  onClick={() => handleFeedback('ajuste')}
                  variant="outline"
                  className="flex-1 gap-1.5 border-[#e1493c] text-[#e1493c] hover:bg-[#e1493c]/5"
                >
                  <RefreshCw className="w-4 h-4" /> Solicitar ajuste
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function PortalClient({
  client, org, approvals, isAuthenticated, needsPassword, verifyPassword, submitFeedback,
}: PortalClientProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [pending, startTransition] = useTransition()
  const primaryColor = org?.primary_color ?? '#5B8CFF'

  const handleLogin = () => {
    setAuthError('')
    startTransition(async () => {
      const result = await verifyPassword(password)
      if (result.error) { setAuthError(result.error); return }
      router.refresh()
    })
  }

  // Password gate
  if (!isAuthenticated && needsPassword) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F6F8FB]">
        <div className="w-full max-w-sm space-y-6">
          {org?.logo_url && (
            <img src={org.logo_url} alt={org.name} className="h-10 mx-auto object-contain" />
          )}
          {!org?.logo_url && (
            <div className="text-xl font-bold text-center" style={{ color: primaryColor }}>{org?.name}</div>
          )}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: `${primaryColor}15` }}>
                <Lock className="w-5 h-5" style={{ color: primaryColor }} />
              </div>
              <p className="font-semibold text-gray-900">Portal do cliente</p>
              <p className="text-sm text-gray-500 mt-1">Olá, {client.name}! Digite a senha para acessar.</p>
            </div>
            <Input
              type="password"
              placeholder="Senha de acesso"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="text-sm"
            />
            {authError && <p className="text-xs text-red-500">{authError}</p>}
            <Button
              onClick={handleLogin}
              disabled={pending || !password}
              className="w-full text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {pending ? 'Verificando...' : 'Acessar'}
            </Button>
          </div>
          {org?.tagline && <p className="text-center text-xs text-gray-400">{org.tagline}</p>}
        </div>
      </div>
    )
  }

  const typedApprovals = approvals as unknown as Approval[]
  const pending2 = typedApprovals.filter(a => a.status === 'aguardando').length
  const approved = typedApprovals.filter(a => a.status === 'aprovado').length

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {org?.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="h-8 object-contain" />
            ) : (
              <div className="font-bold text-lg" style={{ color: primaryColor }}>{org?.name}</div>
            )}
          </div>
          <div className="text-sm text-gray-500">{client.name}</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: typedApprovals.length, color: '#6B7280' },
            { label: 'Aguardando', value: pending2, color: '#F59E0B' },
            { label: 'Aprovados', value: approved, color: '#12B981' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {typedApprovals.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Nenhuma peça para aprovar ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {typedApprovals.map(a => (
              <ApprovalCard
                key={a.id}
                approval={a}
                primaryColor={primaryColor}
                submitFeedback={submitFeedback}
              />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pt-4">
          Portal de aprovações · {org?.name}
        </p>
      </main>
    </div>
  )
}
