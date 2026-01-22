// Utilitaires pour génération de documents PDF
// À implémenter avec une librairie comme pdfkit, jsPDF, ou un service externe

import { createClient } from './supabase/server'
import { Lead, DocumentType } from '@/types'

export async function generateInvoice(lead: Lead, amount: number): Promise<string> {
  // TODO: Générer le PDF de facture
  // Pour l'instant, retourner une URL placeholder
  // En production, utiliser une librairie PDF ou un service comme Puppeteer
  
  const supabase = await createClient()
  
  // Exemple de structure de facture
  const invoiceData = {
    lead,
    amount,
    date: new Date().toISOString(),
    // ... autres champs
  }

  // Générer le PDF (à implémenter)
  // const pdfBuffer = await generatePDF(invoiceData)
  
  // Upload vers Supabase Storage
  // const { data, error } = await supabase.storage
  //   .from('documents')
  //   .upload(`invoices/${lead.id}-${Date.now()}.pdf`, pdfBuffer, {
  //     contentType: 'application/pdf',
  //   })

  // return data?.path || ''

  // Placeholder
  return `documents/invoices/${lead.id}-invoice.pdf`
}

export async function generateConvocation(lead: Lead, startDate: Date, endDate: Date): Promise<string> {
  // TODO: Générer le PDF de convocation
  return `documents/convocations/${lead.id}-convocation.pdf`
}

export async function generateAttestation(lead: Lead): Promise<string> {
  // TODO: Générer le PDF d'attestation
  return `documents/attestations/${lead.id}-attestation.pdf`
}

export async function saveDocument(
  leadId: string,
  type: DocumentType,
  url: string
): Promise<void> {
  const supabase = await createClient()
  
  await supabase.from('documents').insert({
    lead_id: leadId,
    type,
    url,
  })
}
