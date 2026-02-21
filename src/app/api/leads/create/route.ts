import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNewLeadNotification } from '@/lib/communications'
import { sendTikTokLeadEvents } from '@/lib/tiktok-events'

const DASHBOARD_PATHS = ['/dashboard', '/dashboard/crm', '/dashboard/comptabilite', '/dashboard/planning', '/dashboard/gestion', '/dashboard/mon-espace']

export async function POST(request: NextRequest) {
  console.log('📥 POST /api/leads/create reçu')
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

    // Notification email (ne bloque pas la réponse si échec)
    const notificationTo = process.env.LEAD_NOTIFICATION_EMAIL
    if (notificationTo) {
      console.log('📧 Envoi notification nouveau lead vers', notificationTo.trim().split(',')[0])
      sendNewLeadNotification({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email ?? null,
        formation: data.formation,
        source: data.source || 'direct',
      }).catch((err) => console.error('Notification lead:', err))
    } else {
      console.warn('⚠️ LEAD_NOTIFICATION_EMAIL non défini - aucune notification envoyée')
    }

    // TikTok Events API server-side (avec test_event_code pour vérifier dans l'onglet Test Events)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || null
    const userAgent = request.headers.get('user-agent') || null
    sendTikTokLeadEvents({
      leadId: data.id,
      email: data.email,
      phone: data.phone,
      formation: data.formation,
      ip,
      userAgent,
    }).catch((err) => console.error('TikTok Events API:', err))

    for (const p of DASHBOARD_PATHS) revalidatePath(p)
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
