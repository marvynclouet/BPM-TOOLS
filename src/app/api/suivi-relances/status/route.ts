import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { leadId, status } = body

    if (!leadId || !status) {
      return NextResponse.json({ error: 'leadId et status requis' }, { status: 400 })
    }

    const validStatuses = ['en_attente', 'relance', 'repondu', 'close', 'abandonne']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Statut invalide. Valeurs: ${validStatuses.join(', ')}` }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from('leads')
      .update({ relance_status: status })
      .eq('id', leadId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('suivi-relances status error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
