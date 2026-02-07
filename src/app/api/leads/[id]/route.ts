import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    await adminClient.from('planning').delete().eq('lead_id', leadId)

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

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Erreur suppression lead:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
