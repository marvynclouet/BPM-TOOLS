import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { leadId, direction, message } = body

    if (!leadId || !direction || !message) {
      return NextResponse.json({ error: 'leadId, direction et message requis' }, { status: 400 })
    }

    if (!['sent', 'received'].includes(direction)) {
      return NextResponse.json({ error: 'direction doit être sent ou received' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Créer l'échange
    const { data: exchange, error } = await admin
      .from('whatsapp_exchanges')
      .insert({
        lead_id: leadId,
        direction,
        message,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Mettre à jour le statut relance du lead automatiquement
    const newStatus = direction === 'sent' ? 'relance' : 'repondu'
    await admin
      .from('leads')
      .update({ relance_status: newStatus })
      .eq('id', leadId)

    return NextResponse.json({ exchange })
  } catch (err: any) {
    console.error('suivi-relances exchange error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
