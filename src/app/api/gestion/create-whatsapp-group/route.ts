import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createStripePaymentLink } from '@/lib/stripe-payment'
import { createWhatsAppGroup, generateManualWhatsAppGroupLink, sendWhatsAppTemplateMessage } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId } = body

    if (!leadId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Récupérer le lead (peut être chaud ou clos)
    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 })
    }

    // Vérifier que c'est un lead chaud ou clos
    if (lead.interest_level !== 'chaud' && lead.status !== 'clos') {
      return NextResponse.json({ error: 'Ce lead n\'est pas éligible pour la création de groupe' }, { status: 400 })
    }

    // Récupérer l'entrée de planning (optionnel pour les leads chauds)
    const { data: planningEntries } = await adminClient
      .from('planning')
      .select('*')
      .eq('lead_id', leadId)
      .limit(1)

    const planningEntry = planningEntries?.[0]


    // Formater les dates (si planning existe)
    const formatDates = () => {
      if (!planningEntry) {
        return 'Dates à définir'
      }
      
      if (planningEntry.specific_dates && planningEntry.specific_dates.length > 0) {
        const dates = planningEntry.specific_dates.slice(0, 4).map(d => {
          const date = new Date(d.includes('T') ? d.split('T')[0] : d)
          return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
        })
        return dates.join(', ')
      } else if (planningEntry.start_date && planningEntry.end_date) {
        const start = new Date(planningEntry.start_date)
        const end = new Date(planningEntry.end_date)
        return `Du ${start.toLocaleDateString('fr-FR')} au ${end.toLocaleDateString('fr-FR')}`
      }
      return 'Dates à définir'
    }

    const formationLabels: Record<string, string> = {
      inge_son: 'Ingé son',
      beatmaking: 'Beatmaking',
      autre: 'Autre',
    }

    const formatLabels: Record<string, string> = {
      semaine: 'Semaine',
      mensuelle: 'Mensuelle',
    }

    // Créer un lien de paiement Stripe (si prix défini)
    let paymentLink = ''
    if (lead.price_fixed && lead.price_fixed > 0) {
      try {
        paymentLink = await createStripePaymentLink({
          leadId: lead.id,
          amount: lead.price_fixed,
          description: `Formation ${lead.formation} - ${lead.first_name} ${lead.last_name}`,
        })
      } catch (error) {
        console.error('Erreur création lien Stripe:', error)
      }
    }

    // Créer le message de résumé
    const message = `🎓 *Résumé de votre formation*

👤 *Élève:* ${lead.first_name} ${lead.last_name}
📚 *Formation:* ${formationLabels[lead.formation] || lead.formation}
${lead.formation_format ? `📅 *Format:* ${formatLabels[lead.formation_format] || lead.formation_format}\n` : ''}${planningEntry ? `📆 *Dates:* ${formatDates()}\n` : ''}${lead.price_fixed ? `💰 *Prix total:* ${lead.price_fixed.toFixed(2)} €\n` : ''}${lead.price_deposit && lead.price_deposit > 0 ? `💵 *Acompte:* ${lead.price_deposit.toFixed(2)} €\n` : ''}${paymentLink ? `💳 *Paiement:*\n${paymentLink}\n\nOu virement bancaire sur notre RIB (nous contacter pour les coordonnées).\n` : ''}À bientôt ! 🎉`

    // Essayer de créer le groupe via l'API WhatsApp Business si configurée
    let groupResult = null
    let whatsappUrl = ''
    let method = 'manual'

    // Si l'API WhatsApp est configurée, essayer de créer le groupe automatiquement
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      groupResult = await createWhatsAppGroup({
        subject: `Formation ${formationLabels[lead.formation] || lead.formation} - ${lead.first_name} ${lead.last_name}`,
        description: `Groupe WhatsApp pour la formation de ${lead.first_name} ${lead.last_name}`,
        phoneNumbers: [lead.phone],
      })

      if (groupResult && groupResult.inviteLink) {
        method = 'api'
        whatsappUrl = groupResult.inviteLink
        
        // Envoyer le message de résumé avec le lien d'invitation
        const fullMessage = `${message}\n\n📱 *Rejoignez le groupe:* ${groupResult.inviteLink}`
        await sendWhatsAppTemplateMessage({
          to: lead.phone,
          message: fullMessage,
        })
      }
    }

    // Si l'API n'est pas configurée ou a échoué, générer un lien manuel
    if (!groupResult || !groupResult.inviteLink) {
      const instructionsMessage = `${message}\n\n📱 *Instructions pour créer le groupe:*\n1. Ouvrez WhatsApp\n2. Créez un nouveau groupe avec le nom: "Formation ${formationLabels[lead.formation] || lead.formation} - ${lead.first_name}"\n3. Ajoutez ${lead.first_name} ${lead.last_name} (${lead.phone})\n4. Partagez ce message dans le groupe`
      
      whatsappUrl = generateManualWhatsAppGroupLink(lead.phone, instructionsMessage)
    }

    return NextResponse.json({ 
      success: true,
      whatsappUrl,
      message,
      paymentLink,
      method, // 'api' ou 'manual'
      groupId: groupResult?.groupId || null,
    })
  } catch (error: any) {
    console.error('Erreur création groupe WhatsApp:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
