import { createHash } from 'crypto'

const TIKTOK_EVENTS_API = 'https://business-api.tiktok.com/open_api/v1.3/event/track/'
const PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || 'D6D2HMBC77UAAN00794G'
const ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN

/** test_event_code pour afficher les événements dans l'onglet Test Events. Vide en prod. */
const TIKTOK_TEST_EVENT_CODE = process.env.TIKTOK_TEST_EVENT_CODE

function sha256(value: string): string {
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

export interface TikTokLeadEventPayload {
  leadId: string
  email: string | null
  phone: string
  formation: string
  ip?: string | null
  userAgent?: string | null
  pageUrl?: string
}

export async function sendTikTokLeadEvents(payload: TikTokLeadEventPayload): Promise<void> {
  if (!ACCESS_TOKEN || !PIXEL_ID) {
    console.warn('⚠️ TikTok Events API: TIKTOK_ACCESS_TOKEN ou pixel ID manquant')
    return
  }

  const { leadId, email, phone, formation, ip, userAgent, pageUrl } = payload
  const eventTime = Math.floor(Date.now() / 1000)

  const user: Record<string, string> = {}
  if (email) user.email = sha256(email)
  if (phone) user.phone = sha256(phone.replace(/\s/g, ''))
  if (ip) user.ip = ip
  if (userAgent) user.user_agent = userAgent

  const baseEvent: Record<string, unknown> = {
    event_time: eventTime,
    event_id: `lead_${leadId}_${Date.now()}`,
    user,
    page: pageUrl ? { url: pageUrl } : undefined,
    properties: { content_name: formation },
  }
  if (TIKTOK_TEST_EVENT_CODE) baseEvent.test_event_code = TIKTOK_TEST_EVENT_CODE

  const data = [
    { ...baseEvent, event: 'Lead', event_id: `lead_${leadId}_lead` },
    { ...baseEvent, event: 'CompleteRegistration', event_id: `lead_${leadId}_reg` },
  ]

  try {
    const res = await fetch(TIKTOK_EVENTS_API, {
      method: 'POST',
      headers: {
        'Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_source: 'web',
        event_source_id: PIXEL_ID,
        data,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      console.error('TikTok Events API erreur:', json)
    } else {
      console.log('TikTok Events API envoyé:', json)
    }
  } catch (err) {
    console.error('TikTok Events API erreur:', err)
  }
}
