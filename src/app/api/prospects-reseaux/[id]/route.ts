import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PATCH – Mettre à jour un prospect (statut, infos, notes)
 * DELETE – Supprimer un prospect
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const admin = createAdminClient()
    const body = await request.json()

    const allowed = ['username', 'platform', 'status', 'formation', 'phone', 'notes', 'profile_url']
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key]
    }

    const { data, error } = await admin
      .from('social_prospects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ prospect: data })
  } catch (err: any) {
    console.error('prospect PATCH error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const admin = createAdminClient()

    const { error } = await admin
      .from('social_prospects')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('prospect DELETE error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
