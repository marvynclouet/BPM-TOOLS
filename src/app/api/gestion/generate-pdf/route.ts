import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { generateConvocationPDF, generateInvoicePDF, generateAttestationPDF } from '@/lib/documents-pdf'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, type = 'attestation' } = body as { leadId?: string; type?: 'facture' | 'attestation' | 'convocation' }

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

    // Formater les dates pour l'attestation (planning prioritaire, sinon lead formation_start_date/format/day)
    const formatDatesForAttestation = (): { dates: string; periodText: string } => {
      if (planningEntry) {
        if (planningEntry.specific_dates && planningEntry.specific_dates.length > 0) {
          const dates = planningEntry.specific_dates.slice(0, 4).map((d: string) => {
            const date = new Date(d.includes('T') ? d.split('T')[0] : d)
            return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
          })
          const datesStr = dates.join(', ')
          const firstDate = new Date(planningEntry.specific_dates[0].includes('T') ? planningEntry.specific_dates[0].split('T')[0] : planningEntry.specific_dates[0])
          const lastDate = new Date(planningEntry.specific_dates[planningEntry.specific_dates.length - 1].includes('T') ? planningEntry.specific_dates[planningEntry.specific_dates.length - 1].split('T')[0] : planningEntry.specific_dates[planningEntry.specific_dates.length - 1])
          const dayName = firstDate.toLocaleDateString('fr-FR', { weekday: 'long' })
          const firstDay = firstDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
          const lastDay = lastDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
          const dayPlural = dayName === 'dimanche' ? 'dimanches' : 'samedis'
          const periodText = `du ${firstDay} au ${lastDay} sur 4 ${dayPlural}`
          return { dates: datesStr, periodText }
        }
        if (planningEntry.start_date && planningEntry.end_date) {
          const start = new Date(planningEntry.start_date)
          const end = new Date(planningEntry.end_date)
          const startFormatted = start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
          const endFormatted = end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
          const datesStr = `Du ${startFormatted} au ${endFormatted}`
          return { dates: datesStr, periodText: datesStr }
        }
      }
      // Fallback : dates fixes du lead (formation_start_date + formation_format + formation_day)
      if (lead.formation_start_date && lead.formation_format) {
        const startDate = new Date(lead.formation_start_date)
        if (lead.formation_format === 'mensuelle' && lead.formation_day) {
          const year = startDate.getFullYear()
          const month = startDate.getMonth()
          const targetDay = lead.formation_day === 'samedi' ? 6 : 0
          const dates: Date[] = []
          const daysInMonth = new Date(year, month + 1, 0).getDate()
          for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(year, month, day)
            if (d.getDay() === targetDay) dates.push(d)
          }
          if (dates.length >= 4) {
            const first = dates[0]
            const last = dates[3]
            const datesStr = dates.slice(0, 4).map(d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })).join(', ')
            const dayPlural = targetDay === 0 ? 'dimanches' : 'samedis'
            const periodText = `du ${first.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} au ${last.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} sur 4 ${dayPlural}`
            return { dates: datesStr, periodText }
          }
        }
        if (lead.formation_format === 'semaine') {
          const dayOfWeek = startDate.getDay() === 0 ? 7 : startDate.getDay()
          const daysToMonday = dayOfWeek === 1 ? 0 : 1 - dayOfWeek
          const monday = new Date(startDate)
          monday.setDate(startDate.getDate() + daysToMonday)
          const friday = new Date(monday)
          friday.setDate(monday.getDate() + 4)
          const datesStr = `Du ${monday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} au ${friday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
          return { dates: datesStr, periodText: datesStr }
        }
        if (lead.formation_format === 'bpm_fast') {
          const endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + 1)
          const datesStr = `Du ${startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} au ${endDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
          return { dates: datesStr, periodText: datesStr }
        }
        const datesStr = startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        return { dates: datesStr, periodText: datesStr }
      }
      return { dates: 'Dates à définir', periodText: 'Dates à définir' }
    }
    
    // Formater les dates pour convocation/facture (planning prioritaire, sinon lead)
    const formatDates = (): string => {
      const info = formatDatesForAttestation()
      return info.dates
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

    // Retourner le document demandé (facture, convocation ou attestation)
    if (type === 'facture') {
      return new NextResponse(invoicePDF as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="facture-${lead.first_name}-${lead.last_name}.pdf"`,
        },
      })
    }
    if (type === 'convocation') {
      return new NextResponse(convocationPDF as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="convocation-${lead.first_name}-${lead.last_name}.pdf"`,
        },
      })
    }
    return new NextResponse(attestationPDF as any, {
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
