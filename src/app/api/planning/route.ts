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

    const { error: linkError } = await adminClient
      .from('planning_lead')
      .insert(ids.map((lead_id: string) => ({ planning_id: planning.id, lead_id })))

    if (linkError) {
      const tableMissing = linkError.code === '42P01' || linkError.message?.includes('planning_lead')
      if (tableMissing) {
        return NextResponse.json({ success: true, data: planning }, { status: 201 })
      }
      console.error('Erreur liaison planning_lead:', linkError)
      await adminClient.from('planning').delete().eq('id', planning.id)
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }

    for (const p of DASHBOARD_PATHS) revalidatePath(p)
    return NextResponse.json({ success: true, data: planning }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/planning:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
