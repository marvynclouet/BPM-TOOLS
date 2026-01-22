import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * API route pour envoyer automatiquement les relances WhatsApp
 * Peut être appelée par un cron job (Vercel Cron, GitHub Actions, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier une clé secrète pour sécuriser l'endpoint (optionnel, seulement si CRON_SECRET est défini)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET
    
    // Si CRON_SECRET est défini, exiger l'authentification
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const now = new Date()
    const results = {
      relance1: 0,
      relance2: 0,
      relance3: 0,
      errors: [] as string[],
    }

    // Récupérer tous les leads avec une conversation WhatsApp en cours
    const { data: leads, error: leadsError } = await adminClient
      .from('leads')
      .select('*')
      .not('whatsapp_conversation_started_at', 'is', null)
      .or('interest_level.eq.chaud,status.eq.en_cours_de_closing,status.eq.acompte_en_cours,status.eq.clos')

    if (leadsError) {
      return NextResponse.json({ error: 'Erreur lors de la récupération des leads' }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Aucun lead à relancer',
        results 
      })
    }

    // Traiter chaque lead
    for (const lead of leads) {
      if (!lead.whatsapp_conversation_started_at) continue

      const startDate = new Date(lead.whatsapp_conversation_started_at)
      const hoursSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60)
      const daysSinceStart = hoursSinceStart / 24

      try {
        // Relance 1 : après 72h
        if (hoursSinceStart >= 72 && !lead.whatsapp_relance_1_at) {
          await sendRelance(adminClient, lead, 1)
          results.relance1++
        }
        // Relance 2 : après 1 semaine (7 jours)
        else if (daysSinceStart >= 7 && !lead.whatsapp_relance_2_at) {
          await sendRelance(adminClient, lead, 2)
          results.relance2++
        }
        // Dernière relance : après 1 semaine ET après relance 2
        else if (daysSinceStart >= 7 && lead.whatsapp_relance_2_at && !lead.whatsapp_relance_3_at) {
          await sendRelance(adminClient, lead, 3)
          results.relance3++
        }
      } catch (error: any) {
        results.errors.push(`Lead ${lead.id}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Relances envoyées: ${results.relance1} relance 1, ${results.relance2} relance 2, ${results.relance3} dernière relance`,
      results,
    })
  } catch (error: any) {
    console.error('Erreur relances automatiques:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Fonction helper pour envoyer une relance
 */
async function sendRelance(adminClient: any, lead: any, relanceNumber: 1 | 2 | 3) {
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
    .eq('id', lead.id)

  // Note: On ne peut pas ouvrir WhatsApp automatiquement depuis le serveur
  // On enregistre juste la date. Le closer devra ouvrir WhatsApp manuellement
  // ou on pourrait utiliser l'API WhatsApp Business (payante)
  
  console.log(`Relance ${relanceNumber} préparée pour ${lead.first_name} ${lead.last_name}: ${whatsappUrl}`)
  
  return whatsappUrl
}
