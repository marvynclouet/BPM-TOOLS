import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { generateConvocationPDF, generateInvoicePDF, generateAttestationPDF } from '@/lib/documents-pdf'

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

    // Récupérer l'entrée de planning
    const { data: planningEntries } = await adminClient
      .from('planning')
      .select('*')
      .eq('lead_id', leadId)
      .limit(1)

    const planningEntry = planningEntries?.[0]

    // Formater les dates pour l'attestation
    const formatDatesForAttestation = () => {
      if (!planningEntry) {
        return { dates: 'Dates à définir', periodText: 'Dates à définir' }
      }
      
      if (planningEntry.specific_dates && planningEntry.specific_dates.length > 0) {
        // Dates simples pour affichage
        const dates = planningEntry.specific_dates.slice(0, 4).map(d => {
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
    
    // Formater les dates pour convocation/facture (format simple)
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
    
    const datesInfo = formatDatesForAttestation()

    // Générer les trois documents
    const convocationPDF = await generateConvocationPDF({
      firstName: lead.first_name,
      lastName: lead.last_name,
      phone: lead.phone,
      email: lead.email || '',
      formation: lead.formation,
      dates: formatDates(),
      date: new Date(),
    })

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

    // Récupérer le nom du représentant légal (utilisateur connecté)
    const currentUser = await getCurrentUser()
    const representativeName = currentUser?.full_name || 'Marvyn Clouet'
    
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

    // Pour l'instant, on retourne l'attestation (document principal)
    // TODO: Utiliser pdf-lib pour combiner les trois PDFs si nécessaire
    return new NextResponse(attestationPDF, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="attestation-${lead.first_name}-${lead.last_name}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Erreur génération PDF:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
