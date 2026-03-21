import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSimpleEmail } from '@/lib/communications'

export const dynamic = 'force-dynamic'

const CRENEAUX = ['12h-14h', '14h-16h', '16h-18h', '18h-20h']

/**
 * GET — Données publiques pour le formulaire JPO
 * Retourne l'événement actif + places restantes par créneau
 */
export async function GET() {
  try {
    const admin = createAdminClient()

    // Trouver l'événement actif
    const { data: event } = await admin
      .from('jpo_events')
      .select('*')
      .eq('status', 'active')
      .order('event_date', { ascending: true })
      .limit(1)
      .single()

    if (!event) {
      return NextResponse.json({ active: false, message: 'Aucune JPO prévue' })
    }

    // Compter les inscrits par créneau
    const { data: inscriptions } = await admin
      .from('jpo_inscriptions')
      .select('creneau')
      .eq('jpo_id', event.id)

    const countByCreneau: Record<string, number> = {}
    for (const c of CRENEAUX) countByCreneau[c] = 0
    for (const insc of (inscriptions || [])) {
      countByCreneau[insc.creneau] = (countByCreneau[insc.creneau] || 0) + 1
    }

    const slots = CRENEAUX.map(c => ({
      creneau: c,
      inscrits: countByCreneau[c],
      max: event.max_per_slot,
      disponible: countByCreneau[c] < event.max_per_slot,
    }))

    return NextResponse.json({
      active: true,
      event: {
        id: event.id,
        title: event.title,
        event_date: event.event_date,
      },
      slots,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST — Inscription publique à la JPO
 * Crée l'inscription + le lead CRM + envoie l'email de confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const body = await request.json()

    const { first_name, last_name, phone, social_handle, creneau, motivation, email } = body

    if (!first_name?.trim() || !last_name?.trim() || !phone?.trim() || !creneau) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    if (!CRENEAUX.includes(creneau)) {
      return NextResponse.json({ error: 'Créneau invalide' }, { status: 400 })
    }

    // Trouver l'événement actif
    const { data: event } = await admin
      .from('jpo_events')
      .select('*')
      .eq('status', 'active')
      .order('event_date', { ascending: true })
      .limit(1)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Aucune JPO active' }, { status: 400 })
    }

    // Vérifier les places disponibles
    const { count } = await admin
      .from('jpo_inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('jpo_id', event.id)
      .eq('creneau', creneau)

    if ((count || 0) >= event.max_per_slot) {
      return NextResponse.json({ error: 'Ce créneau est complet' }, { status: 400 })
    }

    // Créer le lead CRM
    const { data: lead, error: leadError } = await admin
      .from('leads')
      .insert({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        source: 'jpo',
        formation: 'autre',
        status: 'nouveau',
        comment: `JPO ${event.event_date} | Créneau ${creneau}${social_handle ? ` | @${social_handle}` : ''}${motivation ? ` | Motivation: ${motivation}` : ''}`,
      })
      .select('id')
      .single()

    if (leadError) {
      console.error('JPO lead creation error:', leadError)
    }

    // Créer l'inscription JPO
    const { data: inscription, error: inscError } = await admin
      .from('jpo_inscriptions')
      .insert({
        jpo_id: event.id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone.trim(),
        social_handle: social_handle?.trim() || null,
        creneau,
        motivation: motivation?.trim() || null,
        email: email?.trim() || null,
        lead_id: lead?.id || null,
      })
      .select()
      .single()

    if (inscError) {
      return NextResponse.json({ error: inscError.message }, { status: 500 })
    }

    // Envoyer l'email de confirmation
    if (email?.trim()) {
      const dateFormatted = new Date(event.event_date).toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })

      await sendSimpleEmail({
        to: email.trim(),
        subject: `Inscription confirmée - JPO BPM Formation`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a2e;">Inscription confirmée !</h2>
            <p>Salut <strong>${first_name}</strong>,</p>
            <p>Ton inscription à la <strong>Journée Portes Ouvertes BPM Formation</strong> est confirmée.</p>
            <div style="background: #f0f0f5; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date :</strong> ${dateFormatted}</p>
              <p style="margin: 5px 0;"><strong>Créneau :</strong> ${creneau}</p>
            </div>
            <p>On a hâte de te voir !</p>
            <p style="color: #666; font-size: 14px;">L'équipe BPM Formation</p>
          </div>
        `,
      })
    }

    // Notification équipe
    const teamEmail = process.env.LEAD_NOTIFICATION_EMAIL
    if (teamEmail) {
      const dateFormatted = new Date(event.event_date).toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
      await sendSimpleEmail({
        to: teamEmail.split(',').map((e: string) => e.trim()),
        subject: `🎯 Nouvelle inscription JPO — ${first_name} ${last_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a2e;">Nouvelle inscription JPO</h2>
            <div style="background: #f0f0f5; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Nom :</strong> ${first_name} ${last_name}</p>
              <p style="margin: 5px 0;"><strong>Téléphone :</strong> ${phone}</p>
              ${email ? `<p style="margin: 5px 0;"><strong>Email :</strong> ${email}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Créneau :</strong> ${creneau}</p>
              <p style="margin: 5px 0;"><strong>Date JPO :</strong> ${dateFormatted}</p>
              ${motivation ? `<p style="margin: 5px 0;"><strong>Motivation :</strong> ${motivation}</p>` : ''}
            </div>
            <p style="color: #666; font-size: 14px;">Retrouve cette inscription dans le Planning → JPO</p>
          </div>
        `,
      }).catch(err => console.error('JPO team notification error:', err))
    }

    return NextResponse.json({ success: true, inscription })
  } catch (err: any) {
    console.error('JPO inscription error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
