import { createClient } from '@/lib/supabase/server'
import { ApprovalDetailClient } from '@/components/modules/approvals/ApprovalDetailClient'
import { notFound } from 'next/navigation'

export default async function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: approval } = await supabase
    .from('approvals')
    .select(`
      *,
      client:client_id(id, name, logo_url),
      versions:approval_versions(*),
      comments:approval_comments(*, user:user_id(full_name, avatar_url))
    `)
    .eq('id', id)
    .single()

  if (!approval) notFound()

  return <ApprovalDetailClient approval={approval} />
}
