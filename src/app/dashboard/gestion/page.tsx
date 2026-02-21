import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import GestionTable from '@/components/gestion/GestionTable'
import AutoRelanceChecker from '@/components/gestion/AutoRelanceChecker'
import { isDemoMode, getDemoLeads, getDemoUser, getDemoClosers } from '@/lib/demo-data'
export default async function GestionPage() {
  const cookieStore = await cookies()
  const demoSession = cookieStore.get('demo_session')?.value === '1'
  if (isDemoMode() && demoSession) {
    const demoLeads = getDemoLeads()
    const demoUser = getDemoUser()
    const closersMap: Record<string, { full_name: string | null; email: string }> = {}
    getDemoClosers().forEach(c => { closersMap[c.id] = { full_name: c.full_name, email: c.email } })
    const closedLeads = demoLeads.filter(l => l.status === 'clos' || l.status === 'acompte_regle')
    const acompteDemo = closedLeads.filter((l: { status: string }) => l.status === 'acompte_regle').map((lead: any) => ({
      ...lead,
      planning: [],
      closer: lead.closer_id ? closersMap[lead.closer_id] : null,
      acompte_paid: lead.price_deposit ?? 0,
      remaining_amount: lead.price_fixed != null && lead.price_deposit != null ? lead.price_fixed - lead.price_deposit : null,
      accounting_entry_id: null,
    }))
    const closDemo = closedLeads.filter((l: { status: string }) => l.status === 'clos').map((lead: any) => ({
      ...lead,
      planning: [],
      closer: lead.closer_id ? closersMap[lead.closer_id] : null,
    }))
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
        <AutoRelanceChecker />
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Gestion</h1>
          <p className="text-white/50 text-sm sm:text-base lg:text-lg">Gestion des leads chauds et élèves closés</p>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">💰 Acomptes en cours</h2>
            <span className="px-2 sm:px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs sm:text-sm font-medium">
              {acompteDemo.length}
            </span>
          </div>
          <p className="text-white/50 text-xs sm:text-sm">Élèves avec acompte réglé – restant à payer, closer</p>
          <GestionTable leads={acompteDemo as any} showWhatsAppGroup={false} showDocuments={true} showAcompteEnCours={true} />
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">✅ Leads clos (payés en entier)</h2>
            <span className="px-2 sm:px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs sm:text-sm font-medium">
              {closDemo.length}
            </span>
          </div>
          <p className="text-white/50 text-xs sm:text-sm">Générer et envoyer les documents (attestation et facture)</p>
          <GestionTable leads={closDemo as any} showWhatsAppGroup={false} showDocuments={true} />
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const adminClient = createAdminClient()

  // Récupérer leads acompte réglé (acomptes en cours) et clos (payés en entier)
  const { data: closedLeads, error: closedLeadsError } = await adminClient
    .from('leads')
    .select('*')
    .in('status', ['clos', 'acompte_regle'])
    .order('created_at', { ascending: false })

  const acompteRegleLeads = (closedLeads || []).filter((l: { status: string }) => l.status === 'acompte_regle')
  const closOnlyLeads = (closedLeads || []).filter((l: { status: string }) => l.status === 'clos')
  const acompteRegleIds = acompteRegleLeads.map((l: { id: string }) => l.id)

  // Restant à payer et acompte payé depuis la compta (accounting_entries) + id entrée pour édition
  let accountingByLead: Record<string, { id: string; amount: number; remaining_amount: number | null }> = {}
  if (acompteRegleIds.length > 0) {
    const { data: accEntries } = await adminClient
      .from('accounting_entries')
      .select('id, lead_id, amount, remaining_amount, entry_type, status')
      .in('lead_id', acompteRegleIds)
      .eq('entry_type', 'acompte')
    const activeEntries = (accEntries || []).filter((e: { status?: string }) => (e.status || 'actif') !== 'annulé')
    if (activeEntries.length) {
      activeEntries.forEach((e: { id: string; lead_id: string; amount: number; remaining_amount: number | null }) => {
        accountingByLead[e.lead_id] = { id: e.id, amount: Number(e.amount), remaining_amount: e.remaining_amount != null ? Number(e.remaining_amount) : null }
      })
    }
    // Si pas d'entrée compta, déduire du lead (price_fixed - price_deposit)
    acompteRegleLeads.forEach((l: { id: string; price_fixed: number | null; price_deposit: number | null }) => {
      if (!accountingByLead[l.id]) {
        const total = l.price_fixed != null ? Number(l.price_fixed) : 0
        const deposit = l.price_deposit != null ? Number(l.price_deposit) : 0
        accountingByLead[l.id] = { id: '', amount: deposit, remaining_amount: total - deposit }
      }
    })
  }

  const closerIds = [...new Set((closedLeads || []).map((l: { closer_id?: string }) => l.closer_id).filter(Boolean))]
  let closersMap: Record<string, { full_name: string | null; email: string }> = {}
  if (closerIds.length > 0) {
    const { data: closers } = await adminClient
      .from('users')
      .select('id, full_name, email')
      .in('id', closerIds)
    if (closers) {
      closers.forEach((closer: { id: string; full_name: string | null; email: string }) => {
        closersMap[closer.id] = { full_name: closer.full_name, email: closer.email }
      })
    }
  }

  const allLeadIds = (closedLeads || []).map((l: { id: string }) => l.id)
  let planningByLead: Record<string, any[]> = {}
  if (allLeadIds.length > 0) {
    const { data: links } = await adminClient
      .from('planning_lead')
      .select('planning_id, lead_id')
      .in('lead_id', allLeadIds)
    const planningIds = [...new Set((links || []).map((l: any) => l.planning_id))]
    const { data: planningRows } = planningIds.length > 0
      ? await adminClient.from('planning').select('*').in('id', planningIds)
      : { data: [] }
    const planningEntries = planningRows || []
    planningByLead = allLeadIds.reduce((acc: Record<string, any[]>, lid: string) => {
      acc[lid] = planningEntries.filter((p: any) => links?.some((l: any) => l.planning_id === p.id && l.lead_id === lid))
      return acc
    }, {})
  }

  const acompteEnCoursWithPlanning = acompteRegleLeads.map((lead: any) => ({
    ...lead,
    planning: planningByLead[lead.id] || [],
    closer: lead.closer_id ? closersMap[lead.closer_id] : null,
    acompte_paid: accountingByLead[lead.id]?.amount ?? lead.price_deposit ?? 0,
    remaining_amount: accountingByLead[lead.id]?.remaining_amount ?? (lead.price_fixed != null && lead.price_deposit != null ? lead.price_fixed - lead.price_deposit : null),
    accounting_entry_id: accountingByLead[lead.id]?.id || null,
  }))

  const closedLeadsWithPlanning = closOnlyLeads.map((lead: any) => ({
    ...lead,
    planning: planningByLead[lead.id] || [],
    closer: lead.closer_id ? closersMap[lead.closer_id] : null,
  }))

  if (closedLeadsError) {
    console.error('Error fetching leads:', closedLeadsError)
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
      <AutoRelanceChecker />
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Gestion</h1>
        <p className="text-white/50 text-sm sm:text-base lg:text-lg">Gestion des leads chauds et élèves closés</p>
      </div>

      {/* Section Acomptes en cours (reste à payer, closer, suivi) */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">💰 Acomptes en cours</h2>
          <span className="px-2 sm:px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs sm:text-sm font-medium">
            {acompteEnCoursWithPlanning.length}
          </span>
        </div>
        <p className="text-white/50 text-xs sm:text-sm">Élèves avec acompte réglé – restant à payer, closer en charge, modifier en compta</p>
        <GestionTable
          leads={acompteEnCoursWithPlanning as any}
          showWhatsAppGroup={false}
          showDocuments={true}
          showAcompteEnCours={true}
        />
      </div>

      {/* Section 3 : Leads clos (payement complet, documents) */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">✅ Leads clos (payés en entier)</h2>
          <span className="px-2 sm:px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs sm:text-sm font-medium">
            {closedLeadsWithPlanning.length}
          </span>
        </div>
        <p className="text-white/50 text-xs sm:text-sm">Générer et envoyer les documents (attestation et facture)</p>
        <GestionTable
          leads={closedLeadsWithPlanning as any}
          showWhatsAppGroup={false}
          showDocuments={true}
        />
      </div>
    </div>
  )
}
