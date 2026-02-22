import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

/**
 * Liste des closers pour le sélecteur du rapport (admins uniquement).
 * GET - retourne { closers: [{ id, full_name, email }] }
 */
export async function GET() {
  try {
    const user = await requireAuth()
    if (user.role !== 'admin') {
      return NextResponse.json({ closers: [] })
    }

    const admin = createAdminClient()
    const { data } = await admin
      .from('users')
      .select('id, full_name, email')
      .in('role', ['closer', 'admin'])
      .order('full_name', { ascending: true, nullsFirst: false })

    const closers = (data || []).map((u: any) => ({
      id: u.id,
      full_name: u.full_name || u.email || 'Sans nom',
      email: u.email,
    }))

    return NextResponse.json({ closers })
  } catch {
    return NextResponse.json({ closers: [] })
  }
}
