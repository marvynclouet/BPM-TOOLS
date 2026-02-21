import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/formateur/sessions
 * Liste des sessions : formateur = ses sessions (trainer_id = moi), admin = toutes.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (user.role !== 'formateur' && user.role !== 'admin') return NextResponse.json({ error: 'Accès réservé formateur ou admin' }, { status: 403 })

    const adminClient = createAdminClient()
    let query = adminClient
      .from('planning')
      .select('id, start_date, end_date, specific_dates, trainer_id, payment_status, payment_amount')
      .order('start_date', { ascending: true })

    if (user.role === 'formateur') {
      query = query.eq('trainer_id', user.id)
    }

    const { data: planningRows, error } = await query
    if (error) {
      console.error('formateur/sessions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = planningRows || []
    const planningIds = rows.map((p: { id: string }) => p.id)
    if (planningIds.length === 0) {
      return NextResponse.json(rows)
    }

    const { data: links } = await adminClient.from('planning_lead').select('planning_id, lead_id').in('planning_id', planningIds)
    const leadIds = [...new Set((links || []).map((l: { lead_id: string }) => l.lead_id))]
    let leadsById: Record<string, { id: string; first_name: string; last_name: string }> = {}
    if (leadIds.length > 0) {
      const { data: leadsData } = await adminClient.from('leads').select('id, first_name, last_name').in('id', leadIds)
      leadsData?.forEach((l: { id: string; first_name: string; last_name: string }) => { leadsById[l.id] = l })
    }

    const byPlanning = (links || []).reduce((acc: Record<string, string[]>, l: { planning_id: string; lead_id: string }) => {
      if (!acc[l.planning_id]) acc[l.planning_id] = []
      acc[l.planning_id].push(l.lead_id)
      return acc
    }, {})

    const sessions = rows.map((p: any) => ({
      id: p.id,
      start_date: p.start_date,
      end_date: p.end_date,
      specific_dates: p.specific_dates,
      trainer_id: p.trainer_id,
      payment_status: p.payment_status || 'UNPAID',
      payment_amount: p.payment_amount ?? 350,
      participants: (byPlanning[p.id] || []).map((lid: string) => leadsById[lid]).filter(Boolean),
    }))

    return NextResponse.json(sessions)
  } catch (e: any) {
    console.error('GET /api/formateur/sessions:', e)
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}
