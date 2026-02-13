import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncLeadToPlanning } from '@/lib/planning-sync'

const DASHBOARD_PATHS = ['/dashboard', '/dashboard/crm', '/dashboard/comptabilite', '/dashboard/planning', '/dashboard/gestion', '/dashboard/mon-espace']

/**
 * POST /api/planning/sync-lead - Synchronise le planning d'un lead.
 * Body: { leadId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const leadId = body.leadId || body.lead_id

    if (!leadId) {
      return NextResponse.json({ error: 'leadId requis' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const result = await syncLeadToPlanning(adminClient, leadId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erreur' },
        { status: result.error === 'Lead non trouvé' ? 404 : 500 }
      )
    }

    for (const p of DASHBOARD_PATHS) revalidatePath(p)
    return NextResponse.json({ success: true, message: result.message })
  } catch (err: any) {
    console.error('POST /api/planning/sync-lead:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
