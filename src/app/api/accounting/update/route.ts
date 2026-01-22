import { NextRequest, NextResponse } from 'next/server'
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
    const allowedFields = ['amount', 'commission_closer', 'commission_formateur', 'remaining_amount']
    if (!allowedFields.includes(field)) {
      return NextResponse.json({ error: 'Champ non modifiable' }, { status: 400 })
    }

    // Mettre à jour l'entrée comptable
    const { error: updateError } = await adminClient
      .from('accounting_entries')
      .update({ [field]: value })
      .eq('id', entryId)

    if (updateError) {
      console.error('Erreur mise à jour comptabilité:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur API comptabilité:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
