import { NextResponse } from 'next/server'

const COOKIE_NAME = 'demo_session'

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('demo_session', '', { path: '/', maxAge: 0 })
  return res
}
