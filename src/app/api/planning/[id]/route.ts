import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const DASHBOARD_PATHS = ['/dashboard', '/dashboard/crm', '/dashboard/comptabilite', '/dashboard/planning', '/dashboard/gestion', '/dashboard/mon-espace']

/**
 * PATCH /api/planning/[id] - Modifier une session (dates et/ou liste des leads)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    const body = await request.json()
    const { lead_ids, start_date, end_date, specific_dates } = body

    const adminClient = createAdminClient()

    const updates: { start_date?: string; end_date?: string; specific_dates?: string[] | null } = {}
    if (start_date) updates.start_date = new Date(start_date).toISOString()
    if (end_date) updates.end_date = new Date(end_date).toISOString()
    if (specific_dates !== undefined) {
      updates.specific_dates = Array.isArray(specific_dates)
        ? specific_dates.map((d: string) => (d.includes('T') ? d.split('T')[0] : d))
        : null
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await adminClient
        .from('planning')
        .update(updates)
        .eq('id', id)
      if (updateError) {
        console.error('Erreur mise à jour planning:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    if (lead_ids !== undefined && Array.isArray(lead_ids)) {
      const cleanLeadIds = lead_ids.filter((lid: string) => lid)
      const toInsert = cleanLeadIds.map((lead_id: string) => ({ planning_id: id, lead_id }))
      let planningLeadOk = false
      const delRes = await adminClient.from('planning_lead').delete().eq('planning_id', id)
      const tableMissing = delRes.error && (delRes.error.code === 'PGRST205' || delRes.error.code === '42P01' || (delRes.error.message && /planning_lead|relation|does not exist/i.test(delRes.error.message)))
      if (!tableMissing && toInsert.length > 0) {
        const insRes = await adminClient.from('planning_lead').insert(toInsert)
        if (!insRes.error) planningLeadOk = true
        else if (insRes.error.code !== 'PGRST205' && insRes.error.code !== '42P01' && !insRes.error.message?.includes('planning_lead')) {
          console.error('Erreur mise à jour planning_lead:', insRes.error)
          return NextResponse.json({ error: insRes.error.message }, { status: 500 })
        }
      }
      // Si planning_lead indisponible et plusieurs participants : créer une ligne planning par participant (mêmes dates) pour que la fusion par date les affiche tous
      if (cleanLeadIds.length > 1 && (!planningLeadOk || tableMissing)) {
        const { data: currentRow } = await adminClient.from('planning').select('start_date, end_date, specific_dates').eq('id', id).single()
        if (currentRow) {
          const base: Record<string, unknown> = {
            start_date: currentRow.start_date,
            end_date: currentRow.end_date,
          }
          if (currentRow.specific_dates && Array.isArray(currentRow.specific_dates)) base.specific_dates = currentRow.specific_dates
          for (let i = 1; i < cleanLeadIds.length; i++) {
            const row = { ...base, lead_id: cleanLeadIds[i] }
            const ins = await adminClient.from('planning').insert(row).select().single()
            if (ins.error && (ins.error.message?.includes('lead_id') || ins.error.code === '42703')) {
              const { lead_id: _l, ...rowWithoutLeadId } = row as Record<string, unknown>
              await adminClient.from('planning').insert(rowWithoutLeadId).select().single()
            }
          }
          await adminClient.from('planning').update({ lead_id: cleanLeadIds[0] }).eq('id', id)
        }
      } else if (cleanLeadIds.length > 0 && !planningLeadOk && cleanLeadIds.length === 1) {
        const { error: leadIdErr } = await adminClient.from('planning').update({ lead_id: cleanLeadIds[0] }).eq('id', id)
        if (leadIdErr && leadIdErr.code !== '42703' && !leadIdErr.message?.includes('lead_id')) {
          console.error('Erreur mise à jour planning.lead_id:', leadIdErr)
        }
      }
    }

    for (const p of DASHBOARD_PATHS) revalidatePath(p)
    const { data } = await adminClient.from('planning').select('*').eq('id', id).single()
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('PATCH /api/planning/[id]:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/planning/[id] - Supprimer une session (CASCADE supprime planning_lead)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    const adminClient = createAdminClient()
    const { error } = await adminClient.from('planning').delete().eq('id', id)

    if (error) {
      console.error('Erreur suppression planning:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    for (const p of DASHBOARD_PATHS) revalidatePath(p)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/planning/[id]:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
