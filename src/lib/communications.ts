// Utilitaires pour l'envoi d'emails et WhatsApp

/** Envoie un email HTML simple (rapports IA, rappels, etc.) */
export async function sendSimpleEmail(options: {
  to: string | string[]
  subject: string
  html: string
}): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.warn('⚠️ RESEND_API_KEY non configuré - email non envoyé')
    return { success: false, error: 'RESEND_API_KEY non configuré' }
  }

  const toList = Array.isArray(options.to) ? options.to : [options.to]
  const toTrimmed = toList.map((e) => e.trim()).filter(Boolean)
  if (toTrimmed.length === 0) {
    return { success: false, error: 'Aucun destinataire' }
  }

  try {
    const { Resend } = require('resend')
    const resend = new Resend(resendApiKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'BPM Formation <noreply@bpmformation.fr>'

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: toTrimmed,
      subject: options.subject,
      html: options.html,
    })

    if (error) {
      console.error('Erreur Resend sendSimpleEmail:', error)
      return { success: false, error: error.message }
    }
    console.log('✅ Email envoyé:', options.subject, '→', toTrimmed.join(', '))
    return { success: true }
  } catch (err: any) {
    console.error('sendSimpleEmail:', err)
    return { success: false, error: err?.message }
  }
}

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
    // @ts-ignore - require nécessaire pour resend
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

/** Envoie un email de notification quand un nouveau lead remplit le formulaire */
export async function sendNewLeadNotification(lead: {
  first_name: string
  last_name: string
  phone: string
  email: string | null
  formation: string
  source: string
}): Promise<void> {
  const toEmails = process.env.LEAD_NOTIFICATION_EMAIL
  if (!toEmails?.trim()) {
    console.log('📧 LEAD_NOTIFICATION_EMAIL non configuré - notification lead non envoyée')
    return
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.warn('⚠️ RESEND_API_KEY non configuré - notification lead non envoyée')
    return
  }

  const formationLabels: Record<string, string> = {
    inge_son: 'Ingé son',
    beatmaking: 'Beatmaking',
    autre: 'Autre / Je ne sais pas encore',
  }
  const formationLabel = formationLabels[lead.formation] || lead.formation
  const sourceLabel = lead.source === 'direct' ? 'Direct' : lead.source

  try {
    // @ts-ignore - require nécessaire pour resend
    const { Resend } = require('resend')
    const resend = new Resend(resendApiKey)
    const toList = toEmails.split(',').map((e) => e.trim()).filter(Boolean)

    console.log('📧 Envoi notification lead à', toList.join(', '))
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'BPM Formation <noreply@bpmformation.fr>'

    const { data: sendData, error } = await resend.emails.send({
      from: fromEmail,
      to: toList,
      subject: `🆕 Nouveau lead : ${lead.first_name} ${lead.last_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
          <h2 style="color: #111;">Nouveau lead reçu</h2>
          <p>Quelqu'un a rempli le formulaire d'inscription.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Nom</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${lead.last_name}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Prénom</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${lead.first_name}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Téléphone</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${lead.phone}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${lead.email || 'Non renseigné'}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Formation</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formationLabel}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Source</strong></td><td style="padding: 8px 0;">${sourceLabel}</td></tr>
          </table>
          <p style="color: #666; font-size: 14px;">BPM Tools – notification automatique</p>
        </div>
      `,
    })

    if (error) {
      console.error('❌ Erreur Resend notification lead:', error.message || error)
      if (error.message?.includes('domain is not verified')) {
        console.warn('💡 Vérifiez votre domaine sur https://resend.com/domains')
      }
      if (error.statusCode === 403 && error.message?.includes('You can only send testing emails')) {
        console.warn(
          '💡 Resend en mode test : vous ne pouvez envoyer qu’à l’email de votre compte Resend. ' +
          'Vérifiez le domaine bpmformation.fr sur https://resend.com/domains pour envoyer à bpmformation2025@gmail.com'
        )
      }
      return
    }
    console.log('✅ Notification nouveau lead envoyée à', toList.join(', '), '- ID:', sendData?.id)
  } catch (err: any) {
    console.error('❌ Erreur sendNewLeadNotification:', err?.message || err)
    // Ne pas faire échouer la création du lead si l'email échoue
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
