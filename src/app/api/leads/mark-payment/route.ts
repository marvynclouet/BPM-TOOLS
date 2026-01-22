import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateFormationDates } from '@/lib/planning'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, paymentType } = body // 'acompte' | 'complet'

    if (!leadId || !paymentType) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Récupérer le lead
    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select('price_fixed, price_deposit, status, formation_format, formation_day, formation_start_date')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 })
    }

    if (!lead.price_fixed) {
      return NextResponse.json({ error: 'Prix fixé non défini' }, { status: 400 })
    }

    let paymentAmount = 0
    let newStatus: string
    let entryType: string
    let remainingAmount: number | null = null

    // Vérifier si un acompte a déjà été réglé
    const { data: existingPayments } = await adminClient
      .from('lead_payments')
      .select('amount, payment_type')
      .eq('lead_id', leadId)

    const totalPaid = existingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

    if (paymentType === 'acompte') {
      if (!lead.price_deposit) {
        return NextResponse.json({ error: 'Prix acompte non défini' }, { status: 400 })
      }
      if (totalPaid > 0) {
        return NextResponse.json({ error: 'Un paiement a déjà été effectué' }, { status: 400 })
      }
      paymentAmount = lead.price_deposit
      newStatus = 'acompte_regle'
      entryType = 'acompte'
      remainingAmount = lead.price_fixed - lead.price_deposit
    } else if (paymentType === 'complet') {
      if (lead.status === 'acompte_regle') {
        // C'est le solde après un acompte
        const remaining = lead.price_fixed - totalPaid
        if (remaining <= 0) {
          return NextResponse.json({ error: 'Le solde est déjà réglé' }, { status: 400 })
        }
        paymentAmount = remaining
        entryType = 'solde'
        remainingAmount = 0
      } else {
        // Paiement complet d'un coup
        if (totalPaid > 0) {
          return NextResponse.json({ error: 'Un paiement a déjà été effectué' }, { status: 400 })
        }
        paymentAmount = lead.price_fixed
        entryType = 'complet'
        remainingAmount = null
      }
      newStatus = 'clos'
    } else {
      return NextResponse.json({ error: 'Type de paiement invalide' }, { status: 400 })
    }

    // Créer l'entrée de paiement
    const { data: payment, error: paymentError } = await adminClient
      .from('lead_payments')
      .insert({
        lead_id: leadId,
        payment_type: paymentType === 'acompte' ? 'acompte' : 'complet',
        amount: paymentAmount,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Erreur création paiement:', paymentError)
      return NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 })
    }

    // Calculer les commissions (10% closer, 5% formateur)
    const commissionCloser = paymentAmount * 0.10 // Toujours 10% pour le closer
    const commissionFormateur = paymentAmount * 0.05

    // Créer l'entrée comptable
    const { error: accountingError } = await adminClient
      .from('accounting_entries')
      .insert({
        lead_id: leadId,
        payment_id: payment.id,
        entry_type: entryType,
        amount: paymentAmount,
        commission_closer: commissionCloser,
        commission_formateur: commissionFormateur,
        remaining_amount: remainingAmount,
      })

    if (accountingError) {
      console.error('Erreur création entrée comptable:', accountingError)
      return NextResponse.json({ error: 'Erreur lors de la création de l\'entrée comptable' }, { status: 500 })
    }

    // Mettre à jour le statut du lead
    const { error: updateError } = await adminClient
      .from('leads')
      .update({ status: newStatus })
      .eq('id', leadId)

    if (updateError) {
      console.error('Erreur mise à jour lead:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du lead' }, { status: 500 })
    }

    // Créer automatiquement une entrée planning si acompte réglé ou clos ET format défini
    if ((newStatus === 'acompte_regle' || newStatus === 'clos') && lead.formation_format && lead.formation_day && lead.formation_start_date) {
      try {
        // Vérifier si une entrée planning existe déjà
        const { data: existingPlanning } = await adminClient
          .from('planning')
          .select('id')
          .eq('lead_id', leadId)
          .single()

        if (!existingPlanning) {
          // Calculer les dates selon le format et la date choisie
          const startDate = new Date(lead.formation_start_date)
          const dates = calculateFormationDates(
            lead.formation_format as 'mensuelle' | 'semaine' | 'bpm_fast',
            lead.formation_day as any,
            startDate
          )

          // Pour le format mensuelle et bpm_fast, calculer les dates exactes
          let specificDates: string[] | null = null
          if (lead.formation_format === 'bpm_fast') {
            // BPM Fast = 2 jours consécutifs
            const day1 = new Date(dates.startDate)
            const day2 = new Date(dates.endDate)
            specificDates = [
              day1.toISOString().split('T')[0],
              day2.toISOString().split('T')[0],
            ]
          } else if (lead.formation_format === 'mensuelle' && lead.formation_day) {
            const selectedDate = new Date(lead.formation_start_date)
            const year = selectedDate.getFullYear()
            const month = selectedDate.getMonth()
            
            // Vérifier que formation_day est bien samedi ou dimanche
            if (lead.formation_day !== 'samedi' && lead.formation_day !== 'dimanche') {
              console.error(`Jour invalide pour format mensuelle: ${lead.formation_day}`)
            } else {
              // Utiliser le jour choisi (formation_day), pas le jour de la date choisie
              const targetDay = lead.formation_day === 'samedi' ? 6 : 0
              
              console.log(`Calcul dates mensuelle: jour=${lead.formation_day}, targetDay=${targetDay}, mois=${month + 1}/${year}`)
              
              const datesArray: Date[] = []
              const daysInMonth = new Date(year, month + 1, 0).getDate()
              
              // Parcourir tous les jours du mois pour trouver les samedis/dimanches
              for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
                const date = new Date(year, month, dayNum)
                if (date.getDay() === targetDay) {
                  datesArray.push(date)
                }
              }
              
              console.log(`Dates trouvées pour ${lead.formation_day}:`, datesArray.map(d => d.toISOString().split('T')[0]))
              
              // Prendre les 4 premiers et les convertir en format ISO (YYYY-MM-DD)
              if (datesArray.length >= 4) {
                specificDates = datesArray.slice(0, 4).map(d => {
                  const year = d.getFullYear()
                  const month = String(d.getMonth() + 1).padStart(2, '0')
                  const day = String(d.getDate()).padStart(2, '0')
                  return `${year}-${month}-${day}`
                })
                console.log(`Specific dates calculées:`, specificDates)
              } else {
                console.error(`Pas assez de ${lead.formation_day}s dans le mois ${month + 1}/${year} (trouvé ${datesArray.length}, besoin de 4)`)
              }
            }
          }

          // Créer l'entrée planning
          const planningData: any = {
            lead_id: leadId,
            start_date: dates.startDate.toISOString(),
            end_date: dates.endDate.toISOString(),
          }
          
          // Ajouter specific_dates seulement si la colonne existe (après migration)
          if (specificDates) {
            planningData.specific_dates = specificDates
          }

          const { error: planningError } = await adminClient
            .from('planning')
            .insert(planningData)

          if (planningError) {
            console.error('Erreur création planning:', planningError)
            // Ne pas faire échouer la requête si le planning échoue
          }
        }
      } catch (planningErr: any) {
        console.error('Erreur calcul dates planning:', planningErr)
        // Ne pas faire échouer la requête si le planning échoue
      }
    }

    return NextResponse.json({ 
      success: true, 
      payment, 
      remainingAmount 
    }, { status: 200 })

  } catch (error: any) {
    console.error('Erreur API mark-payment:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
