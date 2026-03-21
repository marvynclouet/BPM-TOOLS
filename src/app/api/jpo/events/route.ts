import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('jpo_events')
      .select('*')
      .order('event_date', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ events: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()
    const { title, event_date, max_per_slot, notes } = body

    if (!event_date) {
      return NextResponse.json({ error: 'Date requise' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('jpo_events')
      .insert({
        title: title || 'Journée Portes Ouvertes',
        event_date,
        max_per_slot: max_per_slot || 5,
        notes: notes || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ event: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
