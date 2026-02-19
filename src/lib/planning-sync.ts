import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateFormationDates } from '@/lib/planning'

/**
 * Fusionne les sessions en doublon (même start_date, end_date) : une seule session conservée, tous les leads regroupés.
 */
export async function deduplicatePlanningSessions(
  adminClient: SupabaseClient
): Promise<{ merged: number }> {
  const { data: allRows } = await adminClient
    .from('planning')
    .select('id, start_date, end_date')
    .order('id', { ascending: true })
  if (!allRows?.length) return { merged: 0 }

  const byKey = new Map<string, { id: string }[]>()
  for (const row of allRows) {
    const key = `${String(row.start_date || '').slice(0, 10)}|${String(row.end_date || '').slice(0, 10)}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push({ id: row.id })
  }

  let merged = 0
  for (const [, ids] of byKey) {
    if (ids.length <= 1) continue
    // Toujours garder le même id (le plus petit) pour un résultat stable à chaque actualisation
    ids.sort((a, b) => a.id.localeCompare(b.id))
    const keepId = ids[0].id
    const toRemove = ids.slice(1).map((r) => r.id)
    const allLeadIds = new Set<string>()

    try {
      let hasPlanningLead = true
      for (const planningId of toRemove) {
        const plRes = await adminClient.from('planning_lead').select('lead_id').eq('planning_id', planningId)
        if (plRes.error && (plRes.error.code === 'PGRST205' || plRes.error.message?.includes('planning_lead'))) {
          hasPlanningLead = false
          break
        }
        for (const r of plRes.data || []) {
          if (r.lead_id) allLeadIds.add(r.lead_id)
        }
        const { data: pRow } = await adminClient.from('planning').select('lead_id').eq('id', planningId).single()
        if (pRow?.lead_id) allLeadIds.add(pRow.lead_id)
      }
      if (hasPlanningLead) {
        const keepRes = await adminClient.from('planning_lead').select('lead_id').eq('planning_id', keepId)
        if (!keepRes.error) {
          for (const r of keepRes.data || []) {
            if (r.lead_id) allLeadIds.add(r.lead_id)
          }
        }
        const { data: keepRow } = await adminClient.from('planning').select('lead_id').eq('id', keepId).single()
        if (keepRow?.lead_id) allLeadIds.add(keepRow.lead_id)

        for (const leadId of allLeadIds) {
          try {
            await adminClient.from('planning_lead').insert({ planning_id: keepId, lead_id: leadId })
          } catch {
            // table planning_lead may not exist
          }
        }
        await adminClient.from('planning_lead').delete().in('planning_id', toRemove)
      }
      if (hasPlanningLead) {
        await adminClient.from('planning').delete().in('id', toRemove)
        merged += toRemove.length
      }
    } catch (e) {
      console.error('deduplicatePlanningSessions:', e)
    }
  }
  return { merged }
}

/**
 * Synchronise un lead avec le planning : retire des sessions existantes,
 * crée une session si le lead est Clos ou Acompte réglé.
 * Utilisé par l'API sync-lead et par la page Planning (sync systématique des leads closés).
 */
export async function syncLeadToPlanning(
  adminClient: SupabaseClient,
  leadId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select('id, status, formation_format, formation_day, formation_start_date')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return { success: false, error: 'Lead non trouvé' }
    }

    let planningLeadExists = true
    try {
      await adminClient.from('planning_lead').delete().eq('lead_id', leadId)
    } catch {
      planningLeadExists = false
    }

    let keptIds = new Set<string>()
    if (planningLeadExists) {
      const { data: remaining } = await adminClient
        .from('planning_lead')
        .select('planning_id')
      keptIds = new Set((remaining || []).map((r: { planning_id: string }) => r.planning_id))
    }
    let allPlanning: { id: string; lead_id?: string | null }[] = []
    try {
      const res = await adminClient.from('planning').select('id, lead_id')
      allPlanning = res.data || []
    } catch {
      const res = await adminClient.from('planning').select('id')
      allPlanning = res.data || []
    }
    if (!planningLeadExists) {
      keptIds = new Set(allPlanning.map((p) => p.id))
    }
    const toDelete = allPlanning
      .filter((p) => !keptIds.has(p.id) || p.lead_id === leadId)
      .map((p) => p.id)
    if (toDelete.length > 0) {
      await adminClient.from('planning').delete().in('id', toDelete)
    }

    const isClosOrAcompte = lead.status === 'clos' || lead.status === 'acompte_regle'
    let format = lead.formation_format as 'mensuelle' | 'semaine' | 'bpm_fast' | null
    let day = lead.formation_day as string | null
    let startDateStr = lead.formation_start_date

    if ((!format || !day || !startDateStr) && isClosOrAcompte) {
      const now = new Date()
      const nextMonday = new Date(now)
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay()
      const daysUntilMonday = dayOfWeek === 1 ? 7 : 8 - dayOfWeek
      nextMonday.setDate(now.getDate() + daysUntilMonday)
      startDateStr = nextMonday.toISOString().split('T')[0]
      format = 'semaine'
      day = 'lundi'
      await adminClient
        .from('leads')
        .update({ formation_format: format, formation_day: day, formation_start_date: startDateStr })
        .eq('id', leadId)
    }

    if (!format || !day || !startDateStr) {
      return { success: true, message: 'Planning supprimé (infos formation incomplètes)' }
    }

    const startDate = new Date(startDateStr)
    const dates = calculateFormationDates(format, day as 'lundi' | 'samedi' | 'dimanche', startDate)

    let specificDates: string[] | null = null
    if (format === 'bpm_fast') {
      specificDates = [
        dates.startDate.toISOString().split('T')[0],
        dates.endDate.toISOString().split('T')[0],
      ]
    } else if (format === 'mensuelle' && (day === 'samedi' || day === 'dimanche')) {
      // 4 samedis/dimanches à partir de la date (peuvent chevaucher le mois suivant) — même logique que planning.ts
      specificDates = [
        dates.startDate.toISOString().split('T')[0],
        new Date(dates.startDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date(dates.startDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date(dates.startDate.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ]
    }

    const startIso = dates.startDate.toISOString()
    const endIso = dates.endDate.toISOString()
    const startDateOnly = startIso.slice(0, 10)
    const endDateOnly = endIso.slice(0, 10)

    const { data: allPlanningForMatch } = await adminClient.from('planning').select('id, start_date, end_date')
    const existing = (allPlanningForMatch || []).find(
      (p: { start_date?: string; end_date?: string }) =>
        String(p.start_date || '').slice(0, 10) === startDateOnly &&
        String(p.end_date || '').slice(0, 10) === endDateOnly
    )
    if (existing) {
      const linkRes = await adminClient.from('planning_lead').insert({ planning_id: existing.id, lead_id: leadId })
      if (!linkRes.error) {
        return { success: true, message: 'Ajouté à la session existante' }
      }
      if (linkRes.error.code === '23505') {
        return { success: true, message: 'Déjà dans la session' }
      }
      if (linkRes.error.code === 'PGRST205' || linkRes.error.message?.includes('planning_lead')) {
        // Table planning_lead absente : créer une session dédiée pour que le lead apparaisse au planning
      } else {
        console.error('planning_lead insert:', linkRes.error)
      }
    }

    const planningRow: Record<string, unknown> = {
      start_date: startIso,
      end_date: endIso,
      lead_id: leadId,
    }
    if (specificDates) planningRow.specific_dates = specificDates

    let planning: { id: string } | null = null
    let insertError: { message?: string; code?: string } | null = null
    let inserted = await adminClient.from('planning').insert(planningRow).select().single()
    insertError = inserted.error
    planning = inserted.data as { id: string } | null

    if (insertError && (insertError.message?.includes('lead_id') || insertError.code === '42703')) {
      delete planningRow.lead_id
      const retry = await adminClient.from('planning').insert(planningRow).select().single()
      insertError = retry.error
      planning = retry.data as { id: string } | null
    }

    if (insertError || !planning) {
      console.error('Erreur création planning sync:', insertError)
      return { success: false, error: insertError?.message || 'Erreur création' }
    }

    try {
      await adminClient.from('planning_lead').insert({ planning_id: planning.id, lead_id: leadId })
    } catch (e) {
      console.error('planning_lead insert:', e)
    }

    return { success: true, message: 'Planning synchronisé' }
  } catch (err: any) {
    console.error('syncLeadToPlanning:', err)
    return { success: false, error: err?.message || 'Erreur' }
  }
}
