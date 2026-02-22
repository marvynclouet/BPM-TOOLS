import { createAdminClient } from '@/lib/supabase/admin'
import { getAIAlerts } from '@/lib/ai-alerts'

/**
 * Récupère un contexte large pour que l'IA détecte anomalies et incohérences.
 */
export async function getAnomalyContextForAI(): Promise<string> {
  const admin = createAdminClient()
  const now = new Date()

  const sections: string[] = []

  try {
    // 1. État du schéma planning
    let planningRows: any[] = []
    let planningHasLeadId = false
    const planRes = await admin.from('planning').select('id, start_date, end_date, lead_id').limit(100)
    if (planRes.error && (planRes.error.message?.includes('lead_id') || (planRes.error as any)?.code === '42703')) {
      const res2 = await admin.from('planning').select('id, start_date, end_date').limit(100)
      planningRows = res2.data || []
    } else {
      planningRows = planRes.data || []
      planningHasLeadId = planningRows.length > 0 && planningRows[0] && 'lead_id' in planningRows[0]
    }

    let planningLeadCount = 0
    let planningLeadExists = true
    let planningLeadRows: { planning_id: string; lead_id: string }[] = []
    const plRes = await admin.from('planning_lead').select('planning_id, lead_id')
    if (plRes.error) {
      planningLeadExists = false
    } else {
      planningLeadRows = plRes.data || []
      planningLeadCount = planningLeadRows.length
    }

    const planningCount = planningRows?.length ?? 0
    const planningWithLeadId = planningRows?.filter((p: any) => p.lead_id != null).length ?? 0
    const planningWithoutLead = planningCount - planningWithLeadId

    sections.push(`## SCHÉMA PLANNING
- Nombre de sessions planning : ${planningCount}
- Table planning_lead existe : ${planningLeadExists}
- Lignes dans planning_lead : ${planningLeadCount}
- Colonne planning.lead_id existe : ${planningHasLeadId}
- Sessions avec lead_id (ou lien planning_lead) : ${planningWithLeadId}
- Sessions SANS participant : ${planningWithoutLead}
${planningWithoutLead > 0 && planningCount > 0 ? '⚠️ ANOMALIE : Des sessions n\'ont aucun participant.' : ''}`)

    // 2. Alertes IA existantes
    const aiAlerts = await getAIAlerts()
    if (aiAlerts.length > 0) {
      sections.push(`## ALERTES DÉTECTÉES
${aiAlerts.map((a) => `- ${a.message}${a.details?.length ? '\n  Détails: ' + a.details.slice(0, 3).join(', ') : ''}`).join('\n')}`)
    }

    // 3. Leads : incohérences statut / données
    const { data: leads } = await admin
      .from('leads')
      .select('id, first_name, last_name, status, formation, formation_format, price_fixed, price_deposit, closer_id, phone, email')
      .limit(200)

    const closSansPrix = (leads || []).filter((l: any) => l.status === 'clos' && (l.price_fixed == null || l.price_fixed === 0))
    const acompteSansPrix = (leads || []).filter((l: any) => l.status === 'acompte_regle' && (l.price_deposit == null || l.price_fixed == null))
    const sansCloser = (leads || []).filter((l: any) => !l.closer_id && l.status !== 'nouveau' && l.status !== 'ko')
    const sansEmail = (leads || []).filter((l: any) => !l.email?.trim() && (l.status === 'clos' || l.status === 'acompte_regle'))

    sections.push(`## LEADS – INCOHÉRENCES POSSIBLES
- Leads clos sans prix fixé : ${closSansPrix.length} ${closSansPrix.length > 0 ? `(ex: ${closSansPrix.slice(0, 2).map((l: any) => l.first_name + ' ' + l.last_name).join(', ')})` : ''}
- Acompte réglé sans prix/dépôt : ${acompteSansPrix.length}
- Leads actifs sans closer assigné : ${sansCloser.length}
- Leads clos/acompte sans email : ${sansEmail.length}`)

    // 4. Doublons potentiels (même téléphone normalisé)
    const phoneMap: Record<string, string[]> = {}
    ;(leads || []).forEach((l: any) => {
      const p = (l.phone || '').replace(/\D/g, '').slice(-9)
      if (!p) return
      if (!phoneMap[p]) phoneMap[p] = []
      phoneMap[p].push(`${l.first_name} ${l.last_name} (${l.status})`)
    })
    const doublons = Object.entries(phoneMap).filter(([, names]) => names.length >= 2)
    if (doublons.length > 0) {
      sections.push(`## DOUBLONS POTENTIELS (même téléphone)
${doublons.slice(0, 5).map(([phone, names]) => `- Tél. ...${phone} : ${names.join(' | ')}`).join('\n')}`)
    }

    // 5. Planning vs leads clos
    const { data: closLeads } = await admin.from('leads').select('id, first_name, last_name').eq('status', 'clos')
    const closIds = new Set((closLeads || []).map((l: any) => l.id))
    let closInPlanning = 0
    if (planningLeadExists && planningLeadRows.length > 0) {
      closInPlanning = planningLeadRows.filter((r: any) => closIds.has(r.lead_id)).length
    } else if (planningRows) {
      closInPlanning = (planningRows || []).filter((p: any) => p.lead_id && closIds.has(p.lead_id)).length
    }
    const closSansPlanningCount = (closLeads?.length ?? 0) - closInPlanning
    sections.push(`## PLANNING vs LEADS CLOS
- Leads clos : ${closLeads?.length ?? 0}
- Leads clos dans le planning : ${closInPlanning}
- Leads clos SANS planning : ${closSansPlanningCount} ${closSansPlanningCount > 0 ? '⚠️' : ''}`)

    // 6. Comptabilité
    const { data: accEntries } = await admin
      .from('accounting_entries')
      .select('id, amount, entry_type, lead_id')
      .limit(50)
    const { count: accCount } = await admin.from('accounting_entries').select('id', { count: 'exact', head: true })
    const { count: leadPaymentsCount } = await admin.from('lead_payments').select('id', { count: 'exact', head: true })
    sections.push(`## COMPTABILITÉ
- Entrées comptables : ${accCount ?? 0}
- Paiements leads : ${leadPaymentsCount ?? 0}`)

    return sections.join('\n\n')
  } catch (err: any) {
    return `Erreur lors de la collecte : ${err.message}\n\n${sections.join('\n\n')}`
  }
}
