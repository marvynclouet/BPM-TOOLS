import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoMode, getDemoLeads } from '@/lib/demo-data'
import SuiviRelancesTable from '@/components/suivi-relances/SuiviRelancesTable'

export const dynamic = 'force-dynamic'

export default async function SuiviRelancesPage() {
  const cookieStore = await cookies()
  const demoSession = cookieStore.get('demo_session')?.value === '1'

  if (isDemoMode() && demoSession) {
    const demoLeads = getDemoLeads()
    const now = Date.now()
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000
    const contacted = demoLeads.filter((l: any) => l.whatsapp_conversation_started_at || l.whatsapp_relance_1_at)
    const mapped = contacted.map((l: any) => {
      const lastContact = l.whatsapp_relance_3_at || l.whatsapp_relance_2_at || l.whatsapp_relance_1_at || l.whatsapp_conversation_started_at
      return {
        id: l.id,
        first_name: l.first_name,
        last_name: l.last_name,
        phone: l.phone,
        formation: l.formation,
        formation_format: l.formation_format,
        formation_start_date: l.formation_start_date,
        price_fixed: l.price_fixed,
        price_deposit: l.price_deposit,
        relance_status: l.relance_status || 'en_attente',
        relance_notes: '',
        last_contact: lastContact,
        last_sender: null,
        last_message: null,
        alert: lastContact ? (now - new Date(lastContact).getTime()) > THREE_DAYS : false,
        closer_name: null,
      }
    })

    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Suivi Relances</h1>
          <p className="text-white/50 text-sm sm:text-base lg:text-lg">Suivi des conversations WhatsApp et relances</p>
        </div>
        <SuiviRelancesTable initialLeads={mapped} />
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const admin = createAdminClient()

  const { data: leads } = await admin
    .from('leads')
    .select('id, first_name, last_name, phone, formation, formation_format, formation_start_date, price_fixed, price_deposit, status, closer_id, relance_status, relance_notes, whatsapp_conversation_started_at, whatsapp_relance_1_at, whatsapp_relance_2_at, whatsapp_relance_3_at, created_at')
    .or('whatsapp_conversation_started_at.not.is.null,relance_status.not.is.null,whatsapp_relance_1_at.not.is.null')
    .order('created_at', { ascending: false })

  if (!leads || leads.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Suivi Relances</h1>
          <p className="text-white/50 text-sm sm:text-base lg:text-lg">Suivi des conversations WhatsApp et relances</p>
        </div>
        <SuiviRelancesTable initialLeads={[]} />
      </div>
    )
  }

  const leadIds = leads.map(l => l.id)

  // Dernier échange par lead (avec contenu du message)
  const { data: lastExchanges } = await admin
    .from('whatsapp_exchanges')
    .select('lead_id, direction, message, sent_at')
    .in('lead_id', leadIds)
    .order('sent_at', { ascending: false })

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
    if (closers) closers.forEach((c: any) => { closersMap[c.id] = c.full_name || c.email })
  }

  const now = Date.now()
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000

  const mapped = leads.map(lead => {
    const exchange = lastByLead[lead.id]
    const lastContact = exchange?.last_contact
      || lead.whatsapp_relance_3_at || lead.whatsapp_relance_2_at || lead.whatsapp_relance_1_at
      || lead.whatsapp_conversation_started_at || null

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

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Suivi Relances</h1>
        <p className="text-white/50 text-sm sm:text-base lg:text-lg">Suivi des conversations WhatsApp et relances</p>
      </div>
      <SuiviRelancesTable initialLeads={mapped} />
    </div>
  )
}
