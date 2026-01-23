// Utilitaires pour l'envoi d'emails et WhatsApp

export async function sendEmailWithDocuments(
  email: string,
  firstName: string,
  attestationPDF: Buffer,
  invoicePDF: Buffer
): Promise<void> {
  // Vérifier si Resend est configuré
  const resendApiKey = process.env.RESEND_API_KEY
  
  if (!resendApiKey) {
    console.warn('⚠️ RESEND_API_KEY non configuré - Email non envoyé (simulation)')
    console.log(`📧 Email à envoyer à ${email} pour ${firstName}`)
    console.log('📎 Attestation et facture générées')
    // En mode développement, on simule l'envoi mais on ne bloque pas
    // En production, vous devriez lever une erreur
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY non configuré - Impossible d\'envoyer l\'email')
    }
    return
  }

  try {
    // Importer Resend dynamiquement (require est nécessaire car resend n'a pas d'export ESM par défaut)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resend } = require('resend')
    const resend = new Resend(resendApiKey)

    // Convertir les buffers en base64 pour les pièces jointes
    const attestationBase64 = attestationPDF.toString('base64')
    const invoiceBase64 = invoicePDF.toString('base64')

    // Log pour debug
    console.log(`📧 Tentative d'envoi email:`)
    console.log(`   - De: ${process.env.RESEND_FROM_EMAIL || 'BPM Formation <noreply@bpmformation.fr>'}`)
    console.log(`   - À: ${email}`)
    console.log(`   - Nom: ${firstName}`)

    // Envoyer l'email avec Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'BPM Formation <noreply@bpmformation.fr>',
      to: email,
      subject: 'Vos documents de formation - BPM Formation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Bonjour ${firstName},</h2>
          <p>Veuillez trouver ci-joint vos documents de formation :</p>
          <ul>
            <li>Attestation d'inscription à une formation professionnelle</li>
            <li>Facture</li>
          </ul>
          <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
          <p>Cordialement,<br>L'équipe BPM Formation</p>
        </div>
      `,
      attachments: [
        {
          filename: `attestation-${firstName}-${new Date().getFullYear()}.pdf`,
          content: attestationBase64,
        },
        {
          filename: `facture-${firstName}-${new Date().getFullYear()}.pdf`,
          content: invoiceBase64,
        },
      ],
    })

    if (error) {
      console.error('Erreur envoi email Resend:', error)
      
      // Message d'erreur plus clair pour les domaines non vérifiés
      if (error.message?.includes('domain is not verified')) {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'BPM Formation <noreply@bpmformation.fr>'
        const domainMatch = fromEmail.match(/@([^\s>]+)/)
        const domain = domainMatch ? domainMatch[1] : 'votre domaine'
        
        throw new Error(
          `Le domaine ${domain} n'est pas encore vérifié dans Resend. ` +
          `Options :\n` +
          `1. Vérifiez votre domaine sur https://resend.com/domains\n` +
          `2. Ou utilisez temporairement le domaine de test : ` +
          `RESEND_FROM_EMAIL=BPM Formation <onboarding@resend.dev>`
        )
      }
      
      // Erreur spécifique pour le mode test Resend (onboarding@resend.dev)
      // En mode test, on ne peut envoyer qu'à l'email du compte Resend
      if (error.statusCode === 403 && error.message?.includes('You can only send testing emails')) {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'BPM Formation <noreply@bpmformation.fr>'
        if (fromEmail.includes('resend.dev')) {
          throw new Error(
            `⚠️ Mode test Resend activé : Vous ne pouvez envoyer des emails qu'à votre propre adresse (clouetmarvyn@gmail.com).\n\n` +
            `Pour envoyer à d'autres destinataires :\n` +
            `1. Vérifiez votre domaine bpmformation.fr sur https://resend.com/domains\n` +
            `2. Ajoutez les enregistrements DNS demandés par Resend\n` +
            `3. Changez RESEND_FROM_EMAIL dans .env.local vers : BPM Formation <noreply@bpmformation.fr>\n\n` +
            `En attendant, les documents peuvent être générés et téléchargés manuellement.`
          )
        }
      }
      
      throw new Error(`Erreur envoi email: ${error.message}`)
    }

    console.log('✅ Email envoyé avec succès via Resend:')
    console.log(`   - ID: ${data?.id}`)
    console.log(`   - À: ${email}`)
    console.log(`   - Vérifiez dans Resend Dashboard: https://resend.com/emails`)
    
    // Avertissement si le domaine n'est pas vérifié
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'BPM Formation <noreply@bpmformation.fr>'
    if (fromEmail.includes('resend.dev')) {
      console.warn('⚠️ Vous utilisez le domaine de test Resend. Les emails peuvent être filtrés.')
    }
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'email:', error)
    // Si Resend n'est pas installé, on log juste
    if (error.message?.includes('Cannot find module')) {
      console.warn('⚠️ Package "resend" non installé. Installez-le avec: npm install resend')
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Package "resend" non installé')
      }
    } else {
      throw error
    }
  }
}

export async function sendWhatsAppMessage(
  phone: string,
  firstName: string,
  attestationPDF: Buffer,
  invoicePDF: Buffer
): Promise<void> {
  // TODO: Implémenter l'envoi WhatsApp avec documents
  // Utiliser l'API WhatsApp Business ou un service comme Twilio
  
  console.log(`WhatsApp à envoyer à ${phone} pour ${firstName}`)
  console.log('Attestation et facture générées')
  
  // Pour l'instant, on peut utiliser wa.me avec un message
  // Mais l'envoi de fichiers nécessite l'API WhatsApp Business
}
