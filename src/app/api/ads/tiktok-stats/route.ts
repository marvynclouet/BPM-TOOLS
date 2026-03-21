import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('ads_tiktok_stats')
      .select('*')
      .order('post_date', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ stats: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()

    const { video_title, video_url, views, likes, comments, shares, leads_estimated, post_date } = body
    if (!video_title?.trim()) {
      return NextResponse.json({ error: 'video_title requis' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('ads_tiktok_stats')
      .insert({
        video_title: video_title.trim(),
        video_url: video_url || null,
        views: views || 0,
        likes: likes || 0,
        comments: comments || 0,
        shares: shares || 0,
        leads_estimated: leads_estimated || 0,
        post_date: post_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ stat: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
