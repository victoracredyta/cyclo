'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff, Kanban, BarChart3, Bot } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      setError('Email ou senha incorretos. Verifique seus dados.')
      return
    }

    const { data: user } = await supabase
      .from('users')
      .select('organization_id, onboarding_completed')
      .single()

    if (!user?.organization_id) {
      router.push('/register')
    } else if (!user?.onboarding_completed) {
      router.push('/onboarding/agency')
    } else {
      router.push('/dashboard')
    }

    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL ── */}
      <div className="w-full lg:w-[420px] xl:w-[480px] flex flex-col bg-white shrink-0">
        {/* Logo */}
        <div className="px-10 pt-10 pb-0">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
                <circle cx="20" cy="20" r="16" stroke="#5B8CFF" strokeWidth="3" fill="none"/>
                <path d="M20 4 A16 16 0 0 1 36 20" stroke="#5B8CFF" strokeWidth="3" strokeLinecap="round" fill="none"/>
                <path d="M34 16 L36 20 L31 19" stroke="#5B8CFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="20" cy="20" r="3" fill="#5B8CFF"/>
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">CYCLO</span>
              <p className="text-[10px] text-[#5B8CFF] -mt-0.5 font-semibold">by ACREDYTA</p>
            </div>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex flex-col justify-center px-10 py-12">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Bem-vindo de volta</h1>
            <p className="text-sm text-gray-500 mt-1.5">Acesse sua conta e continue de onde parou.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com.br"
                autoComplete="email"
                className="h-11 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-[#5B8CFF] focus:ring-[#5B8CFF]/20 focus:bg-white transition-colors rounded-xl text-sm"
                {...register('email')}
              />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Senha</Label>
                <Link href="/forgot-password" className="text-xs text-[#5B8CFF] hover:text-[#4a7aee] font-medium transition-colors">
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11 border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-[#5B8CFF] focus:ring-[#5B8CFF]/20 focus:bg-white transition-colors rounded-xl text-sm pr-11"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-[#5B8CFF] hover:bg-[#4a7aee] active:bg-[#3d6ee0] text-white font-semibold text-sm transition-all shadow-[0_4px_14px_0_rgba(91,140,255,0.35)] hover:shadow-[0_6px_20px_0_rgba(91,140,255,0.45)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>

            <p className="text-center text-sm text-gray-500 pt-1">
              Não tem uma conta?{' '}
              <Link href="/register" className="text-[#5B8CFF] hover:text-[#4a7aee] font-semibold transition-colors">
                Crie agora mesmo
              </Link>
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="px-10 pb-8">
          <p className="text-xs text-gray-400 text-center">
            © 2025 CYCLO by ACREDYTA. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #07111F 0%, #0d1e38 40%, #0a1628 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #5B8CFF, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full opacity-8" style={{ background: 'radial-gradient(circle, #5B8CFF, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #5B8CFF, transparent 70%)' }} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(#5B8CFF 1px, transparent 1px), linear-gradient(90deg, #5B8CFF 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-14">
          {/* Top badge */}
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#5B8CFF] bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5B8CFF] animate-pulse" />
              Plataforma em operação
            </span>
          </div>

          {/* Center headline */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl xl:text-5xl font-bold text-white leading-[1.1] tracking-tight">
                Toda a sua operação.<br />
                <span style={{ color: '#5B8CFF' }}>Em um só lugar.</span>
              </h2>
              <p className="text-gray-400 text-base leading-relaxed max-w-md">
                Vendas, equipe, processos e resultados — reunidos em uma única plataforma para você organizar a rotina, vender mais e crescer com método.
              </p>
            </div>

            {/* Feature pills */}
            <div className="space-y-3">
              {[
                { icon: Kanban, label: 'Pipeline visual — todo lead no lugar certo', color: '#5B8CFF' },
                { icon: Bot, label: 'IA que escreve, organiza e analisa por você', color: '#12B981' },
                { icon: BarChart3, label: 'Metas e resultados em tempo real', color: '#F59E0B' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <span className="text-sm text-gray-300 font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom stats */}
          <div className="flex items-center gap-8 pt-4 border-t border-white/10">
            {[
              { value: '17', label: 'Módulos integrados' },
              { value: '24/7', label: 'Disponível sempre' },
              { value: 'BR', label: 'Dados no Brasil' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
