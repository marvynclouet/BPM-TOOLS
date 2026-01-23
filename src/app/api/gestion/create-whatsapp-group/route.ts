import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // Vérifier que c'est un lead chaud, en cours de closing, acompte en cours ou clos
    const isEligible = lead.interest_level === 'chaud' 
      || lead.status === 'en_cours_de_closing' 
      || lead.status === 'acompte_en_cours' 
      || lead.status === 'clos'
    
    if (!isEligible) {
      return NextResponse.json({ error: 'Ce lead n\'est pas éligible pour l\'envoi de message WhatsApp' }, { status: 400 })
    }

    // Récupérer l'entrée de planning (optionnel pour les leads chauds)
    const { data: planningEntries } = await adminClient
      .from('planning')
      .select('*')
      .eq('lead_id', leadId)
      .limit(1)

    const planningEntry = planningEntries?.[0]


    // Formater les dates (priorité: formation_start_date du lead, puis planning)
    const formatDates = () => {
      // D'abord essayer avec formation_start_date du lead
      if (lead.formation_start_date) {
        const startDate = new Date(lead.formation_start_date)
        if (lead.formation_format === 'mensuelle') {
          // Pour mensuelle, afficher juste la date de début
          return startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        } else if (lead.formation_format === 'semaine') {
          // Pour semaine, calculer la fin (5 jours)
          const endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + 4) // +4 car le premier jour compte
          return `Du ${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
        } else if (lead.formation_format === 'bpm_fast') {
          // Pour BPM Fast, 2 jours consécutifs
          const endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + 1)
          return `Du ${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
        }
        return startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      }
      
      // Sinon utiliser le planning
      if (planningEntry) {
        if (planningEntry.specific_dates && planningEntry.specific_dates.length > 0) {
          const dates = planningEntry.specific_dates.slice(0, 4).map((d: string) => {
            const date = new Date(d.includes('T') ? d.split('T')[0] : d)
            return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
          })
          return dates.join(', ')
        } else if (planningEntry.start_date && planningEntry.end_date) {
          const start = new Date(planningEntry.start_date)
          const end = new Date(planningEntry.end_date)
          return `Du ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
        }
      }
      return 'À définir'
    }

    const formationLabels: Record<string, string> = {
      inge_son: 'Ingé son',
      beatmaking: 'Beatmaking',
      autre: 'Autre',
    }

    const formatLabels: Record<string, string> = {
      semaine: 'Semaine',
      mensuelle: 'Mensuelle',
      bpm_fast: '⚡ BPM Fast',
    }

    // Déterminer le lien Stripe selon le prix (liens statiques)
    const getStripeLink = (price: number | null): string => {
      if (!price) return ''
      if (price === 600) return 'https://buy.stripe.com/fZu4gA4wV10I7DIfIm77O08'
      if (price === 700) return 'https://buy.stripe.com/28EbJ26F3gZG2jo67M77O03'
      if (price === 800) return 'https://buy.stripe.com/9B6dRa6F3aBi9LQ1Rw77O05'
      // Si prix différent, utiliser le lien le plus proche ou créer dynamiquement
      if (price < 650) return 'https://buy.stripe.com/fZu4gA4wV10I7DIfIm77O08' // 600€
      if (price < 750) return 'https://buy.stripe.com/28EbJ26F3gZG2jo67M77O03' // 700€
      return 'https://buy.stripe.com/9B6dRa6F3aBi9LQ1Rw77O05' // 800€
    }

    // RIB pour acomptes
    const RIB = 'FR76 1741 8000 0100 0119 6169 214'
    
    // Calculer le reste à payer
    const totalPrice = lead.price_fixed || 0
    const deposit = lead.price_deposit || 0
    const remaining = totalPrice - deposit
    const acompteAmount = Math.round(totalPrice * 0.1) // 10% du prix

    // Formater la durée selon le format
    const getDuration = (): string => {
      if (lead.formation_format === 'mensuelle') return '1 mois'
      if (lead.formation_format === 'semaine') return '1 semaine'
      if (lead.formation_format === 'bpm_fast') return '2 jours'
      return 'À définir'
    }

    // Formater les dates pour le message
    const datesText = formatDates()

    // Construire le message de manière professionnelle et claire
    let messageParts: string[] = []
    
    messageParts.push(`Bonjour ${lead.first_name},`)
    messageParts.push('')
    messageParts.push('Merci pour ta confiance !')
    messageParts.push('')
    messageParts.push('Voici le récapitulatif de ta formation :')
    messageParts.push('')
    messageParts.push(`Formation : ${formationLabels[lead.formation] || lead.formation}`)
    messageParts.push(`Durée : ${getDuration()}`)
    messageParts.push(`Prix total : ${totalPrice.toFixed(0)}€`)
    
    if (remaining > 0 && remaining < totalPrice) {
      messageParts.push(`Reste à payer : ${remaining.toFixed(0)}€`)
    }
    
    messageParts.push(`Dates : ${datesText}`)
    messageParts.push('')
    
    // Lien Stripe si paiement complet
    if (totalPrice > 0 && remaining === totalPrice) {
      messageParts.push('Pour régler l\'intégralité, tu peux utiliser notre lien de paiement sécurisé :')
      messageParts.push(getStripeLink(totalPrice))
      messageParts.push('')
    }
    
    // RIB pour acompte (toujours affiché)
    if (totalPrice > 0) {
      messageParts.push(`Pour un acompte de 10% (${acompteAmount}€), voici notre RIB :`)
      messageParts.push(RIB)
      messageParts.push('')
    }
    
    messageParts.push('À très bientôt !')
    messageParts.push('')
    messageParts.push('L\'équipe BPM Formation')
    
    const message = messageParts.join('\n')

    // Générer un lien WhatsApp direct (conversation 1-to-1) - Plus simple qu'un groupe
    // Format: wa.me/numero?text=message
    const normalizedPhone = lead.phone.replace(/\s/g, '').replace(/[^\d+]/g, '')
    // Si commence par 0, remplacer par 33 (France)
    const phoneNumber = normalizedPhone.startsWith('0') 
      ? '33' + normalizedPhone.substring(1)
      : normalizedPhone.startsWith('+33')
      ? normalizedPhone.substring(1)
      : normalizedPhone.startsWith('33')
      ? normalizedPhone
      : '33' + normalizedPhone
    
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`
    const method = 'conversation' // Conversation directe au lieu d'un groupe

    return NextResponse.json({ 
      success: true,
      whatsappUrl,
      message,
      paymentLink: getStripeLink(totalPrice),
      method, // 'conversation' (conversation directe)
      groupId: null, // Plus de groupe, on utilise une conversation directe
    })
  } catch (error: any) {
    console.error('Erreur création groupe WhatsApp:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
