// Utilitaires pour synchronisation Google Calendar
// À implémenter avec l'API Google Calendar

import { Lead } from '@/types'

export async function createCalendarEvent(
  lead: Lead,
  startDate: Date,
  endDate: Date,
  formation: string
): Promise<string | null> {
  // TODO: Implémenter la création d'événement Google Calendar
  // Utiliser googleapis ou une Edge Function Supabase
  
  const event = {
    summary: `Formation ${formation} - ${lead.first_name} ${lead.last_name}`,
    description: `Formation pour ${lead.first_name} ${lead.last_name}\nTéléphone: ${lead.phone}`,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'Europe/Paris',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'Europe/Paris',
    },
  }

  // Exemple avec googleapis (à configurer)
  // const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  // const response = await calendar.events.insert({
  //   calendarId: 'primary',
  //   requestBody: event,
  // })
  // return response.data.id || null

  console.log('Événement à créer:', event)
  return 'gcal-event-id-placeholder'
}

export async function updateCalendarEvent(
  eventId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  // TODO: Implémenter la mise à jour d'événement
  console.log('Événement à mettre à jour:', eventId)
}
