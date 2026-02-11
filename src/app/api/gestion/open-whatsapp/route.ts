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

    // Récupérer le lead
    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 })
    }

    const { data: link } = await adminClient
      .from('planning_lead')
      .select('planning_id')
      .eq('lead_id', leadId)
      .limit(1)
      .maybeSingle()
    const { data: planningEntry } = link?.planning_id
      ? await adminClient.from('planning').select('*').eq('id', link.planning_id).single()
      : { data: null }

    // Formater les dates (priorité: formation_start_date du lead, puis planning)
    const formatDates = () => {
      if (lead.formation_start_date) {
        const startDate = new Date(lead.formation_start_date)
        if (lead.formation_format === 'mensuelle') {
          return startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        } else if (lead.formation_format === 'semaine') {
          const endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + 4)
          return `Du ${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
        } else if (lead.formation_format === 'bpm_fast') {
          const endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + 1)
          return `Du ${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
        }
        return startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      }
      
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

    const getStripeLink = (price: number): string => {
      if (price === 600) return 'https://buy.stripe.com/fZu4gA4wV10I7DIfIm77O08'
      if (price === 700) return 'https://buy.stripe.com/28EbJ26F3gZG2jo67M77O03'
      if (price === 800) return 'https://buy.stripe.com/9B6dRa6F3aBi9LQ1Rw77O05'
      if (price < 650) return 'https://buy.stripe.com/fZu4gA4wV10I7DIfIm77O08'
      if (price < 750) return 'https://buy.stripe.com/28EbJ26F3gZG2jo67M77O03'
      return 'https://buy.stripe.com/9B6dRa6F3aBi9LQ1Rw77O05'
    }

    const RIB = 'FR76 1741 8000 0100 0119 6169 214'
    
    const totalPrice = lead.price_fixed || 0
    const deposit = lead.price_deposit || 0
    const remaining = totalPrice - deposit
    const acompteAmount = Math.round(totalPrice * 0.1)

    const getDuration = (): string => {
      if (lead.formation_format === 'mensuelle') return '1 mois'
      if (lead.formation_format === 'semaine') return '1 semaine'
      if (lead.formation_format === 'bpm_fast') return '2 jours'
      return 'À définir'
    }

    const datesText = formatDates()

    // Construire le message
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
    
    if (totalPrice > 0 && remaining === totalPrice) {
      messageParts.push('Pour régler l\'intégralité, tu peux utiliser notre lien de paiement sécurisé :')
      messageParts.push(getStripeLink(totalPrice))
      messageParts.push('')
    }
    
    if (totalPrice > 0) {
      messageParts.push(`Pour un acompte de 10% (${acompteAmount}€), voici notre RIB :`)
      messageParts.push(RIB)
      messageParts.push('')
    }
    
    messageParts.push('À très bientôt !')
    messageParts.push('')
    messageParts.push('L\'équipe BPM Formation')
    
    const message = messageParts.join('\n')

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

    // Enregistrer la date de début de conversation si c'est la première fois
    const updateData: any = {}
    if (!lead.whatsapp_conversation_started_at) {
      updateData.whatsapp_conversation_started_at = new Date().toISOString()
    }

    if (Object.keys(updateData).length > 0) {
      await adminClient
        .from('leads')
        .update(updateData)
        .eq('id', leadId)
    }

    return NextResponse.json({ 
      success: true,
      whatsappUrl,
      message,
    })
  } catch (error: any) {
    console.error('Erreur ouverture WhatsApp:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
