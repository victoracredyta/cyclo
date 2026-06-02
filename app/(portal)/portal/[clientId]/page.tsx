import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { PortalClient } from '@/components/modules/portal/PortalClient'

export default async function PortalPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const supabase = await createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, logo_url, portal_password, portal_enabled, organization_id')
    .eq('id', clientId)
    .single()

  if (!client || !client.portal_enabled) notFound()

  const cookieStore = await cookies()
  const session = cookieStore.get(`portal_auth_${clientId}`)
  const isAuthenticated = !client.portal_password || session?.value === 'ok'

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, primary_color, tagline')
    .eq('id', client.organization_id!)
    .single()

  let approvals: Record<string, unknown>[] = []
  if (isAuthenticated) {
    const { data } = await supabase
      .from('approvals')
      .select('*, versions:approval_versions(id, version_number, media_urls, created_at), comments:approval_comments(id, author_name, author_role, content, created_at)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    approvals = (data as Record<string, unknown>[]) ?? []
  }

  async function verifyPassword(password: string) {
    'use server'
    if (client?.portal_password !== password) return { error: 'Senha incorreta' }
    const cookieStore = await cookies()
    cookieStore.set(`portal_auth_${clientId}`, 'ok', {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return { ok: true }
  }

  async function submitFeedback(approvalId: string, status: 'aprovado' | 'ajuste', comment: string, authorName: string) {
    'use server'
    const cookieStore = await cookies()
    if (client?.portal_password && cookieStore.get(`portal_auth_${clientId}`)?.value !== 'ok') {
      return { error: 'Não autorizado' }
    }
    const supabase = await createAdminClient()
    if (comment.trim()) {
      await supabase.from('approval_comments').insert({
        approval_id: approvalId,
        author_name: authorName || client?.name || 'Cliente',
        author_role: 'cliente',
        content: comment.trim(),
      })
    }
    await supabase.from('approvals').update({ status }).eq('id', approvalId).eq('client_id', clientId)
    return { ok: true }
  }

  return (
    <PortalClient
      client={client}
      org={org}
      approvals={approvals}
      isAuthenticated={isAuthenticated}
      needsPassword={!!client.portal_password}
      verifyPassword={verifyPassword}
      submitFeedback={submitFeedback}
    />
  )
}
