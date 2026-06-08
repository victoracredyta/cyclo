import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'

export type MailAttachment = {
  filename: string
  /** Base64-encoded file contents (without data URL prefix) */
  content: string
  contentType?: string
}

export type SendMailInput = {
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
  attachments?: MailAttachment[]
}

/**
 * Sends an email using the SMTP credentials stored in email_settings
 * for the current user's organization.
 *
 * Throws if no config is found or if sending fails.
 */
export async function sendMail({ to, subject, body, cc, bcc, attachments }: SendMailInput) {
  const supabase = await createClient()
  const { data: settings, error: settingsErr } = await supabase
    .from('email_settings')
    .select('*')
    .maybeSingle()

  if (settingsErr) throw new Error(`Erro ao ler configuração SMTP: ${settingsErr.message}`)
  if (!settings) throw new Error('Nenhum SMTP configurado. Vá em Integrações → Email e configure.')

  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port,
    secure: settings.smtp_port === 465,
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass,
    },
  })

  const fromName = settings.from_name?.trim() || settings.smtp_user
  const from = `"${fromName}" <${settings.smtp_user}>`

  // Render simple HTML from plain-text body (preserve line breaks)
  const html = `<div style="font-family: -apple-system, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937;">${body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />')}</div>`

  await transporter.sendMail({
    from,
    to,
    cc: cc || undefined,
    bcc: bcc || undefined,
    subject,
    text: body,
    html,
    attachments: attachments?.length
      ? attachments.map(a => ({
          filename: a.filename,
          content: Buffer.from(a.content, 'base64'),
          contentType: a.contentType,
        }))
      : undefined,
  })
}

/**
 * Verifies the SMTP connection without sending an email.
 */
export async function verifySmtpConnection() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('email_settings').select('*').maybeSingle()
  if (!settings) throw new Error('Nenhum SMTP configurado')

  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port,
    secure: settings.smtp_port === 465,
    auth: { user: settings.smtp_user, pass: settings.smtp_pass },
  })

  await transporter.verify()
}
