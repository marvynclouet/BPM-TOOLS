import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const admin = createAdminClient()
    const body = await request.json()

    const allowed = ['name', 'platform', 'budget', 'spent', 'leads_generated', 'status', 'date_start', 'date_end', 'notes']
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key]
    }

    // Auto-compute CPL
    const spent = updates.spent ?? body._current_spent
    const leadsGen = updates.leads_generated ?? body._current_leads
    if (spent !== undefined && leadsGen !== undefined && leadsGen > 0) {
      updates.cpl = Math.round((spent / leadsGen) * 100) / 100
    }

    const { data, error } = await admin
      .from('ads_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ campaign: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const admin = createAdminClient()
    const { error } = await admin.from('ads_campaigns').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
