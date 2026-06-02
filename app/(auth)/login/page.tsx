'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Eye, EyeOff } from 'lucide-react'

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
      setError('Email ou senha incorretos')
      return
    }

    // Check onboarding status
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
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm text-white shadow-2xl">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-bold text-white">Entrar na plataforma</CardTitle>
        <CardDescription className="text-gray-400">
          Digite seu email e senha para acessar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-gray-300 text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="voce@agencia.com.br"
              autoComplete="email"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-[#5B8CFF] focus:ring-[#5B8CFF]/30"
              {...register('email')}
            />
            {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-gray-300 text-sm">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-[#5B8CFF] pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#5B8CFF] hover:bg-[#4a7aee] text-white font-semibold h-10"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>

          <div className="flex items-center justify-between text-sm pt-1">
            <Link href="/forgot-password" className="text-[#5B8CFF] hover:underline">
              Esqueci minha senha
            </Link>
            <Link href="/register" className="text-gray-400 hover:text-white">
              Criar conta
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
