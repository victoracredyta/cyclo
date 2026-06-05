import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    return NextResponse.redirect(`${appUrl}/integracoes?gmail_error=no_client_id&tab=email`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: appUser } = user
    ? await supabase.from('users').select('organization_id').eq('id', user.id).single()
    : { data: null }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const redirectUri = `${appUrl}/api/auth/google/callback`
  const scope = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid',
  ].join(' ')

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scope)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', appUser?.organization_id ?? 'unknown')

  return NextResponse.redirect(url.toString())
}
