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
  fullName: z.string().min(2, 'Nome obrigatório'),
  agencyName: z.string().min(2, 'Nome da agência obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    const supabase = createClient()

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (signUpError || !authData.user) {
      setError(signUpError?.message ?? 'Erro ao criar conta')
      return
    }

    const slug = data.agencyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: data.agencyName, slug })
      .select()
      .single()

    if (orgError || !org) {
      setError('Erro ao criar organização')
      return
    }

    await supabase.from('users').insert({
      id: authData.user.id,
      organization_id: org.id,
      full_name: data.fullName,
      email: data.email,
      role: 'Fundador',
      permission: 'Admin',
    })

    router.push('/onboarding/agency')
  }

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm text-white shadow-2xl">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-bold text-white">Criar sua conta</CardTitle>
        <CardDescription className="text-gray-400">
          Comece gratuitamente. Sem cartão de crédito.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-gray-300 text-sm">Seu nome</Label>
              <Input
                id="fullName"
                placeholder="Victor Hugo"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-[#5B8CFF]"
                {...register('fullName')}
              />
              {errors.fullName && <p className="text-red-400 text-xs">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agencyName" className="text-gray-300 text-sm">Nome da agência</Label>
              <Input
                id="agencyName"
                placeholder="ACREDYTA"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-[#5B8CFF]"
                {...register('agencyName')}
              />
              {errors.agencyName && <p className="text-red-400 text-xs">{errors.agencyName.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-gray-300 text-sm">Email corporativo</Label>
            <Input
              id="email"
              type="email"
              placeholder="voce@agencia.com.br"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-[#5B8CFF]"
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
                placeholder="Mínimo 8 caracteres"
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

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-gray-300 text-sm">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repita a senha"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-[#5B8CFF]"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <p className="text-red-400 text-xs">{errors.confirmPassword.message}</p>}
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
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isSubmitting ? 'Criando conta...' : 'Criar conta grátis'}
          </Button>

          <p className="text-center text-sm text-gray-400">
            Já tem conta?{' '}
            <Link href="/login" className="text-[#5B8CFF] hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
