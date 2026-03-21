import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET – Liste tous les prospects réseaux avec leur dernier message
 * POST – Créer un nouveau prospect
 */
export async function GET() {
  try {
    const admin = createAdminClient()

    const { data: prospects, error } = await admin
      .from('social_prospects')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Récupérer le dernier message de chaque prospect
    const prospectIds = (prospects || []).map((p: any) => p.id)
    let lastMessages: Record<string, { message: string; sent_at: string; direction: string }> = {}

    if (prospectIds.length > 0) {
      const { data: exchanges } = await admin
        .from('social_prospect_exchanges')
        .select('prospect_id, message, sent_at, direction')
        .in('prospect_id', prospectIds)
        .order('sent_at', { ascending: false })

      if (exchanges) {
        for (const ex of exchanges) {
          if (!lastMessages[ex.prospect_id]) {
            lastMessages[ex.prospect_id] = {
              message: ex.message,
              sent_at: ex.sent_at,
              direction: ex.direction,
            }
          }
        }
      }
    }

    const result = (prospects || []).map((p: any) => ({
      ...p,
      last_message: lastMessages[p.id]?.message || null,
      last_message_at: lastMessages[p.id]?.sent_at || null,
      last_message_direction: lastMessages[p.id]?.direction || null,
    }))

    return NextResponse.json({ prospects: result })
  } catch (err: any) {
    console.error('prospects-reseaux GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()

    const { username, platform, formation, profile_url, notes } = body
    if (!username?.trim() || !platform) {
      return NextResponse.json({ error: 'username et platform requis' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('social_prospects')
      .insert({
        username: username.trim(),
        platform,
        formation: formation || null,
        profile_url: profile_url || null,
        notes: notes || null,
        status: 'repere',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ prospect: data })
  } catch (err: any) {
    console.error('prospects-reseaux POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
