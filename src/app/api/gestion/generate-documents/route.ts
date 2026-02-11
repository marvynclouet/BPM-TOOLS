import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { generateAttestationPDF, generateInvoicePDF } from '@/lib/documents-pdf'
import { sendEmailWithDocuments, sendWhatsAppMessage } from '@/lib/communications'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, method } = body // method: 'email' | 'whatsapp'

    if (!leadId || !method) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Récupérer le lead (on accepte tous les statuts car on peut envoyer depuis la comptabilité)
    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 })
    }

    // Vérifier que l'email est disponible
    if (method === 'email' && !lead.email) {
      return NextResponse.json({ error: 'Email du lead non renseigné' }, { status: 400 })
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

    // Formater les dates pour l'attestation
    const formatDatesForAttestation = () => {
      if (!planningEntry) {
        return { dates: 'Dates à définir', periodText: 'Dates à définir' }
      }
      
      if (planningEntry.specific_dates && planningEntry.specific_dates.length > 0) {
        // Dates simples pour affichage
        const dates = planningEntry.specific_dates.slice(0, 4).map((d: string) => {
          const date = new Date(d.includes('T') ? d.split('T')[0] : d)
          return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
        })
        const datesStr = dates.join(', ')
        
        // Pour la période formatée exactement comme le modèle
        const firstDate = new Date(planningEntry.specific_dates[0].includes('T') ? planningEntry.specific_dates[0].split('T')[0] : planningEntry.specific_dates[0])
        const lastDate = new Date(planningEntry.specific_dates[planningEntry.specific_dates.length - 1].includes('T') ? planningEntry.specific_dates[planningEntry.specific_dates.length - 1].split('T')[0] : planningEntry.specific_dates[planningEntry.specific_dates.length - 1])
        
        const dayName = firstDate.toLocaleDateString('fr-FR', { weekday: 'long' })
        const firstDay = firstDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        const lastDay = lastDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        const dayPlural = dayName === 'dimanche' ? 'dimanches' : 'samedis'
        const periodText = `du ${firstDay} au ${lastDay} sur 4 ${dayPlural}`
        
        return { dates: datesStr, periodText }
      } else if (planningEntry.start_date && planningEntry.end_date) {
        const start = new Date(planningEntry.start_date)
        const end = new Date(planningEntry.end_date)
        // Format: "Du 09/02/2026 au 13/02/2026"
        const startFormatted = start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const endFormatted = end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const datesStr = `Du ${startFormatted} au ${endFormatted}`
        return { dates: datesStr, periodText: datesStr }
      }
      return { dates: 'Dates à définir', periodText: 'Dates à définir' }
    }
    
    const datesInfo = formatDatesForAttestation()

    // Récupérer le nom du représentant légal (utilisateur connecté)
    const currentUser = await getCurrentUser()
    const representativeName = currentUser?.full_name || 'Marvyn Clouet'

    // Générer l'attestation
    const attestationPDF = await generateAttestationPDF({
      firstName: lead.first_name,
      lastName: lead.last_name,
      phone: lead.phone,
      email: lead.email || '',
      formation: lead.formation,
      dates: datesInfo.dates,
      periodText: datesInfo.periodText,
      date: new Date(),
      formationFormat: lead.formation_format,
      representativeName: representativeName,
    })

    // Générer la facture
    const invoicePDF = await generateInvoicePDF({
      firstName: lead.first_name,
      lastName: lead.last_name,
      phone: lead.phone,
      email: lead.email || '',
      formation: lead.formation,
      amount: lead.price_fixed || 0,
      deposit: lead.price_deposit || 0,
      date: new Date(),
    })

    // Envoyer selon la méthode choisie
    if (method === 'email') {
      console.log(`📧 Envoi email pour lead ${leadId}:`)
      console.log(`   - Nom: ${lead.first_name} ${lead.last_name}`)
      console.log(`   - Email: ${lead.email}`)
      
      await sendEmailWithDocuments(lead.email!, lead.first_name, attestationPDF, invoicePDF)
      
      // Mettre à jour le champ documents_sent_at
      await adminClient
        .from('leads')
        .update({ documents_sent_at: new Date().toISOString() })
        .eq('id', leadId)
    } else if (method === 'whatsapp') {
      await sendWhatsAppMessage(
        lead.phone,
        lead.first_name,
        attestationPDF,
        invoicePDF
      )
      
      // Mettre à jour le champ documents_sent_at
      await adminClient
        .from('leads')
        .update({ documents_sent_at: new Date().toISOString() })
        .eq('id', leadId)
    }

    return NextResponse.json({ 
      success: true,
      message: `Documents générés et envoyés par ${method}` 
    })
  } catch (error: any) {
    console.error('Erreur génération documents:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
