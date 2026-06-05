import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/integracoes?gmail_error=${error ?? 'access_denied'}&tab=email`)
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/integracoes?gmail_error=token_exchange&tab=email`)
  }

  const tokens = await tokenRes.json() as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token ?? ''}` },
  })

  const userInfo = await userRes.json() as { email?: string; name?: string }

  const response = NextResponse.redirect(`${appUrl}/integracoes?gmail=connected&tab=email`)

  // Short-lived cookies (60s) so client can pick them up and store in localStorage
  const cookieOpts = { maxAge: 60, path: '/', sameSite: 'lax' as const }
  response.cookies.set('cyclo_gmail_email', userInfo.email ?? '', cookieOpts)
  if (tokens.access_token) response.cookies.set('cyclo_gmail_access_token', tokens.access_token, cookieOpts)
  if (tokens.refresh_token) response.cookies.set('cyclo_gmail_refresh_token', tokens.refresh_token, cookieOpts)

  return response
}
