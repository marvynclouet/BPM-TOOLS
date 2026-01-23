import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import GestionTable from '@/components/gestion/GestionTable'
import AutoRelanceChecker from '@/components/gestion/AutoRelanceChecker'

export default async function GestionPage() {
  const supabase = await createClient()
  
  // Vérifier si connecté
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Récupérer l'utilisateur complet pour avoir son ID
  const user = await getCurrentUser()
  const currentUserId = user?.id || authUser.id

  const adminClient = createAdminClient()
  
    // 1. Récupérer les leads "chauds" attribués à l'utilisateur connecté
    // Inclut: interest_level='chaud' OU status='en_cours_de_closing' OU status='acompte_en_cours'
    // Note: Un lead chaud peut ne pas avoir de planning encore
    const { data: hotLeads, error: hotLeadsError } = await adminClient
      .from('leads')
      .select('*')
      .eq('closer_id', currentUserId)
      .or('interest_level.eq.chaud,status.eq.en_cours_de_closing,status.eq.acompte_en_cours')
      .order('created_at', { ascending: false })

  // 2. Récupérer tous les leads closés avec le closer
  const { data: closedLeads, error: closedLeadsError } = await adminClient
    .from('leads')
    .select('*')
    .eq('status', 'clos')
    .order('created_at', { ascending: false })

  // Récupérer les informations des closers pour les leads closés
  const closerIds = [...new Set((closedLeads || []).map(l => l.closer_id).filter(Boolean))]
  let closersMap: Record<string, { full_name: string | null; email: string }> = {}
  
  if (closerIds.length > 0) {
    const { data: closers } = await adminClient
      .from('users')
      .select('id, full_name, email')
      .in('id', closerIds)
    
    if (closers) {
      closers.forEach(closer => {
        closersMap[closer.id] = {
          full_name: closer.full_name,
          email: closer.email,
        }
      })
    }
  }

  // Récupérer les entrées de planning pour tous les leads
  const allLeadIds = [
    ...(hotLeads?.map(l => l.id) || []),
    ...(closedLeads?.map(l => l.id) || [])
  ]
  let planningEntries: any[] = []
  
  if (allLeadIds.length > 0) {
    const { data: planning } = await adminClient
      .from('planning')
      .select('*')
      .in('lead_id', allLeadIds)
    
    planningEntries = planning || []
  }

  // Combiner les données
  const hotLeadsWithPlanning = (hotLeads || []).map(lead => ({
    ...lead,
    planning: planningEntries.filter(p => p.lead_id === lead.id),
  }))

  const closedLeadsWithPlanning = (closedLeads || []).map(lead => ({
    ...lead,
    planning: planningEntries.filter(p => p.lead_id === lead.id),
    closer: lead.closer_id ? closersMap[lead.closer_id] : null,
  }))

  if (hotLeadsError || closedLeadsError) {
    console.error('Error fetching leads:', hotLeadsError || closedLeadsError)
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
      <AutoRelanceChecker />
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Gestion</h1>
        <p className="text-white/50 text-sm sm:text-base lg:text-lg">Gestion des leads chauds et élèves closés</p>
      </div>

      {/* Section 1 : Leads chauds (pour ouvrir conversations WhatsApp) */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">🔥 Leads chauds</h2>
          <span className="px-2 sm:px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs sm:text-sm font-medium">
            {hotLeadsWithPlanning.length}
          </span>
        </div>
        <p className="text-white/50 text-xs sm:text-sm">Leads chauds, en cours de closing et acompte en cours - Ouvrez des conversations WhatsApp</p>
        <GestionTable 
          leads={hotLeadsWithPlanning} 
          showWhatsAppGroup={true}
          showDocuments={false}
        />
      </div>

      {/* Section 2 : Leads closés (pour générer documents) */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">✅ Leads closés</h2>
          <span className="px-2 sm:px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs sm:text-sm font-medium">
            {closedLeadsWithPlanning.length}
          </span>
        </div>
        <p className="text-white/50 text-xs sm:text-sm">Générer et envoyer les documents (attestation et facture)</p>
        <GestionTable 
          leads={closedLeadsWithPlanning} 
          showWhatsAppGroup={false}
          showDocuments={true}
        />
      </div>
    </div>
  )
}
