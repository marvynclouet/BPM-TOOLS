import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PlanningView from '@/components/planning/PlanningView'
import PlanningClient from '@/components/planning/PlanningClient'
import { isDemoMode } from '@/lib/demo-data'

export default async function PlanningPage() {
  const cookieStore = await cookies()
  const demoSession = cookieStore.get('demo_session')?.value === '1'
  if (isDemoMode() && demoSession) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Planning</h1>
          <p className="text-white/50 text-sm sm:text-base lg:text-lg">Gestion du planning des formations</p>
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

  const adminClient = createAdminClient()

  const { data: leads } = await adminClient
    .from('leads')
    .select('id, first_name, last_name')
    .in('status', ['clos', 'acompte_regle'])
    .order('last_name', { ascending: true })

  let planningRaw: any[] = []
  let planningLeadRows: { planning_id: string; lead_id: string }[] = []

  const planningRes = await adminClient
    .from('planning')
    .select('*')
    .order('start_date', { ascending: true })

  if (planningRes.error) {
    console.error('Error fetching planning:', planningRes.error)
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

  const planning = planningRaw.map((p: any) => {
    const leadIds = (planningLeadByPlanningId[p.id]?.length ? planningLeadByPlanningId[p.id] : null) || (p.lead_id ? [p.lead_id] : [])
    const leadsList = leadIds.map((lid: string) => leadsById[lid]).filter(Boolean)
    return {
      ...p,
      leads: leadsList,
      lead_id: leadIds[0],
      lead_ids: leadIds,
    }
  })

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Planning</h1>
        <p className="text-white/50 text-sm sm:text-base lg:text-lg">Gestion du planning des formations</p>
      </div>

      <PlanningClient entries={planning} leads={leads || []} />
    </div>
  )
}
