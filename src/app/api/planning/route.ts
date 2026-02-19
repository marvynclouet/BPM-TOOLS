import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const DASHBOARD_PATHS = ['/dashboard', '/dashboard/crm', '/dashboard/comptabilite', '/dashboard/planning', '/dashboard/gestion', '/dashboard/mon-espace']

/**
 * POST /api/planning - Créer une session (plusieurs leads possibles)
 * Body: { lead_id?, lead_ids?, start_date, end_date, specific_dates? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lead_id, lead_ids, start_date, end_date, specific_dates } = body

    const ids: string[] = lead_ids && Array.isArray(lead_ids)
      ? lead_ids.filter(Boolean)
      : lead_id ? [lead_id] : []

    if (ids.length === 0 || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Au moins un lead (lead_id ou lead_ids), start_date et end_date sont requis' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    for (const lid of ids) {
      const { data: lead } = await adminClient.from('leads').select('id').eq('id', lid).single()
      if (!lead) {
        return NextResponse.json({ error: `Lead non trouvé: ${lid}` }, { status: 404 })
      }
    }

    const planningRow: Record<string, unknown> = {
      start_date: new Date(start_date).toISOString(),
      end_date: new Date(end_date).toISOString(),
      lead_id: ids[0], // pour les BDD où la colonne existe encore (NOT NULL)
    }
    if (specific_dates && Array.isArray(specific_dates) && specific_dates.length > 0) {
      planningRow.specific_dates = specific_dates.map((d: string) =>
        d.includes('T') ? d.split('T')[0] : d
      )
    }

    let planning: { id: string } | null = null
    let planError: { message?: string; code?: string } | null = null
    let inserted = await adminClient.from('planning').insert(planningRow).select().single()
    planError = inserted.error
    planning = inserted.data ?? null

    if (planError && (planError.message?.includes('lead_id') || planError.code === '42703')) {
      delete planningRow.lead_id
      const retry = await adminClient.from('planning').insert(planningRow).select().single()
      planError = retry.error
      planning = retry.data ?? null
    }

    if (planError || !planning) {
      console.error('Erreur création planning:', planError)
      return NextResponse.json({ error: planError?.message || 'Erreur création' }, { status: 500 })
    }

    const linkInsert = await adminClient
      .from('planning_lead')
      .insert(ids.map((lead_id: string) => ({ planning_id: planning.id, lead_id })))

    if (linkInsert.error) {
      const tableMissing =
        linkInsert.error.code === '42P01' ||
        linkInsert.error.code === 'PGRST204' ||
        linkInsert.error.code === 'PGRST205' ||
        (linkInsert.error.message && /planning_lead|relation.*exist|does not exist/i.test(linkInsert.error.message))

      if (tableMissing && ids.length > 1) {
        // Fallback : table planning_lead absente ou indisponible → une ligne planning par participant (mêmes dates)
        // La page planning fusionne par dates, donc une seule carte avec tous les élèves s'affichera
        await adminClient.from('planning').delete().eq('id', planning.id)
        const baseRow: Record<string, unknown> = {
          start_date: planningRow.start_date,
          end_date: planningRow.end_date,
        }
        if (Array.isArray(planningRow.specific_dates) && planningRow.specific_dates.length > 0) {
          baseRow.specific_dates = planningRow.specific_dates
        }
        for (let i = 0; i < ids.length; i++) {
          const row = { ...baseRow, lead_id: ids[i] }
          const ins = await adminClient.from('planning').insert(row).select().single()
          if (ins.error && (ins.error.message?.includes('lead_id') || ins.error.code === '42703')) {
            const { lead_id: _lid, ...rowWithoutLeadId } = row as Record<string, unknown>
            await adminClient.from('planning').insert(rowWithoutLeadId).select().single()
          }
        }
        for (const p of DASHBOARD_PATHS) revalidatePath(p)
        return NextResponse.json({ success: true, data: { id: 'multi', lead_ids: ids } }, { status: 201 })
      }
      if (tableMissing && ids.length === 1) {
        for (const p of DASHBOARD_PATHS) revalidatePath(p)
        return NextResponse.json({ success: true, data: planning }, { status: 201 })
      }
      console.error('Erreur liaison planning_lead:', linkInsert.error)
      await adminClient.from('planning').delete().eq('id', planning.id)
      return NextResponse.json({ error: linkInsert.error.message }, { status: 500 })
    }

    for (const p of DASHBOARD_PATHS) revalidatePath(p)
    return NextResponse.json({ success: true, data: planning }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/planning:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
