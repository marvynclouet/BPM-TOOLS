// Utilitaires pour l'intégration WhatsApp Business API

interface WhatsAppGroupData {
  subject: string
  description?: string
  phoneNumbers: string[]
}

interface WhatsAppMessageData {
  to: string
  message: string
  type?: 'text' | 'template'
}

/**
 * Crée un groupe WhatsApp via l'API WhatsApp Business Cloud API
 * Nécessite: WHATSAPP_ACCESS_TOKEN et WHATSAPP_PHONE_NUMBER_ID configurés
 */
export async function createWhatsAppGroup(data: WhatsAppGroupData): Promise<{ groupId: string; inviteLink: string } | null> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!accessToken || !phoneNumberId) {
    console.log('⚠️ WhatsApp API non configurée - utilisation du mode manuel')
    return null
  }

  try {
    // Créer le groupe via l'API WhatsApp Cloud API
    // Endpoint: POST /{phone-number-id}/groups
    const createGroupResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/groups`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          subject: data.subject.substring(0, 128), // Max 128 caractères
          description: data.description ? data.description.substring(0, 2048) : '', // Max 2048 caractères
          join_approval_mode: 'auto_approve',
        }),
      }
    )

    if (!createGroupResponse.ok) {
      const error = await createGroupResponse.json()
      console.error('Erreur création groupe WhatsApp:', error)
      // Si l'API n'est pas disponible ou échoue, retourner null pour utiliser le mode manuel
      return null
    }

    const groupData = await createGroupResponse.json()
    const groupId = groupData.id

    // Récupérer le lien d'invitation du groupe créé
    // L'API génère automatiquement un lien d'invitation lors de la création
    // On peut le récupérer via l'endpoint GET /{group-id}
    let inviteLink = ''
    
    try {
      // Essayer de récupérer les infos du groupe (le lien peut être dans les métadonnées)
      const groupInfoResponse = await fetch(
        `https://graph.facebook.com/v18.0/${groupId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (groupInfoResponse.ok) {
        const groupInfo = await groupInfoResponse.json()
        inviteLink = groupInfo.invite_link || groupInfo.link || ''
      }
    } catch (error) {
      console.error('Erreur récupération infos groupe:', error)
    }

    // Si pas de lien trouvé, générer un lien basé sur le groupId
    // Note: Ce lien peut ne pas fonctionner directement, il faudra le récupérer depuis WhatsApp Business Manager
    if (!inviteLink) {
      inviteLink = `https://chat.whatsapp.com/invite/${groupId}`
    }

    // Envoyer le lien d'invitation aux participants via message
    for (const phone of data.phoneNumbers) {
      await sendWhatsAppTemplateMessage({
        to: phone,
        message: `Bonjour ! Vous êtes invité à rejoindre le groupe WhatsApp pour votre formation.\n\nLien d'invitation: ${inviteLink}`,
        type: 'text',
      })
    }

    return { groupId, inviteLink }
  } catch (error: any) {
    console.error('Erreur création groupe WhatsApp:', error)
    return null
  }
}

/**
 * Envoie un message WhatsApp via l'API
 */
export async function sendWhatsAppTemplateMessage(data: WhatsAppMessageData): Promise<boolean> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!accessToken || !phoneNumberId) {
    return false
  }

  try {
    // Normaliser le numéro de téléphone (format international)
    const normalizedPhone = normalizePhoneNumber(data.to)

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'text',
          text: {
            body: data.message,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Erreur envoi message WhatsApp:', error)
      return false
    }

    return true
  } catch (error: any) {
    console.error('Erreur envoi message WhatsApp:', error)
    return false
  }
}

/**
 * Normalise un numéro de téléphone au format international
 */
function normalizePhoneNumber(phone: string): string {
  // Enlever tous les espaces et caractères spéciaux
  let normalized = phone.replace(/\s/g, '').replace(/[^\d+]/g, '')
  
  // Si commence par 0, remplacer par +33 (France)
  if (normalized.startsWith('0')) {
    normalized = '+33' + normalized.substring(1)
  }
  
  // Si ne commence pas par +, ajouter +33
  if (!normalized.startsWith('+')) {
    normalized = '+33' + normalized
  }
  
  return normalized
}

/**
 * Génère un lien wa.me pour créer un groupe manuellement
 * Format: wa.me/?text=message avec instructions
 */
export function generateManualWhatsAppGroupLink(phone: string, message: string): string {
  const normalizedPhone = normalizePhoneNumber(phone).replace('+', '')
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`
}
