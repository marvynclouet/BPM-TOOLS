import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logLeadActivity } from '@/lib/lead-activity-log'

/**
 * GET /api/leads/[id]/activity-log - Récupérer l'historique des actions
 */
export async function GET(
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
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('lead_activity_log')
      .select('id, action_type, field_name, old_value, new_value, created_at, user_id')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ activities: data || [] })
  } catch (err: unknown) {
    console.error('GET /api/leads/[id]/activity-log:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/leads/[id]/activity-log - Enregistrer une action sur le lead
 * Body: { actionType, fieldName?, oldValue?, newValue?, details? }
 */
export async function POST(
  request: NextRequest,
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
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { actionType, fieldName, oldValue, newValue, details } = body

    if (!actionType || typeof actionType !== 'string') {
      return NextResponse.json({ error: 'actionType requis' }, { status: 400 })
    }

    await logLeadActivity({
      leadId,
      userId: user.id,
      actionType: actionType as any,
      fieldName,
      oldValue,
      newValue,
      details,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('POST /api/leads/[id]/activity-log:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur' },
      { status: 500 }
    )
  }
}
