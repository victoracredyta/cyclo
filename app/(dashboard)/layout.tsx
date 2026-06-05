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

  const [{ count: notifCount }, { data: org }] = await Promise.all([
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
    supabase.from('organizations').select('primary_color, secondary_color, button_color').eq('id', appUser.organization_id).single(),
  ])

  const brandPrimary = org?.primary_color ?? '#5B8CFF'
  const brandSecondary = org?.secondary_color ?? '#4a7aee'
  const brandButton = org?.button_color ?? '#5B8CFF'

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `:root{--brand-primary:${brandPrimary};--brand-secondary:${brandSecondary};--brand-button:${brandButton};}` }} />
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
    </>
  )
}
