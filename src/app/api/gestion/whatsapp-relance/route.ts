import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, relanceNumber } = body

    if (!leadId || !relanceNumber) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    if (![1, 2, 3].includes(relanceNumber)) {
      return NextResponse.json({ error: 'Numéro de relance invalide' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Récupérer le lead
    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 })
    }

    // Vérifier que la conversation a bien commencé
    if (!lead.whatsapp_conversation_started_at) {
      return NextResponse.json({ error: 'La conversation WhatsApp n\'a pas encore été ouverte' }, { status: 400 })
    }

    // Vérifier les délais et que la relance n'a pas déjà été faite
    const startDate = new Date(lead.whatsapp_conversation_started_at)
    const now = new Date()
    const hoursSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    const daysSinceStart = hoursSinceStart / 24

    if (relanceNumber === 1) {
      if (hoursSinceStart < 72) {
        return NextResponse.json({ error: 'La première relance ne peut être envoyée qu\'après 72h' }, { status: 400 })
      }
      if (lead.whatsapp_relance_1_at) {
        return NextResponse.json({ error: 'La première relance a déjà été envoyée' }, { status: 400 })
      }
    } else if (relanceNumber === 2) {
      if (daysSinceStart < 7) {
        return NextResponse.json({ error: 'La deuxième relance ne peut être envoyée qu\'après 1 semaine' }, { status: 400 })
      }
      if (lead.whatsapp_relance_2_at) {
        return NextResponse.json({ error: 'La deuxième relance a déjà été envoyée' }, { status: 400 })
      }
    } else if (relanceNumber === 3) {
      if (daysSinceStart < 7) {
        return NextResponse.json({ error: 'La dernière relance ne peut être envoyée qu\'après 1 semaine' }, { status: 400 })
      }
      if (!lead.whatsapp_relance_2_at) {
        return NextResponse.json({ error: 'La deuxième relance doit être envoyée avant la dernière' }, { status: 400 })
      }
      if (lead.whatsapp_relance_3_at) {
        return NextResponse.json({ error: 'La dernière relance a déjà été envoyée' }, { status: 400 })
      }
    }

    // Messages de relance
    const relanceMessages: Record<number, string> = {
      1: `Bonjour ${lead.first_name},\n\nJe me permets de te relancer concernant ta formation. As-tu pu prendre le temps de consulter les informations que je t'ai envoyées ?\n\nN'hésite pas si tu as des questions !\n\nÀ bientôt,\nL'équipe BPM Formation`,
      2: `Bonjour ${lead.first_name},\n\nJe reviens vers toi concernant ta formation. Est-ce que tu souhaites toujours t'inscrire ?\n\nJe reste disponible pour répondre à tes questions.\n\nÀ bientôt,\nL'équipe BPM Formation`,
      3: `Bonjour ${lead.first_name},\n\nDernière relance de ma part concernant ta formation. Si tu es toujours intéressé(e), n'hésite pas à me contacter.\n\nÀ bientôt,\nL'équipe BPM Formation`,
    }

    const message = relanceMessages[relanceNumber]

    // Normaliser le numéro de téléphone
    const normalizedPhone = lead.phone.replace(/\s/g, '').replace(/[^\d+]/g, '')
    const phoneNumber = normalizedPhone.startsWith('0') 
      ? '33' + normalizedPhone.substring(1)
      : normalizedPhone.startsWith('+33')
      ? normalizedPhone.substring(1)
      : normalizedPhone.startsWith('33')
      ? normalizedPhone
      : '33' + normalizedPhone
    
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`

    // Enregistrer la date de la relance
    const updateField = relanceNumber === 1 
      ? 'whatsapp_relance_1_at' 
      : relanceNumber === 2 
      ? 'whatsapp_relance_2_at' 
      : 'whatsapp_relance_3_at'

    await adminClient
      .from('leads')
      .update({ [updateField]: new Date().toISOString() })
      .eq('id', leadId)

    return NextResponse.json({ 
      success: true,
      whatsappUrl,
      message,
    })
  } catch (error: any) {
    console.error('Erreur relance WhatsApp:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
