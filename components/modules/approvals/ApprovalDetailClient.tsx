'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft, CheckCircle, XCircle, RefreshCw, Clock,
  MessageSquare, Send, User, Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Comment = {
  id: string
  author_name: string | null
  author_role: string | null
  content: string
  is_resolved: boolean
  created_at: string
  user: { full_name: string | null; avatar_url: string | null } | null
}

type Version = {
  id: string
  version_number: number
  media_urls: string[]
  status: string | null
  created_at: string
}

type ApprovalDetail = {
  id: string
  title: string
  status: string
  channel: string | null
  type: string | null
  due_date: string | null
  current_version: number
  created_at: string
  client: { id: string; name: string; logo_url: string | null } | null
  versions: Version[]
  comments: Comment[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aguardando: { label: 'Aguardando',  color: '#F59E0B', icon: Clock },
  aprovado:   { label: 'Aprovado',    color: '#12B981', icon: CheckCircle },
  ajuste:     { label: 'Ajuste',      color: '#e1493c', icon: RefreshCw },
  reprovado:  { label: 'Reprovado',   color: '#6B7280', icon: XCircle },
}

interface ApprovalDetailClientProps {
  approval: ApprovalDetail
}

export function ApprovalDetailClient({ approval: initial }: ApprovalDetailClientProps) {
  const router = useRouter()
  const [approval, setApproval] = useState(initial)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  const supabase = createClient()
  const cfg = STATUS_CONFIG[approval.status] ?? STATUS_CONFIG.aguardando
  const StatusIcon = cfg.icon

  const postComment = async () => {
    if (!comment.trim()) return
    setSubmitting(true)
    const { data: me } = await supabase.from('users').select('id, full_name').single()

    const { data: newComment, error } = await supabase.from('approval_comments').insert({
      approval_id: approval.id,
      user_id: me?.id,
      author_name: me?.full_name ?? 'Agência',
      author_role: 'agencia',
      content: comment.trim(),
    }).select('*, user:user_id(full_name, avatar_url)').single()

    if (error) { toast.error('Erro ao enviar comentário'); setSubmitting(false); return }
    setApproval(prev => ({ ...prev, comments: [...prev.comments, newComment as Comment] }))
    setComment('')
    setSubmitting(false)
  }

  const updateStatus = async (status: string) => {
    setStatusLoading(true)
    const { error } = await supabase.from('approvals').update({ status }).eq('id', approval.id)
    if (error) { toast.error('Erro ao atualizar status'); setStatusLoading(false); return }
    setApproval(prev => ({ ...prev, status }))
    toast.success(`Status atualizado para ${STATUS_CONFIG[status]?.label ?? status}`)
    setStatusLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb + header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="mt-1 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{approval.title}</h1>
            <Badge
              className="text-xs px-2 py-0.5 border font-medium shrink-0"
              style={{ backgroundColor: `${cfg.color}12`, color: cfg.color, borderColor: `${cfg.color}30` }}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {cfg.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
            {approval.client && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> {approval.client.name}
              </span>
            )}
            {approval.channel && <span>· {approval.channel}</span>}
            {approval.type && <span>· {approval.type}</span>}
            <span>· v{approval.current_version}</span>
            {approval.due_date && (
              <span>· Prazo: {new Date(approval.due_date + 'T12:00').toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: versions + actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Media versions */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">Material para aprovação</h3>
            {approval.versions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
                Nenhum arquivo enviado ainda
              </div>
            ) : (
              <div className="space-y-3">
                {[...approval.versions].reverse().map(v => (
                  <div key={v.id} className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
                      <span className="text-xs font-semibold">Versão {v.version_number}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {v.media_urls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 p-3">
                        {v.media_urls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`v${v.version_number} mídia ${i + 1}`}
                            className="w-full h-48 object-cover rounded-lg bg-muted"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground p-3">Sem arquivos nesta versão</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agency action buttons */}
          {approval.status === 'aguardando' && (
            <div className="flex gap-2">
              <Button
                disabled={statusLoading}
                onClick={() => updateStatus('aprovado')}
                className="flex-1 bg-[#12B981] hover:bg-[#059669] text-white gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> Marcar como aprovado
              </Button>
              <Button
                disabled={statusLoading}
                onClick={() => updateStatus('ajuste')}
                variant="outline"
                className="flex-1 gap-1.5 border-[#e1493c] text-[#e1493c] hover:bg-[#e1493c]/5"
              >
                <RefreshCw className="w-4 h-4" /> Solicitar ajuste
              </Button>
            </div>
          )}
          {(approval.status === 'aprovado' || approval.status === 'ajuste') && (
            <Button
              disabled={statusLoading}
              onClick={() => updateStatus('aguardando')}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Clock className="w-3.5 h-3.5" /> Voltar para aguardando
            </Button>
          )}
        </div>

        {/* Right: comments */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col h-fit">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" /> Comentários
            {approval.comments.length > 0 && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                {approval.comments.length}
              </span>
            )}
          </h3>

          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {approval.comments.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum comentário ainda</p>
            )}
            {approval.comments.map(c => (
              <div key={c.id} className={cn('flex gap-2.5', c.author_role === 'agencia' ? 'flex-row' : 'flex-row-reverse')}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={c.user?.avatar_url ?? undefined} />
                  <AvatarFallback className={cn('text-[9px]', c.author_role === 'agencia' ? 'bg-[#5B8CFF] text-white' : 'bg-muted')}>
                    {(c.author_name ?? 'U').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn('flex-1', c.author_role !== 'agencia' && 'text-right')}>
                  <p className="text-[10px] text-muted-foreground mb-0.5">
                    {c.author_name ?? 'Usuário'} · {c.author_role === 'agencia' ? 'Agência' : 'Cliente'}
                  </p>
                  <div className={cn(
                    'inline-block text-xs px-3 py-2 rounded-xl max-w-full',
                    c.author_role === 'agencia'
                      ? 'bg-[#5B8CFF]/10 text-foreground'
                      : 'bg-muted text-foreground',
                  )}>
                    {c.content}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(c.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* New comment */}
          <div className="space-y-2 border-t border-border pt-3">
            <Textarea
              placeholder="Escreva um comentário..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={2}
              className="text-sm resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) postComment() }}
            />
            <Button
              size="sm"
              onClick={postComment}
              disabled={submitting || !comment.trim()}
              className="w-full bg-[#5B8CFF] hover:bg-[#4a7aee] text-white gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
