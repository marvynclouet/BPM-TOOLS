import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('ads_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ campaigns: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()

    const { name, platform, budget, spent, leads_generated, status, date_start, date_end, notes } = body
    if (!name?.trim()) {
      return NextResponse.json({ error: 'nom requis' }, { status: 400 })
    }

    const cpl = (leads_generated && leads_generated > 0 && spent)
      ? Math.round((spent / leads_generated) * 100) / 100
      : null

    const { data, error } = await admin
      .from('ads_campaigns')
      .insert({
        name: name.trim(),
        platform: platform || 'meta',
        budget: budget || 0,
        spent: spent || 0,
        leads_generated: leads_generated || 0,
        cpl,
        status: status || 'active',
        date_start: date_start || null,
        date_end: date_end || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ campaign: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
