import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createAdminClient()

    // Leads contactés sur WhatsApp ou avec un statut de relance
    const { data: leads, error } = await admin
      .from('leads')
      .select('id, first_name, last_name, phone, email, formation, formation_format, formation_start_date, price_fixed, price_deposit, status, closer_id, relance_status, relance_notes, whatsapp_conversation_started_at, whatsapp_relance_1_at, whatsapp_relance_2_at, whatsapp_relance_3_at, created_at')
      .or('whatsapp_conversation_started_at.not.is.null,relance_status.not.is.null,whatsapp_relance_1_at.not.is.null')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ leads: [] })
    }

    const leadIds = leads.map(l => l.id)

    // Dernier échange par lead (message + direction + date)
    const { data: lastExchanges } = await admin
      .from('whatsapp_exchanges')
      .select('lead_id, direction, message, sent_at')
      .in('lead_id', leadIds)
      .order('sent_at', { ascending: false })

    // Grouper par lead : dernier échange
    const lastByLead: Record<string, { last_contact: string; last_sender: 'nous' | 'eux'; last_message: string; has_unanswered: boolean }> = {}
    for (const ex of (lastExchanges || [])) {
      if (!lastByLead[ex.lead_id]) {
        lastByLead[ex.lead_id] = {
          last_contact: ex.sent_at,
          last_sender: ex.direction === 'sent' ? 'nous' : 'eux',
          last_message: ex.message,
          has_unanswered: ex.direction === 'sent',
        }
      }
    }

    // Closers
    const closerIds = [...new Set(leads.map(l => l.closer_id).filter(Boolean))]
    let closersMap: Record<string, string> = {}
    if (closerIds.length > 0) {
      const { data: closers } = await admin
        .from('users')
        .select('id, full_name, email')
        .in('id', closerIds)
      if (closers) {
        closers.forEach((c: any) => { closersMap[c.id] = c.full_name || c.email })
      }
    }

    const now = Date.now()
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000

    const result = leads.map(lead => {
      const exchange = lastByLead[lead.id]
      const lastContact = exchange?.last_contact
        || lead.whatsapp_relance_3_at
        || lead.whatsapp_relance_2_at
        || lead.whatsapp_relance_1_at
        || lead.whatsapp_conversation_started_at
        || null

      const isAlert = lastContact
        && (now - new Date(lastContact).getTime()) > THREE_DAYS
        && (!lead.relance_status || !['close', 'abandonne'].includes(lead.relance_status))
        && (exchange ? exchange.has_unanswered : true)

      return {
        id: lead.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        phone: lead.phone,
        formation: lead.formation,
        formation_format: lead.formation_format,
        formation_start_date: lead.formation_start_date,
        price_fixed: lead.price_fixed,
        price_deposit: lead.price_deposit,
        relance_status: lead.relance_status || 'en_attente',
        relance_notes: lead.relance_notes || '',
        last_contact: lastContact,
        last_sender: exchange?.last_sender || null,
        last_message: exchange?.last_message || null,
        alert: !!isAlert,
        closer_name: lead.closer_id ? closersMap[lead.closer_id] || null : null,
      }
    })

    return NextResponse.json({ leads: result })
  } catch (err: any) {
    console.error('suivi-relances GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
