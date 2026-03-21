import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('ads_reports')
      .select('*')
      .order('report_date', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reports: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()

    const { report_date, source, title, content, recommendations } = body
    if (!title?.trim() || !content?.trim() || !source) {
      return NextResponse.json({ error: 'title, content et source requis' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('ads_reports')
      .insert({
        report_date: report_date || new Date().toISOString().split('T')[0],
        source,
        title: title.trim(),
        content: content.trim(),
        recommendations: recommendations?.trim() || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ report: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
