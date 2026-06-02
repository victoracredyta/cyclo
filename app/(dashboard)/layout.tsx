import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: appUser } = await supabase
    .from('users')
    .select('full_name, email, avatar_url, onboarding_completed, organization_id')
    .eq('id', user.id)
    .single()

  if (!appUser?.organization_id) redirect('/register')
  if (!appUser?.onboarding_completed) redirect('/onboarding/agency')

  const { count: notifCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          userName={appUser?.full_name ?? undefined}
          userEmail={appUser?.email ?? undefined}
          userAvatar={appUser?.avatar_url ?? undefined}
          notificationCount={notifCount ?? 0}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
