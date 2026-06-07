'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email inválido'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSent(true)
  }

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm text-white shadow-2xl">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-bold text-white">Recuperar senha</CardTitle>
        <CardDescription className="text-gray-400">
          Enviaremos um link para redefinir sua senha
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="text-center space-y-4 py-4">
            <CheckCircle className="h-12 w-12 text-[#12B981] mx-auto" />
            <p className="text-white font-medium">Email enviado!</p>
            <p className="text-gray-400 text-sm">
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>
            <Link href="/login">
              <Button variant="ghost" className="text-[#5B8CFF] hover:text-white mt-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-300 text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com.br"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-[#5B8CFF]"
                {...register('email')}
              />
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#5B8CFF] hover:bg-[#4a7aee] text-white font-semibold h-10"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>

            <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-white mt-2">
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao login
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
