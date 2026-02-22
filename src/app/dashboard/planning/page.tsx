import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import PlanningView from '@/components/planning/PlanningView'
import PlanningClient from '@/components/planning/PlanningClient'
import { isDemoMode } from '@/lib/demo-data'
// Toujours exécuter côté serveur pour avoir les créneaux à jour (évite cache navigation)
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PlanningPage() {
  const cookieStore = await cookies()
  const demoSession = cookieStore.get('demo_session')?.value === '1'
  if (isDemoMode() && demoSession) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Planning</h1>
          <p className="text-white/50 text-sm sm:text-base lg:text-lg">Gestion du planning des formations</p>
          <p className="text-white/40 text-xs">Mode démo : aucune session en base. Connectez-vous avec un compte réel pour voir vos sessions.</p>
        </div>
        <PlanningView entries={[]} />
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

  const user = await getCurrentUser()
  const isAdmin = user?.role === 'admin'

  const adminClient = createAdminClient()

  // Leads Clos / Acompte : uniquement pour la liste des participants dans "Ajouter une session"
  const { data: leads } = await adminClient
    .from('leads')
    .select('id, first_name, last_name')
    .in('status', ['clos', 'acompte_regle'])
    .order('last_name', { ascending: true })

  // Plus de création automatique de sessions : tout se fait à la main via "Ajouter une session"

  let planningRaw: any[] = []
  let planningLeadRows: { planning_id: string; lead_id: string }[] = []
  let planningError: string | null = null

  // Sélection : id, dates, et lead_id si la colonne existe (fallback pour BDD sans planning_lead)
  let planningRes = await adminClient
    .from('planning')
    .select('id, start_date, end_date, specific_dates, gcal_event_id, created_at, updated_at, lead_id')
    .order('start_date', { ascending: true })
    .order('id', { ascending: true })

  if (planningRes.error) {
    if (planningRes.error.message?.includes('lead_id') || (planningRes.error as any)?.code === '42703') {
      planningRes = await adminClient
        .from('planning')
        .select('id, start_date, end_date, specific_dates, gcal_event_id, created_at, updated_at')
        .order('start_date', { ascending: true })
        .order('id', { ascending: true })
    }
  }
  if (planningRes.error) {
    console.error('Error fetching planning:', planningRes.error)
    planningError = planningRes.error.message
  } else {
    planningRaw = planningRes.data || []
  }

  const planningIds = (planningRaw || []).map((p: any) => p.id).filter(Boolean)
  if (planningIds.length > 0) {
    const plRes = await adminClient.from('planning_lead').select('planning_id, lead_id').in('planning_id', planningIds)
    if (!plRes.error) {
      planningLeadRows = plRes.data || []
    }
  }

  const planningLeadByPlanningId = planningLeadRows.reduce((acc, row) => {
    if (!acc[row.planning_id]) acc[row.planning_id] = []
    acc[row.planning_id].push(row.lead_id)
    return acc
  }, {} as Record<string, string[]>)

  const allLeadIds = new Set<string>()
  for (const p of planningRaw) {
    if (p.lead_id) allLeadIds.add(p.lead_id)
    for (const lid of planningLeadByPlanningId[p.id] || []) {
      allLeadIds.add(lid)
    }
  }
  let leadsById: Record<string, any> = {}
  if (allLeadIds.size > 0) {
    const { data: leadsData } = await adminClient
      .from('leads')
      .select('id, first_name, last_name, phone, formation, formation_format, formation_day')
      .in('id', [...allLeadIds])
    leadsById = (leadsData || []).reduce((acc, l) => ({ ...acc, [l.id]: l }), {})
  }

  const missingLeadIds = new Set<string>()
  for (const p of planningRaw) {
    const leadIds = (planningLeadByPlanningId[p.id]?.length ? planningLeadByPlanningId[p.id] : null) || (p.lead_id ? [p.lead_id] : [])
    for (const lid of leadIds) {
      if (!leadsById[lid]) missingLeadIds.add(lid)
    }
  }
  if (missingLeadIds.size > 0) {
    const { data: extraLeads } = await adminClient
      .from('leads')
      .select('id, first_name, last_name, phone, formation, formation_format, formation_day')
      .in('id', [...missingLeadIds])
    for (const l of extraLeads || []) {
      leadsById[l.id] = l
    }
  }

  let planning = planningRaw.map((p: any) => {
    const leadIds = (planningLeadByPlanningId[p.id]?.length ? planningLeadByPlanningId[p.id] : null) || (p.lead_id ? [p.lead_id] : [])
    const leadsList = leadIds.map((lid: string) => leadsById[lid]).filter(Boolean)
    return {
      ...p,
      leads: leadsList,
      lead_id: leadIds[0],
      lead_ids: leadIds,
    }
  })

  const byDateKey = new Map<string, any[]>()
  for (const entry of planning) {
    const key = `${String(entry.start_date || '').slice(0, 10)}|${String(entry.end_date || '').slice(0, 10)}`
    if (!byDateKey.has(key)) byDateKey.set(key, [])
    byDateKey.get(key)!.push(entry)
  }
  const merged: any[] = []
  for (const [, group] of byDateKey) {
    if (group.length === 0) continue
    // Tri par id pour que la même session "représentante" soit toujours choisie à chaque actualisation
    group.sort((a: any, b: any) => (a.id || '').localeCompare(b.id || ''))
    if (group.length === 1) {
      merged.push(group[0])
      continue
    }
    const allLeads: any[] = []
    const allLeadIds: string[] = []
    const seen = new Set<string>()
    for (const e of group) {
      for (const l of e.leads || []) {
        if (l?.id && !seen.has(l.id)) {
          seen.add(l.id)
          allLeads.push(l)
          allLeadIds.push(l.id)
        }
      }
      for (const lid of e.lead_ids || []) {
        if (lid && !seen.has(lid)) {
          seen.add(lid)
          const l = leadsById[lid]
          if (l) allLeads.push(l)
          allLeadIds.push(lid)
        }
      }
    }
    const first = group[0]
    merged.push({
      ...first,
      id: first.id,
      leads: allLeads.length ? allLeads : first.leads,
      lead_id: allLeadIds[0] || first.lead_id,
      lead_ids: allLeadIds.length ? allLeadIds : first.lead_ids,
      _allIds: group.map((e: any) => e.id),
    })
  }
  planning = merged.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Planning</h1>
        <p className="text-white/50 text-sm sm:text-base lg:text-lg">Gestion du planning des formations</p>
      </div>

      {planningError ? (
        <div className="apple-card rounded-2xl p-6 text-center">
          <p className="text-amber-300 font-medium">Impossible de charger le planning.</p>
          <p className="text-white/60 text-sm mt-1">{planningError}</p>
          <p className="text-white/50 text-xs mt-2">Vérifiez la connexion à la base et réactualisez la page.</p>
        </div>
      ) : (
        <PlanningClient entries={planning} leads={leads || []} isAdmin={isAdmin} />
      )}
    </div>
  )
}
