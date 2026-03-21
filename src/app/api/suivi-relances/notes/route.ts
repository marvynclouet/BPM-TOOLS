import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { leadId, notes } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId requis' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from('leads')
      .update({ relance_notes: notes || null })
      .eq('id', leadId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
