import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/accounting/leads-options - Liste des leads (clos / acompte réglé) pour le formulaire "Ajouter une entrée"
 */
export async function GET() {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('leads')
      .select('id, first_name, last_name')
      .in('status', ['clos', 'acompte_regle'])
      .order('last_name', { ascending: true })

    if (error) {
      console.error('Erreur leads-options:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ leads: data || [] })
  } catch (err: any) {
    console.error('GET /api/accounting/leads-options:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
