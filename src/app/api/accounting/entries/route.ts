import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const DASHBOARD_PATHS = ['/dashboard', '/dashboard/comptabilite', '/dashboard/mon-espace']

/**
 * POST /api/accounting/entries - Créer une entrée comptable
 * Body: { lead_id, entry_type, amount, remaining_amount? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lead_id, entry_type, amount, remaining_amount } = body

    if (!lead_id || !entry_type || amount == null) {
      return NextResponse.json(
        { error: 'lead_id, entry_type et amount sont requis' },
        { status: 400 }
      )
    }
    if (!['acompte', 'solde', 'complet'].includes(entry_type)) {
      return NextResponse.json({ error: 'entry_type invalide' }, { status: 400 })
    }

    const amt = Number(amount)
    if (isNaN(amt) || amt < 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select('id')
      .eq('id', lead_id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 })
    }

    const remaining = remaining_amount != null ? Number(remaining_amount) : null
    const commissionCloser = amt * 0.1
    const commissionFormateur = amt * 0.05

    const { error: insertError } = await adminClient.from('accounting_entries').insert({
      lead_id,
      payment_id: null,
      entry_type,
      amount: amt,
      commission_closer: commissionCloser,
      commission_formateur: commissionFormateur,
      remaining_amount: remaining ?? null,
      status: 'actif',
    })

    if (insertError) {
      console.error('Erreur création entrée comptable:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    for (const p of DASHBOARD_PATHS) revalidatePath(p)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/accounting/entries:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
