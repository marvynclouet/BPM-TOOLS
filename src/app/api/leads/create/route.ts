import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { first_name, last_name, phone, email, formation, source } = body

    // Validation (email est optionnel)
    if (!first_name || !last_name || !phone || !formation) {
      return NextResponse.json(
        { error: 'Les champs prénom, nom, téléphone et formation sont obligatoires' },
        { status: 400 }
      )
    }

    // Valider la formation
    const validFormations = ['inge_son', 'beatmaking', 'je_ne_sais_pas_encore']
    if (!validFormations.includes(formation)) {
      return NextResponse.json(
        { error: 'Formation invalide' },
        { status: 400 }
      )
    }

    // Créer le lead avec le client admin pour bypasser RLS
    const adminClient = createAdminClient()
    
    const { data, error } = await adminClient
      .from('leads')
      .insert({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        formation: formation === 'je_ne_sais_pas_encore' ? 'autre' : formation,
        source: source || 'direct',
        status: 'nouveau',
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création lead:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la création du lead' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, lead: data },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur API create lead:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
