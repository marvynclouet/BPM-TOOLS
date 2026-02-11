import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const DASHBOARD_PATHS = [
  '/dashboard',
  '/dashboard/crm',
  '/dashboard/comptabilite',
  '/dashboard/planning',
  '/dashboard/gestion',
  '/dashboard/mon-espace',
]

/**
 * Invalide le cache des vues dashboard pour que toutes les pages affichent les données à jour
 * après une modification (lead, planning, etc.).
 */
export async function GET() {
  try {
    for (const path of DASHBOARD_PATHS) {
      revalidatePath(path)
    }
    return NextResponse.json({ revalidated: true, paths: DASHBOARD_PATHS })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}
