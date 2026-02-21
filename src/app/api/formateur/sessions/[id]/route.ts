import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'

function assertFormateurAccess(session: { trainer_id: string | null }, user: { id: string; role: string }) {
  if (user.role === 'admin') return
  if (session.trainer_id !== user.id) throw new Error('Accès non autorisé à cette session')
}

/**
 * GET /api/formateur/sessions/[id]
 * Détail d'une session : formateur uniquement si trainer_id = moi, admin toujours.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (user.role !== 'formateur' && user.role !== 'admin') return NextResponse.json({ error: 'Accès réservé' }, { status: 403 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    const adminClient = createAdminClient()
    const { data: session, error: sessionError } = await adminClient
      .from('planning')
      .select('id, start_date, end_date, specific_dates, trainer_id, payment_status, payment_amount')
      .eq('id', id)
      .single()

    if (sessionError || !session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    if (user.role === 'formateur' && session.trainer_id !== user.id) return NextResponse.json({ error: 'Accès non autorisé à cette session' }, { status: 403 })

    const { data: links } = await adminClient.from('planning_lead').select('lead_id').eq('planning_id', id)
    const leadIds = (links || []).map((l: { lead_id: string }) => l.lead_id)
    let participants: any[] = []
    if (leadIds.length > 0) {
      const { data: leadsData } = await adminClient.from('leads').select('id, first_name, last_name').in('id', leadIds)
      participants = leadsData || []
    }

    const { data: attendances } = await adminClient.from('trainer_attendances').select('*').eq('planning_id', id)
    const { data: reports } = await adminClient.from('trainer_session_reports').select('*').eq('planning_id', id)
    const { data: evaluations } = await adminClient.from('trainer_evaluations').select('*').eq('planning_id', id)

    return NextResponse.json({
      ...session,
      payment_status: session.payment_status || 'UNPAID',
      payment_amount: session.payment_amount ?? 350,
      participants,
      attendances: attendances || [],
      reports: reports || [],
      evaluations: evaluations || [],
    })
  } catch (e: any) {
    console.error('GET /api/formateur/sessions/[id]:', e)
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PATCH /api/formateur/sessions/[id]
 * Formateur : attendances, reports, evaluations.
 * Admin : en plus payment_status, trainer_id.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (user.role !== 'formateur' && user.role !== 'admin') return NextResponse.json({ error: 'Accès réservé' }, { status: 403 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    const adminClient = createAdminClient()
    const { data: session, error: sessionError } = await adminClient
      .from('planning')
      .select('id, trainer_id')
      .eq('id', id)
      .single()

    if (sessionError || !session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    assertFormateurAccess(session, user)

    const body = await request.json().catch(() => ({}))
    const { attendances, reports, evaluations, payment_status, trainer_id } = body

    if (payment_status !== undefined || trainer_id !== undefined) {
      if (user.role !== 'admin') return NextResponse.json({ error: 'Seul un admin peut modifier le paiement ou le formateur' }, { status: 403 })
      const updates: Record<string, unknown> = {}
      if (payment_status === 'PAID' || payment_status === 'UNPAID') updates.payment_status = payment_status
      if (trainer_id !== undefined) updates.trainer_id = trainer_id || null
      if (Object.keys(updates).length > 0) {
        await adminClient.from('planning').update(updates).eq('id', id)
      }
    }

    if (Array.isArray(attendances)) {
      for (const a of attendances) {
        const { attendance_date, lead_id, status, comment } = a
        if (!attendance_date || !lead_id || !status) continue
        if (!['present', 'absent', 'retard'].includes(status)) continue
        await adminClient.from('trainer_attendances').upsert(
          { planning_id: id, attendance_date, lead_id, status, comment: comment ?? null, updated_at: new Date().toISOString() },
          { onConflict: 'planning_id,attendance_date,lead_id' }
        )
      }
    }

    if (Array.isArray(reports)) {
      for (const r of reports) {
        const { report_date, content } = r
        if (!report_date) continue
        await adminClient.from('trainer_session_reports').upsert(
          { planning_id: id, report_date, content: content ?? '', updated_at: new Date().toISOString() },
          { onConflict: 'planning_id,report_date' }
        )
      }
    }

    if (Array.isArray(evaluations)) {
      for (const e of evaluations) {
        const { lead_id, evaluation_number, score, comment } = e
        if (!lead_id || !evaluation_number || score == null) continue
        if (evaluation_number !== 1 && evaluation_number !== 2) continue
        if (score < 1 || score > 5) continue
        await adminClient.from('trainer_evaluations').upsert(
          { planning_id: id, lead_id, evaluation_number, score, comment: comment ?? null, updated_at: new Date().toISOString() },
          { onConflict: 'planning_id,lead_id,evaluation_number' }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('PATCH /api/formateur/sessions/[id]:', e)
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}
