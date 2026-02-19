import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const DASHBOARD_PATHS = ['/dashboard', '/dashboard/comptabilite', '/dashboard/mon-espace']

/**
 * DELETE /api/accounting/entries/[id] - Supprimer une entrée comptable
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    const adminClient = createAdminClient()
    const { error } = await adminClient.from('accounting_entries').delete().eq('id', id)

    if (error) {
      console.error('Erreur suppression entrée comptable:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    for (const p of DASHBOARD_PATHS) revalidatePath(p)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/accounting/entries/[id]:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
