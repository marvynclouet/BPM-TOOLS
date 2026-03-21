import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('ads_settings')
      .select('*')
      .limit(1)
      .single()

    if (error) return NextResponse.json({ budget_percent: 10 })
    return NextResponse.json({ budget_percent: Number(data.budget_percent) || 10 })
  } catch {
    return NextResponse.json({ budget_percent: 10 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const { budget_percent } = await request.json()

    const pct = Math.max(0, Math.min(100, Number(budget_percent) || 10))

    // Get the single row id
    const { data: existing } = await admin
      .from('ads_settings')
      .select('id')
      .limit(1)
      .single()

    if (existing) {
      await admin
        .from('ads_settings')
        .update({ budget_percent: pct, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await admin
        .from('ads_settings')
        .insert({ budget_percent: pct })
    }

    return NextResponse.json({ budget_percent: pct })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
