import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import GestionTable from '@/components/gestion/GestionTable'

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
    // Note: Un lead chaud peut ne pas avoir de planning encore
    const { data: hotLeads, error: hotLeadsError } = await adminClient
      .from('leads')
      .select('*')
      .eq('interest_level', 'chaud')
      .eq('closer_id', currentUserId)
      .order('created_at', { ascending: false })

  // 2. Récupérer tous les leads closés
  const { data: closedLeads, error: closedLeadsError } = await adminClient
    .from('leads')
    .select('*')
    .eq('status', 'clos')
    .order('created_at', { ascending: false })

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
  }))

  if (hotLeadsError || closedLeadsError) {
    console.error('Error fetching leads:', hotLeadsError || closedLeadsError)
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Gestion</h1>
        <p className="text-white/50 text-lg">Gestion des leads chauds et élèves closés</p>
      </div>

      {/* Section 1 : Leads chauds (pour créer groupes WhatsApp) */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">🔥 Leads chauds</h2>
          <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm font-medium">
            {hotLeadsWithPlanning.length}
          </span>
        </div>
        <p className="text-white/50 text-sm">Leads chauds attribués à vous - Créez des groupes WhatsApp</p>
        <GestionTable 
          leads={hotLeadsWithPlanning} 
          showWhatsAppGroup={true}
          showDocuments={false}
        />
      </div>

      {/* Section 2 : Leads closés (pour générer documents) */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">✅ Leads closés</h2>
          <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium">
            {closedLeadsWithPlanning.length}
          </span>
        </div>
        <p className="text-white/50 text-sm">Générer et envoyer les documents (attestation et facture)</p>
        <GestionTable 
          leads={closedLeadsWithPlanning} 
          showWhatsAppGroup={false}
          showDocuments={true}
        />
      </div>
    </div>
  )
}
