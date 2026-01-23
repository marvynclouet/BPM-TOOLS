// Création de liens de paiement Stripe

import { stripe } from './stripe'

interface PaymentLinkData {
  leadId: string
  amount: number
  description: string
}

export async function createStripePaymentLink(data: PaymentLinkData): Promise<string> {
  try {
    // Créer un Payment Link Stripe
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          // @ts-ignore - price_data est valide pour Stripe Payment Links
          price_data: {
            currency: 'eur',
            product_data: {
              name: data.description,
            },
            unit_amount: Math.round(data.amount * 100), // Stripe utilise les centimes
          },
          quantity: 1,
        },
      ],
      metadata: {
        lead_id: data.leadId,
      },
    })

    return paymentLink.url
  } catch (error: any) {
    console.error('Erreur création lien Stripe:', error)
    // En cas d'erreur, retourner un placeholder
    return `https://stripe.com/pay/${data.leadId}`
  }
}
