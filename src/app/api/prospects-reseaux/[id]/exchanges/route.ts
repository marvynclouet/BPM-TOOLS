import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET – Historique des échanges d'un prospect
 * POST – Ajouter un échange
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('social_prospect_exchanges')
      .select('*')
      .eq('prospect_id', id)
      .order('sent_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ exchanges: data || [] })
  } catch (err: any) {
    console.error('exchanges GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const admin = createAdminClient()
    const body = await request.json()

    const { direction, message, sent_at } = body
    if (!direction || !message?.trim()) {
      return NextResponse.json({ error: 'direction et message requis' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('social_prospect_exchanges')
      .insert({
        prospect_id: id,
        direction,
        message: message.trim(),
        sent_at: sent_at || new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Auto-update prospect status based on direction
    const statusUpdate: Record<string, any> = { updated_at: new Date().toISOString() }
    if (direction === 'sent') {
      // Si on envoie un message et statut est "repere", passer à "contacte"
      const { data: prospect } = await admin
        .from('social_prospects')
        .select('status')
        .eq('id', id)
        .single()
      if (prospect?.status === 'repere') {
        statusUpdate.status = 'contacte'
      }
    } else if (direction === 'received') {
      const { data: prospect } = await admin
        .from('social_prospects')
        .select('status')
        .eq('id', id)
        .single()
      if (prospect?.status === 'contacte') {
        statusUpdate.status = 'a_repondu'
      }
    }

    await admin
      .from('social_prospects')
      .update(statusUpdate)
      .eq('id', id)

    return NextResponse.json({ exchange: data })
  } catch (err: any) {
    console.error('exchanges POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
