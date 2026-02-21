import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/admin/closers
 * Crée un compte closer (auth + public.users). Réservé aux admins.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: userRow } = await adminClient
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (userRow?.role !== 'admin') {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
    }

    const body = await request.json()
    const email = (body.email || '').trim().toLowerCase()
    const password = (body.password || '').trim()
    const full_name = (body.full_name || '').trim() || null
    const role = body.role === 'admin' || body.role === 'closer' || body.role === 'formateur' ? body.role : 'closer'

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Mot de passe requis (6 caractères minimum)' }, { status: 400 })
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email },
    })

    if (authError) {
      if (
        authError.message.includes('already registered') ||
        authError.message.includes('already exists') ||
        authError.message.includes('User already registered')
      ) {
        return NextResponse.json(
          { error: 'Un compte existe déjà avec cet email.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: authError.message || 'Erreur lors de la création du compte' },
        { status: 400 }
      )
    }

    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Utilisateur créé mais ID manquant' }, { status: 500 })
    }

    const { error: userError } = await adminClient
      .from('users')
      .upsert(
        {
          id: userId,
          email,
          role,
          full_name: full_name || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (userError) {
      return NextResponse.json(
        { error: 'Compte auth créé mais erreur public.users: ' + userError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, email, full_name, role },
    })
  } catch (e) {
    console.error('Erreur création closer:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
