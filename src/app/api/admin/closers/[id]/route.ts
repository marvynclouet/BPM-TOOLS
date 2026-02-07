import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Context = { params: Promise<{ id: string }> | { id: string } }

/**
 * PATCH /api/admin/closers/[id]
 * Modifie un closer (email, nom, mot de passe). Réservé aux admins.
 */
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const params = await Promise.resolve(context.params)
    const userId = params.id
    if (!userId) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: adminRow } = await adminClient
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (adminRow?.role !== 'admin') {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
    }

    const body = await request.json()
    const email = body.email != null ? (body.email + '').trim().toLowerCase() : undefined
    const full_name = body.full_name !== undefined ? (body.full_name + '').trim() || null : undefined
    const password = body.password != null ? (body.password + '').trim() : undefined

    if (password !== undefined && password.length > 0 && password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit faire au moins 6 caractères' },
        { status: 400 }
      )
    }

    const authUpdate: { email?: string; password?: string; user_metadata?: { full_name?: string } } = {}
    if (email !== undefined) authUpdate.email = email
    if (password !== undefined && password.length >= 6) authUpdate.password = password
    if (full_name !== undefined) authUpdate.user_metadata = { full_name }

    if (Object.keys(authUpdate).length > 0) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(userId, authUpdate)
      if (authError) {
        if (authError.message.includes('already') || authError.message.includes('registered')) {
          return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 409 })
        }
        return NextResponse.json(
          { error: authError.message || 'Erreur mise à jour auth' },
          { status: 400 }
        )
      }
    }

    const userUpdate: { email?: string; full_name?: string | null; updated_at: string } = {
      updated_at: new Date().toISOString(),
    }
    if (email !== undefined) userUpdate.email = email
    if (full_name !== undefined) userUpdate.full_name = full_name

    const { error: userError } = await adminClient
      .from('users')
      .update(userUpdate)
      .eq('id', userId)

    if (userError) {
      return NextResponse.json(
        { error: 'Erreur mise à jour public.users: ' + userError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Erreur modification closer:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
