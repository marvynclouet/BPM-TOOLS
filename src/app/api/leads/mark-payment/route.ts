import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateFormationDates } from '@/lib/planning'

const DASHBOARD_PATHS = ['/dashboard', '/dashboard/crm', '/dashboard/comptabilite', '/dashboard/planning', '/dashboard/gestion', '/dashboard/mon-espace']

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

    // Clos ou Acompte réglé → créer directement une session planning avec ce lead (aux dates formation)
    if ((newStatus === 'acompte_regle' || newStatus === 'clos') && lead.formation_format && lead.formation_day && lead.formation_start_date) {
      try {
        const { data: existingLink } = await adminClient
          .from('planning_lead')
          .select('planning_id')
          .eq('lead_id', leadId)
          .limit(1)
          .single()

        if (!existingLink) {
          const startDate = new Date(lead.formation_start_date)
          const dates = calculateFormationDates(
            lead.formation_format as 'mensuelle' | 'semaine' | 'bpm_fast',
            lead.formation_day as any,
            startDate
          )

          let specificDates: string[] | null = null
          if (lead.formation_format === 'bpm_fast') {
            specificDates = [
              dates.startDate.toISOString().split('T')[0],
              dates.endDate.toISOString().split('T')[0],
            ]
          } else if (lead.formation_format === 'mensuelle' && (lead.formation_day === 'samedi' || lead.formation_day === 'dimanche')) {
            const selectedDate = new Date(lead.formation_start_date)
            const year = selectedDate.getFullYear()
            const month = selectedDate.getMonth()
            const targetDay = lead.formation_day === 'samedi' ? 6 : 0
            const datesArray: Date[] = []
            const daysInMonth = new Date(year, month + 1, 0).getDate()
            for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
              const date = new Date(year, month, dayNum)
              if (date.getDay() === targetDay) datesArray.push(date)
            }
            if (datesArray.length >= 4) {
              specificDates = datesArray.slice(0, 4).map((d: Date) => {
                const y = d.getFullYear()
                const m = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                return `${y}-${m}-${day}`
              })
            }
          }

          const planningRow: { start_date: string; end_date: string; specific_dates?: string[] } = {
            start_date: dates.startDate.toISOString(),
            end_date: dates.endDate.toISOString(),
          }
          if (specificDates) planningRow.specific_dates = specificDates

          const { data: planning, error: planningError } = await adminClient
            .from('planning')
            .insert(planningRow)
            .select()
            .single()

          if (!planningError && planning) {
            await adminClient.from('planning_lead').insert({ planning_id: planning.id, lead_id: leadId })
          } else if (planningError) {
            console.error('Erreur création planning:', planningError)
          }
        }
      } catch (planningErr: any) {
        console.error('Erreur calcul dates planning:', planningErr)
      }
    }

    for (const p of DASHBOARD_PATHS) revalidatePath(p)

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
