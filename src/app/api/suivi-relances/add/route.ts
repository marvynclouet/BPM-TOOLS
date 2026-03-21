import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET: rechercher des leads à ajouter au suivi relances
 * POST: ajouter un lead au suivi (met relance_status = 'en_attente')
 */

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || ''
    if (q.length < 2) {
      return NextResponse.json({ leads: [] })
    }

    const admin = createAdminClient()

    // Chercher les leads qui ne sont PAS encore dans le suivi relances
    const { data: leads, error } = await admin
      .from('leads')
      .select('id, first_name, last_name, phone, formation, formation_format, formation_start_date, price_fixed, price_deposit, relance_status')
      .is('relance_status', null)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ leads: leads || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { leadId } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId requis' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from('leads')
      .update({ relance_status: 'en_attente' })
      .eq('id', leadId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
