import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateFormationDates } from '@/lib/planning'

const DASHBOARD_PATHS = ['/dashboard', '/dashboard/crm', '/dashboard/comptabilite', '/dashboard/planning', '/dashboard/gestion', '/dashboard/mon-espace']

/**
 * POST /api/planning/sync-lead - Synchronise le planning d'un lead avec ses champs formation.
 * Retire le lead de toutes les sessions, supprime les sessions vides, crée une nouvelle session si infos complètes.
 * Body: { leadId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const leadId = body.leadId || body.lead_id

    if (!leadId) {
      return NextResponse.json({ error: 'leadId requis' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select('id, status, formation_format, formation_day, formation_start_date')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 })
    }

    // Retirer ce lead de toutes les sessions
    await adminClient.from('planning_lead').delete().eq('lead_id', leadId)

    // Supprimer les sessions qui n'ont plus aucun lead
    const { data: remaining } = await adminClient
      .from('planning_lead')
      .select('planning_id')
    const keptIds = new Set((remaining || []).map((r: { planning_id: string }) => r.planning_id))
    const { data: allPlanning } = await adminClient.from('planning').select('id')
    const toDelete = (allPlanning || []).filter((p: { id: string }) => !keptIds.has(p.id)).map((p: { id: string }) => p.id)
    if (toDelete.length > 0) {
      await adminClient.from('planning').delete().in('id', toDelete)
    }

    const isClosOrAcompte = lead.status === 'clos' || lead.status === 'acompte_regle'
    let format = lead.formation_format as 'mensuelle' | 'semaine' | 'bpm_fast' | null
    let day = lead.formation_day as string | null
    let startDateStr = lead.formation_start_date

    // Si lead Clos/Acompte mais infos formation manquantes → créer session par défaut (semaine, lundi prochain)
    if ((!format || !day || !startDateStr) && isClosOrAcompte) {
      const now = new Date()
      const nextMonday = new Date(now)
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay() // 1=lundi, 7=dimanche
      const daysUntilMonday = dayOfWeek === 1 ? 7 : 8 - dayOfWeek // si déjà lundi, prendre le suivant (semaine prochaine)
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
      for (const p of DASHBOARD_PATHS) revalidatePath(p)
      return NextResponse.json({ success: true, message: 'Planning supprimé (infos formation incomplètes)' })
    }

    const startDate = new Date(startDateStr)
    const dates = calculateFormationDates(format, day as any, startDate)

    let specificDates: string[] | null = null
    if (format === 'bpm_fast') {
      specificDates = [
        dates.startDate.toISOString().split('T')[0],
        dates.endDate.toISOString().split('T')[0],
      ]
    } else if (format === 'mensuelle' && (day === 'samedi' || day === 'dimanche')) {
      const year = startDate.getFullYear()
      const month = startDate.getMonth()
      const targetDay = day === 'samedi' ? 6 : 0
      const datesArray: Date[] = []
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const date = new Date(year, month, dayNum)
        if (date.getDay() === targetDay) datesArray.push(date)
      }
      if (datesArray.length >= 4) {
        specificDates = datesArray.slice(0, 4).map(d => {
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const dayNum = String(d.getDate()).padStart(2, '0')
          return `${y}-${m}-${dayNum}`
        })
      }
    }

    const planningRow: Record<string, unknown> = {
      start_date: dates.startDate.toISOString(),
      end_date: dates.endDate.toISOString(),
      lead_id: leadId,
    }
    if (specificDates) planningRow.specific_dates = specificDates

    let planning: { id: string } | null = null
    let insertError: { message?: string; code?: string } | null = null
    let inserted = await adminClient.from('planning').insert(planningRow).select().single()
    insertError = inserted.error
    planning = inserted.data

    if (insertError && (insertError.message?.includes('lead_id') || insertError.code === '42703')) {
      delete planningRow.lead_id
      const retry = await adminClient.from('planning').insert(planningRow).select().single()
      insertError = retry.error
      planning = retry.data
    }

    if (insertError || !planning) {
      console.error('Erreur création planning sync:', insertError)
      return NextResponse.json({ error: insertError?.message || 'Erreur création' }, { status: 500 })
    }

    await adminClient.from('planning_lead').insert({ planning_id: planning.id, lead_id: leadId })

    for (const p of DASHBOARD_PATHS) revalidatePath(p)

    return NextResponse.json({ success: true, message: 'Planning synchronisé' })
  } catch (err: any) {
    console.error('POST /api/planning/sync-lead:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
