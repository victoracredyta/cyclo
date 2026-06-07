import { NextResponse } from 'next/server'

/**
 * Stub — envia e-mail via SMTP configurado em Integrações.
 * TODO: implementar backend real com nodemailer + tabela email_settings.
 * Por enquanto retorna 501 explicando que precisa configurar.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Envio de e-mail ainda não está conectado ao backend SMTP. ' +
        'O conteúdo é salvo no histórico do lead, mas o e-mail real precisa do nodemailer configurado. ' +
        'Configure suas credenciais em Integrações → Email e aguarde a próxima atualização.',
    },
    { status: 501 },
  )
}
