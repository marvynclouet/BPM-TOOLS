import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  // Gérer l'événement de paiement réussi
  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const session = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent

    let paymentIntentId: string
    let customerId: string | null = null
    let amount: number
    let currency: string = 'eur'

    if ('payment_intent' in session && typeof session.payment_intent === 'string') {
      paymentIntentId = session.payment_intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      amount = paymentIntent.amount / 100 // Stripe amount est en centimes
      currency = paymentIntent.currency
      customerId = typeof paymentIntent.customer === 'string' ? paymentIntent.customer : null
    } else if ('id' in session && session.object === 'payment_intent') {
      paymentIntentId = session.id
      amount = (session as Stripe.PaymentIntent).amount / 100
      currency = (session as Stripe.PaymentIntent).currency
      customerId =
        typeof (session as Stripe.PaymentIntent).customer === 'string'
          ? (session as Stripe.PaymentIntent).customer
          : null
    } else {
      console.error('Unable to extract payment info from event')
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 })
    }

    // Trouver le deal via metadata ou session_id
    const { data: deal } = await supabase
      .from('deals')
      .select('*, leads:lead_id(*)')
      .or(`stripe_session_id.eq.${session.id},stripe_payment_link_id.eq.${session.id}`)
      .single()

    if (!deal) {
      console.error('Deal not found for session:', session.id)
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Mettre à jour le deal
    await supabase
      .from('deals')
      .update({ status: 'paid' })
      .eq('id', deal.id)

    // Créer l'enregistrement de paiement
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        deal_id: deal.id,
        amount,
        currency,
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: customerId,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
      return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 })
    }

    // Mettre à jour le lead en "Payé" puis "Clos"
    await supabase
      .from('leads')
      .update({ status: 'paye', last_action_at: new Date().toISOString() })
      .eq('id', deal.lead_id)

    // Récupérer les paramètres de commissions
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'commissions')
      .single()

    const commissionRateCloser = settings?.value?.closer_rate || 0.1 // 10% par défaut
    const commissionRateFormateur = settings?.value?.formateur_rate || 0.05 // 5% par défaut

    const commissionCloser = amount * commissionRateCloser
    const commissionFormateur = amount * commissionRateFormateur

    // Créer l'entrée dans le ledger
    await supabase.from('sales_ledger').insert({
      payment_id: payment.id,
      lead_id: deal.lead_id,
      amount,
      commission_closer: commissionCloser,
      commission_formateur: commissionFormateur,
      exported: false,
    })

    // TODO: Générer les documents (facture, convocation, attestation)
    // TODO: Envoyer les emails avec les documents
    // TODO: Ajouter au planning + Google Calendar

    // Mettre le lead en "Clos" après traitement
    await supabase
      .from('leads')
      .update({ status: 'clos' })
      .eq('id', deal.lead_id)
  }

  return NextResponse.json({ received: true })
}
