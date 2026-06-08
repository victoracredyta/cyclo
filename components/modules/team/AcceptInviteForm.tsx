'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Invite {
  email: string
  full_name: string | null
  permission: string
  expires_at: string
  accepted_at: string | null
}

export function AcceptInviteForm({ token, invite, configError }: { token: string; invite: Invite | null; configError: boolean }) {
  const router = useRouter()
  const [fullName, setFullName] = useState(invite?.full_name ?? '')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  if (configError) {
    return (
      <div className="text-center py-6 space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <p className="text-sm font-semibold text-gray-900">Sistema de convites não configurado</p>
        <p className="text-xs text-gray-500">
          O administrador precisa adicionar <code className="bg-gray-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> nas variáveis de ambiente do Vercel.
        </p>
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="text-center py-6 space-y-3">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <p className="text-sm font-semibold text-gray-900">Convite não encontrado</p>
        <p className="text-xs text-gray-500">O link pode estar incorreto ou o convite já foi removido.</p>
      </div>
    )
  }

  if (invite.accepted_at) {
    return (
      <div className="text-center py-6 space-y-3">
        <CheckCircle className="w-10 h-10 text-[#12B981] mx-auto" />
        <p className="text-sm font-semibold text-gray-900">Esse convite já foi aceito</p>
        <Button onClick={() => router.push('/login')} className="bg-[#5B8CFF] hover:bg-[#4a7aee] text-white">
          Ir para o login
        </Button>
      </div>
    )
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return (
      <div className="text-center py-6 space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <p className="text-sm font-semibold text-gray-900">Esse convite expirou</p>
        <p className="text-xs text-gray-500">Peça um novo convite ao administrador da equipe.</p>
      </div>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !password) { toast.error('Preencha nome e senha'); return }
    if (password.length < 8) { toast.error('Senha deve ter no mínimo 8 caracteres'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/team/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, full_name: fullName.trim(), password }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Falha ao aceitar convite')

      // Auto-login
      const supabase = createClient()
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: invite.email, password })
      if (signErr) {
        // Account created but auto-login failed — send to login
        toast.success('Conta criada! Faça login.')
        router.push('/login')
        return
      }
      setSuccess(true)
      toast.success(`Bem-vindo(a), ${fullName.split(' ')[0]}!`)
      setTimeout(() => router.push('/dashboard'), 1000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-6 space-y-3">
        <CheckCircle className="w-12 h-12 text-[#12B981] mx-auto" />
        <p className="text-base font-bold text-gray-900">Conta criada com sucesso!</p>
        <p className="text-sm text-gray-500">Redirecionando...</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="bg-[#5B8CFF]/8 border border-[#5B8CFF]/20 rounded-lg p-3">
        <p className="text-xs font-semibold text-[#5B8CFF]">📧 Convite para</p>
        <p className="text-sm font-bold text-gray-900 mt-0.5">{invite.email}</p>
        <p className="text-[11px] text-gray-500 mt-1">
          Permissão: <span className="font-semibold">{invite.permission}</span>
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-700">Seu nome completo</Label>
        <Input
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Maria Silva"
          className="h-10 bg-gray-50 border-gray-200 text-gray-900"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-700">Crie uma senha</Label>
        <div className="relative">
          <Input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="h-10 bg-gray-50 border-gray-200 text-gray-900 pr-10"
            required
          />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full h-11 bg-[#5B8CFF] hover:bg-[#4a7aee] text-white font-semibold">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {submitting ? 'Criando conta…' : 'Aceitar convite e entrar'}
      </Button>

      <p className="text-[11px] text-gray-500 text-center">
        Ao aceitar, você concorda em fazer parte da equipe e acessar o CRM com as permissões definidas.
      </p>
    </form>
  )
}
