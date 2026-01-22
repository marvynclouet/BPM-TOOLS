// Utilitaires pour envoi d'emails
// À implémenter avec un service comme Resend, SendGrid, ou Supabase Edge Function

import { Lead, DocumentType } from '@/types'

export async function sendDocumentsEmail(
  lead: Lead,
  documents: { type: DocumentType; url: string }[]
): Promise<void> {
  // TODO: Implémenter l'envoi d'email
  // Utiliser un service comme Resend, SendGrid, ou une Edge Function Supabase
  
  const emailContent = {
    to: lead.phone, // Ou un email si disponible
    subject: 'Vos documents de formation',
    body: `
      Bonjour ${lead.first_name},
      
      Veuillez trouver ci-joint vos documents :
      ${documents.map((doc) => `- ${doc.type}: ${doc.url}`).join('\n')}
      
      Cordialement,
      L'équipe BPM Tools
    `,
  }

  // Exemple avec Resend (à configurer)
  // await resend.emails.send({
  //   from: 'noreply@bpmtools.com',
  //   to: emailContent.to,
  //   subject: emailContent.subject,
  //   html: emailContent.body,
  // })

  console.log('Email à envoyer:', emailContent)
}
