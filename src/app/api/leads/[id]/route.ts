import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DASHBOARD_PATHS = ['/dashboard', '/dashboard/crm', '/dashboard/comptabilite', '/dashboard/planning', '/dashboard/gestion', '/dashboard/mon-espace']

const formationFormats = ['mensuelle', 'semaine', 'bpm_fast'] as const
const formationDays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const
const formations = ['inge_son', 'beatmaking', 'autre'] as const

/**
 * PATCH /api/leads/[id] - Mise à jour partielle (formation, format, jour, date début)
 * Body: { formation?, formation_format?, formation_day?, formation_start_date? }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params)
    const leadId = params.id
    if (!leadId) {
      return NextResponse.json({ error: 'ID lead manquant' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const updates: {
      formation?: string
      formation_format?: string | null
      formation_day?: string | null
      formation_start_date?: string | null
    } = {}

    if (body.formation !== undefined) {
      if (!formations.includes(body.formation)) {
        return NextResponse.json({ error: 'formation invalide' }, { status: 400 })
      }
      updates.formation = body.formation
    }
    if (body.formation_format !== undefined) {
      updates.formation_format = body.formation_format === null || body.formation_format === ''
        ? null
        : formationFormats.includes(body.formation_format) ? body.formation_format : null
    }
    if (body.formation_day !== undefined) {
      updates.formation_day = body.formation_day === null || body.formation_day === ''
        ? null
        : formationDays.includes(body.formation_day) ? body.formation_day : null
    }
    if (body.formation_start_date !== undefined) {
      updates.formation_start_date = body.formation_start_date == null || body.formation_start_date === ''
        ? null
        : new Date(body.formation_start_date).toISOString().split('T')[0]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('leads')
      .update(updates)
      .eq('id', leadId)

    if (error) {
      console.error('PATCH /api/leads/[id]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    for (const p of DASHBOARD_PATHS) revalidatePath(p)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('PATCH /api/leads/[id]:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/leads/[id]
 * Supprime le lead et toute trace associée (ventes, commentaires, documents, planning, etc.).
 * Réservé aux admins.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params)
    const leadId = params.id
    if (!leadId) {
      return NextResponse.json({ error: 'ID lead manquant' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: userRow } = await adminClient
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (userRow?.role !== 'admin') {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
    }

    const { data: lead } = await adminClient
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 })
    }

    // Ordre de suppression (contraintes FK)
    await adminClient.from('accounting_entries').delete().eq('lead_id', leadId)
    await adminClient.from('lead_payments').delete().eq('lead_id', leadId)
    await adminClient.from('lead_comments').delete().eq('lead_id', leadId)
    await adminClient.from('documents').delete().eq('lead_id', leadId)
    await adminClient.from('planning_lead').delete().eq('lead_id', leadId)
    // Supprimer les sessions qui n'ont plus aucun lead
    const { data: remainingLeads } = await adminClient.from('planning_lead').select('planning_id')
    const keptIds = new Set((remainingLeads || []).map((r: { planning_id: string }) => r.planning_id))
    const { data: allPlanning } = await adminClient.from('planning').select('id')
    const toDelete = (allPlanning || []).filter((p: { id: string }) => !keptIds.has(p.id)).map((p: { id: string }) => p.id)
    if (toDelete.length > 0) {
      await adminClient.from('planning').delete().in('id', toDelete)
    }

    try {
      const { data: deals } = await adminClient
        .from('deals')
        .select('id')
        .eq('lead_id', leadId)
      const dealIds = (deals || []).map((d) => d.id)
      if (dealIds.length > 0) {
        const { data: payRows } = await adminClient
          .from('payments')
          .select('id')
          .in('deal_id', dealIds)
        const paymentIds = (payRows || []).map((p) => p.id)
        if (paymentIds.length > 0) {
          await adminClient.from('sales_ledger').delete().in('payment_id', paymentIds)
        }
        await adminClient.from('payments').delete().in('deal_id', dealIds)
      }
      await adminClient.from('deals').delete().eq('lead_id', leadId)
    } catch {
      // Tables deals/payments/sales_ledger optionnelles (ancien schéma)
    }

    await adminClient.from('leads').delete().eq('id', leadId)

    for (const p of DASHBOARD_PATHS) revalidatePath(p)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Erreur suppression lead:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
