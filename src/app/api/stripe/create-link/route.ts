import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
})

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { leadId, amount, formation } = body

  if (!leadId || !amount) {
    return NextResponse.json({ error: 'Missing leadId or amount' }, { status: 400 })
  }

  const supabase = await createClient()

  // Récupérer le lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Récupérer le prix depuis les settings ou utiliser le montant fourni
  const { data: priceSettings } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'prices')
    .single()

  const price = priceSettings?.value?.[formation] || amount

  // Créer un Payment Link Stripe
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        // @ts-ignore - price_data est valide pour Stripe Payment Links
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Formation ${formation}`,
            description: `Formation pour ${lead.first_name} ${lead.last_name}`,
          },
          unit_amount: Math.round(price * 100), // Stripe utilise les centimes
        },
        quantity: 1,
      },
    ],
    metadata: {
      lead_id: leadId,
      closer_id: user.id,
    },
  })

  // Créer ou mettre à jour le deal
  const { data: existingDeal } = await supabase
    .from('deals')
    .select('id')
    .eq('lead_id', leadId)
    .single()

  if (existingDeal) {
    await supabase
      .from('deals')
      .update({
        stripe_payment_link_id: paymentLink.id,
        status: 'pending',
      })
      .eq('id', existingDeal.id)
  } else {
    await supabase.from('deals').insert({
      lead_id: leadId,
      stripe_payment_link_id: paymentLink.id,
      status: 'pending',
    })
  }

  // Mettre à jour le statut du lead
  await supabase
    .from('leads')
    .update({
      status: 'lien_envoye',
      last_action_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  return NextResponse.json({
    paymentLink: paymentLink.url,
    paymentLinkId: paymentLink.id,
  })
}
