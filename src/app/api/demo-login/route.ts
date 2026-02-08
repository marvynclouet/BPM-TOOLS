import { NextRequest, NextResponse } from 'next/server'

const DEMO_EMAIL = 'demo@bpm-tools-demo.fr'
const DEMO_PASSWORD = 'Demo123!'
const COOKIE_NAME = 'demo_session'

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo mode disabled' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set(COOKIE_NAME, '1', {
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
