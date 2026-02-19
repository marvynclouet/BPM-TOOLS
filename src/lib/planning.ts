/**
 * Calcule les dates de formation selon le format choisi
 */

export type FormationFormat = 'mensuelle' | 'semaine' | 'bpm_fast'
export type FormationDay = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche'

interface CalculateDatesResult {
  startDate: Date
  endDate: Date
}

/**
 * Calcule les dates de formation
 * @param format - Format de formation (mensuelle ou semaine)
 * @param day - Jour de la formation
 * @param startDate - Date de début choisie par le closer
 */
export function calculateFormationDates(
  format: FormationFormat,
  day: FormationDay,
  startDate: Date
): CalculateDatesResult {
  const result: CalculateDatesResult = {
    startDate: new Date(),
    endDate: new Date(),
  }

  if (format === 'semaine') {
    // Semaine = du lundi au vendredi de la semaine de la date choisie (5 jours)
    const selectedDate = new Date(startDate)
    const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay() // Convertir dimanche de 0 à 7
    
    // Trouver le lundi de cette semaine
    const daysToMonday = dayOfWeek === 1 ? 0 : 1 - dayOfWeek
    const monday = new Date(selectedDate)
    monday.setDate(selectedDate.getDate() + daysToMonday)
    monday.setHours(9, 0, 0, 0) // 9h du matin

    // Vérifier que c'est bien un lundi (1)
    if (monday.getDay() !== 1) {
      // Ajuster pour être sûr d'avoir un lundi
      const currentDay = monday.getDay() === 0 ? 7 : monday.getDay()
      const correction = 1 - currentDay
      monday.setDate(monday.getDate() + correction)
    }

    // Vendredi = lundi + 4 jours (lundi=jour 1, mardi=2, mercredi=3, jeudi=4, vendredi=5)
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4) // +4 jours depuis lundi = vendredi
    friday.setHours(17, 0, 0, 0) // 17h

    // Vérification finale : s'assurer que c'est bien un vendredi (5)
    if (friday.getDay() !== 5) {
      // Si ce n'est pas vendredi, corriger
      const currentDay = friday.getDay()
      const correction = 5 - currentDay
      friday.setDate(friday.getDate() + correction)
    }

    result.startDate = monday
    result.endDate = friday
  } else if (format === 'mensuelle') {
    // Mensuelle = 4 samedis ou dimanches à partir du jour choisi (peuvent dépasser sur le mois suivant)
    if (day !== 'samedi' && day !== 'dimanche') {
      throw new Error('Jour invalide pour le format mensuelle (doit être samedi ou dimanche)')
    }

    const targetDay = day === 'samedi' ? 6 : 0
    const dates: Date[] = []
    const cursor = new Date(startDate)
    cursor.setHours(12, 0, 0, 0)

    // Trouver le prochain samedi/dimanche à partir de la date (inclus)
    while (cursor.getDay() !== targetDay) {
      cursor.setDate(cursor.getDate() + 1)
    }

    // Collecter les 4 prochaines occurrences (peuvent chevaucher le mois suivant)
    for (let i = 0; i < 4; i++) {
      dates.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 7)
    }

    const firstDate = dates[0]
    firstDate.setHours(9, 0, 0, 0)
    const lastDate = dates[3]
    lastDate.setHours(17, 0, 0, 0)

    result.startDate = firstDate
    result.endDate = lastDate
  } else if (format === 'bpm_fast') {
    // BPM Fast = 2 jours consécutifs à partir de la date choisie
    const selectedDate = new Date(startDate)
    selectedDate.setHours(9, 0, 0, 0) // 9h du matin le premier jour
    
    const secondDate = new Date(selectedDate)
    secondDate.setDate(selectedDate.getDate() + 1) // Jour suivant
    secondDate.setHours(17, 0, 0, 0) // 17h le deuxième jour

    result.startDate = selectedDate
    result.endDate = secondDate
  }

  return result
}
