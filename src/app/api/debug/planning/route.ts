import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Debug : état des tables planning et planning_lead.
 * GET /api/debug/planning
 */
export async function GET() {
  try {
    const admin = createAdminClient()

    const [planningRes, planningLeadRes] = await Promise.all([
      admin.from('planning').select('id, start_date, end_date, created_at').order('start_date', { ascending: true }).limit(50),
      admin.from('planning_lead').select('planning_id, lead_id').limit(100),
    ])

    // Vérifier les colonnes de planning (via une requête qui échoue proprement si lead_id n'existe pas)
    let planningHasLeadId = false
    try {
      const testRes = await admin.from('planning').select('id').limit(1).single()
      if (testRes.data) {
        const fullRes = await admin.from('planning').select('*').limit(1).single()
        planningHasLeadId = fullRes.data && 'lead_id' in (fullRes.data as object)
      }
    } catch {
      // ignore
    }

    const planning = planningRes.data || []
    const planningLead = planningLeadRes.data || []
    const planningIds = planning.map((p: any) => p.id)
    const leadIds = [...new Set(planningLead.map((pl: any) => pl.lead_id))]

    let leadsSample: any[] = []
    if (leadIds.length > 0) {
      const { data: leads } = await admin
        .from('leads')
        .select('id, first_name, last_name, status')
        .in('id', leadIds.slice(0, 20))
      leadsSample = leads || []
    }

    return NextResponse.json({
      planning_count: planning.length,
      planning_lead_count: planningLead.length,
      planning_has_lead_id_column: planningHasLeadId,
      planning_sample: planning.slice(0, 5),
      planning_lead_sample: planningLead.slice(0, 10),
      leads_in_planning: leadIds.length,
      leads_sample: leadsSample,
      message:
        planning.length === 0
          ? 'Table planning vide. Ajoutez des sessions via "Ajouter une session" sur la page Planning.'
          : planningLead.length === 0
          ? 'Sessions présentes mais aucun lien planning_lead. Vérifiez la table planning_lead.'
          : 'OK',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}
