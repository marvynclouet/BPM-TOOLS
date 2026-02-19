import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entryId, field, value } = body

    if (!entryId || !field || value === undefined) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Vérifier que le champ est modifiable
    const allowedFields = ['amount', 'commission_closer', 'commission_formateur', 'remaining_amount', 'status']
    if (!allowedFields.includes(field)) {
      return NextResponse.json({ error: 'Champ non modifiable' }, { status: 400 })
    }

    // Mettre à jour l'entrée comptable (status doit être actif ou annulé)
    const updatePayload: Record<string, unknown> = { [field]: value }
    if (field === 'status' && value !== 'actif' && value !== 'annulé') {
      return NextResponse.json({ error: 'Status invalide (actif ou annulé)' }, { status: 400 })
    }

    // Acompte : en modifiant le montant, recalcul automatique du reste à payer et des commissions
    let updatedRemaining: number | null = null
    if (field === 'amount') {
      const numAmount = Number(value)
      if (!isNaN(numAmount) && numAmount >= 0) {
        const { data: entryRow, error: entryError } = await adminClient
          .from('accounting_entries')
          .select('lead_id, entry_type, amount, remaining_amount')
          .eq('id', entryId)
          .single()

        if (!entryError && entryRow?.lead_id) {
          updatePayload.commission_closer = Math.round(numAmount * 0.1 * 100) / 100
          updatePayload.commission_formateur = Math.round(numAmount * 0.05 * 100) / 100

          if (entryRow.entry_type === 'acompte') {
            const { data: lead } = await adminClient
              .from('leads')
              .select('price_fixed')
              .eq('id', entryRow.lead_id)
              .single()
            const totalFromLead = lead?.price_fixed != null && !isNaN(Number(lead.price_fixed)) ? Number(lead.price_fixed) : null
            const total = totalFromLead ?? (entryRow.amount != null && (entryRow.remaining_amount != null || entryRow.remaining_amount === 0)
              ? Number(entryRow.amount) + Number(entryRow.remaining_amount ?? 0)
              : null)
            if (total != null && !isNaN(total)) {
              const remaining = Math.max(0, Math.round((total - numAmount) * 100) / 100)
              updatePayload.remaining_amount = remaining
              updatedRemaining = remaining
            }
          } else {
            updatePayload.remaining_amount = null
          }
        }
      }
    }

    const { error: updateError } = await adminClient
      .from('accounting_entries')
      .update(updatePayload)
      .eq('id', entryId)

    if (updateError) {
      console.error('Erreur mise à jour comptabilité:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    // Invalider le cache de toutes les vues dashboard
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/crm')
    revalidatePath('/dashboard/comptabilite')
    revalidatePath('/dashboard/planning')
    revalidatePath('/dashboard/gestion')
    revalidatePath('/dashboard/mon-espace')

    const payload: { success: boolean; updated?: { remaining_amount?: number | null; commission_closer?: number; commission_formateur?: number } } = { success: true }
    if (field === 'amount' && (updatePayload.remaining_amount !== undefined || updatePayload.commission_closer !== undefined)) {
      payload.updated = {
        remaining_amount: updatedRemaining ?? (updatePayload.remaining_amount as number | null),
        commission_closer: updatePayload.commission_closer as number,
        commission_formateur: updatePayload.commission_formateur as number,
      }
    }
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('Erreur API comptabilité:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
