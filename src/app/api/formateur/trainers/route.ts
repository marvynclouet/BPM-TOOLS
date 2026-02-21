import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/formateur/trainers
 * Liste des utilisateurs avec rôle formateur (admin uniquement, pour assignation).
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (user.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

    const adminClient = createAdminClient()
    const { data: trainers, error } = await adminClient
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'formateur')
      .order('full_name', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('formateur/trainers:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(trainers || [])
  } catch (e: any) {
    console.error('GET /api/formateur/trainers:', e)
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}
