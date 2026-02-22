import { createAdminClient } from '@/lib/supabase/admin'

export interface AIAlert {
  type: 'clos_sans_planning' | 'sessions_fragmentees' | 'acompte_formation_proche' | 'ko_sans_commentaire'
  message: string
  count?: number
  details?: string[]
}

const formationLabels: Record<string, string> = { inge_son: 'Ingé son', beatmaking: 'Beatmaking', autre: 'Autre' }
const formatLabels: Record<string, string> = { semaine: 'Semaine', mensuelle: 'Mensuelle', bpm_fast: 'BPM Fast' }

/**
 * Calcule les alertes IA pour le dashboard et l'assistant.
 */
export async function getAIAlerts(): Promise<AIAlert[]> {
  const admin = createAdminClient()
  const now = new Date()
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

  const alerts: AIAlert[] = []

  try {
    // 1. Leads clos ou acompte réglé
    const { data: closedLeads } = await admin
      .from('leads')
      .select('id, first_name, last_name, status, formation, formation_format, formation_start_date, price_fixed, price_deposit')
      .in('status', ['clos', 'acompte_regle'])

    if (!closedLeads || closedLeads.length === 0) return alerts

    const closedIds = closedLeads.map((l: any) => l.id)
    const closOnly = closedLeads.filter((l: any) => l.status === 'clos')
    const acompteRegle = closedLeads.filter((l: any) => l.status === 'acompte_regle')

    // Leads dans le planning
    const { data: planningLinks } = await admin
      .from('planning_lead')
      .select('lead_id, planning_id')
      .in('lead_id', closedIds)

    const leadIdsInPlanning = new Set((planningLinks || []).map((l: any) => l.lead_id))

    // --- Alerte 1 : Clos sans planning ---
    const closSansPlanning = closOnly.filter((l: any) => !leadIdsInPlanning.has(l.id))
    if (closSansPlanning.length > 0) {
      alerts.push({
        type: 'clos_sans_planning',
        message: `${closSansPlanning.length} lead${closSansPlanning.length > 1 ? 's' : ''} clos${closSansPlanning.length > 1 ? 's' : ''} non placé${closSansPlanning.length > 1 ? 's' : ''} sur le planning`,
        count: closSansPlanning.length,
        details: closSansPlanning.slice(0, 5).map((l: any) => `${l.first_name} ${l.last_name}`),
      })
    }

    // --- Alerte 2 & 3 : planning + acomptes ---
    const planningIds = [...new Set((planningLinks || []).map((l: any) => l.planning_id))]
    let planningEntries: any[] = []
    if (planningIds.length > 0) {
      const { data: planningData } = await admin
        .from('planning')
        .select('id, start_date, end_date')
        .in('id', planningIds)
        .gte('start_date', now.toISOString())
        .lte('end_date', in60Days.toISOString())
      planningEntries = planningData || []
    }

    const planningByLeadId: Record<string, any[]> = {}
    closedIds.forEach((lid: string) => {
      const pids = (planningLinks || []).filter((l: any) => l.lead_id === lid).map((l: any) => l.planning_id)
      planningByLeadId[lid] = planningEntries.filter((p: any) => pids.includes(p.id))
    })

    // --- Alerte 2 : Sessions fragmentées (même format, même date, pas même session) ---
    const planningWithLeads: { planning: any; leads: any[] }[] = []
    for (const p of planningEntries) {
      const leadsInP = (planningLinks || [])
        .filter((l: any) => l.planning_id === p.id)
        .map((l: any) => closedLeads.find((lead: any) => lead.id === l.lead_id))
        .filter(Boolean)
      if (leadsInP.length > 0) {
        planningWithLeads.push({ planning: p, leads: leadsInP })
      }
    }

    const groupsByKey: Record<string, { planning: any; leads: any[] }[]> = {}
    for (const item of planningWithLeads) {
      const startStr = item.planning.start_date?.slice(0, 10) || ''
      const firstLead = item.leads[0]
      const format = firstLead?.formation_format || ''
      const formation = firstLead?.formation || ''
      const key = `${formation}|${format}|${startStr}`
      if (!groupsByKey[key]) groupsByKey[key] = []
      groupsByKey[key].push(item)
    }

    const sessionsFragmentees: string[] = []
    for (const key of Object.keys(groupsByKey)) {
      const items = groupsByKey[key]
      if (items.length >= 2) {
        const [formation, format, startStr] = key.split('|')
        const label = `${formationLabels[formation] || formation} (${formatLabels[format] || format})`
        sessionsFragmentees.push(`${label} le ${new Date(startStr + 'T12:00:00').toLocaleDateString('fr-FR')} : ${items.length} sessions au lieu d'une`)
      }
    }
    if (sessionsFragmentees.length > 0) {
      alerts.push({
        type: 'sessions_fragmentees',
        message: `${sessionsFragmentees.length} formation${sessionsFragmentees.length > 1 ? 's' : ''} avec sessions fragmentées (même format, même date)`,
        details: sessionsFragmentees,
      })
    }

    // --- Alerte 3 : Acompte non soldé + formation bientôt ---
    let remainingByLead: Record<string, number> = {}
    if (acompteRegle.length > 0) {
      const acompteIds = acompteRegle.map((l: any) => l.id)
      const { data: accEntries } = await admin
        .from('accounting_entries')
        .select('lead_id, amount, remaining_amount')
        .in('lead_id', acompteIds)
        .eq('entry_type', 'acompte')
      ;(accEntries || []).forEach((e: any) => {
        const rem = e.remaining_amount != null ? Number(e.remaining_amount) : 0
        if (rem > 0) remainingByLead[e.lead_id] = rem
      })
      acompteRegle.forEach((l: any) => {
        if (remainingByLead[l.id] == null && l.price_fixed != null && l.price_deposit != null) {
          const rem = Number(l.price_fixed) - Number(l.price_deposit)
          if (rem > 0) remainingByLead[l.id] = rem
        }
      })
    }

    const acompteAlerte: { name: string; date: string; remaining: number }[] = []
    for (const lead of acompteRegle) {
      const remaining = remainingByLead[lead.id]
      if (remaining == null || remaining <= 0) continue

      let formationDate: Date | null = null
      const plannings = planningByLeadId[lead.id] || []
      if (plannings.length > 0 && plannings[0]?.start_date) {
        formationDate = new Date(plannings[0].start_date)
      } else if (lead.formation_start_date) {
        formationDate = new Date(lead.formation_start_date)
      }

      if (!formationDate) continue
      if (formationDate >= now && formationDate <= in14Days) {
        acompteAlerte.push({
          name: `${lead.first_name} ${lead.last_name}`,
          date: formationDate.toLocaleDateString('fr-FR'),
          remaining,
        })
      }
    }
    // --- Alerte 4 : KO sans commentaire ---
    const { data: koLeads } = await admin
      .from('leads')
      .select('id, first_name, last_name')
      .eq('status', 'ko')
    const koIds = (koLeads || []).map((l: any) => l.id)
    if (koIds.length > 0) {
      const { data: koComments } = await admin
        .from('lead_comments')
        .select('lead_id')
        .in('lead_id', koIds)
      const koWithComment = new Set((koComments || []).map((c: any) => c.lead_id))
      const koSansComment = (koLeads || []).filter((l: any) => !koWithComment.has(l.id))
      if (koSansComment.length > 0) {
        alerts.push({
          type: 'ko_sans_commentaire',
          message: `${koSansComment.length} lead${koSansComment.length > 1 ? 's' : ''} KO sans commentaire à documenter`,
          count: koSansComment.length,
          details: koSansComment.slice(0, 5).map((l: any) => `${l.first_name} ${l.last_name}`),
        })
      }
    }

    if (acompteAlerte.length > 0) {
      alerts.push({
        type: 'acompte_formation_proche',
        message: `${acompteAlerte.length} élève${acompteAlerte.length > 1 ? 's' : ''} avec solde à régler avant la formation (dans les 14 jours)`,
        count: acompteAlerte.length,
        details: acompteAlerte.map((a) => `${a.name} : ${a.remaining.toFixed(0)} € restant, formation le ${a.date}`),
      })
    }
  } catch (err: any) {
    console.error('getAIAlerts error:', err)
  }

  return alerts
}

/**
 * Retourne les alertes formatées pour l'affichage (chaînes courtes).
 */
export function formatAlertsForDisplay(alerts: AIAlert[]): string[] {
  return alerts.map((a) => a.message)
}
