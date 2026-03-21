import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const leadId = request.nextUrl.searchParams.get('leadId')
    if (!leadId) {
      return NextResponse.json({ error: 'leadId requis' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: exchanges, error } = await admin
      .from('whatsapp_exchanges')
      .select('id, lead_id, direction, message, sent_at, created_by, created_at')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ exchanges: exchanges || [] })
  } catch (err: any) {
    console.error('suivi-relances history error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
