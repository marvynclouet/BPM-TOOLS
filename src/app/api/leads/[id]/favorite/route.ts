import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/leads/[id]/favorite - Toggle favori pour le lead
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

    const { data: existing } = await supabase
      .from('lead_favorites')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('lead_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('lead_id', leadId)
      return NextResponse.json({ isFavorite: false })
    } else {
      await supabase.from('lead_favorites').insert({ user_id: user.id, lead_id: leadId })
      return NextResponse.json({ isFavorite: true })
    }
  } catch (err: unknown) {
    console.error('POST /api/leads/[id]/favorite:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/leads/[id]/favorite - Vérifier si le lead est en favori
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
      return NextResponse.json({ isFavorite: false })
    }

    const { data } = await supabase
      .from('lead_favorites')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .maybeSingle()

    return NextResponse.json({ isFavorite: !!data })
  } catch (err: unknown) {
    return NextResponse.json({ isFavorite: false })
  }
}
