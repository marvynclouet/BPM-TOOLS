// Edge Function alternative pour le webhook Stripe
// Peut être utilisé à la place de l'API route Next.js si préféré

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Vérifier la signature Stripe
    const signature = req.headers.get('stripe-signature')!
    const body = await req.text()

    // TODO: Implémenter la vérification de signature Stripe
    // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // Pour l'instant, on parse le body directement (non sécurisé en production)
    const event = JSON.parse(body)

    // Traiter l'événement de paiement
    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      // Même logique que dans l'API route Next.js
      // ...
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
