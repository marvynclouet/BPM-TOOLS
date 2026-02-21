'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import PlanningEntryModal from './PlanningEntryModal'

interface CalendarEntry {
  id: string
  start_date: string
  end_date: string
  specific_dates: string[] | null
  leads: Array<{
    first_name: string
    last_name: string
    phone?: string
    formation: string
    formation_format: string | null
    formation_day: string | null
  }>
}

interface LeadOption {
  id: string
  first_name: string
  last_name: string
}

interface CalendarViewProps {
  entries: CalendarEntry[]
  leads?: LeadOption[]
  onRefresh?: () => void
  isAdmin?: boolean
}

export default function CalendarView({ entries, leads = [], onRefresh, isAdmin = false }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEntries, setSelectedEntries] = useState<CalendarEntry[]>([])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Trouver le premier jour de la semaine (lundi = 1)
  const firstDayOfWeek = getDay(monthStart) === 0 ? 7 : getDay(monthStart) // Convertir dimanche de 0 à 7
  const daysBeforeMonth = firstDayOfWeek === 1 ? 0 : firstDayOfWeek - 1

  const formationLabels: Record<string, string> = {
    inge_son: '🎚️ Ingé son',
    beatmaking: '🎵 Beatmaking',
    autre: '📚 Autre',
  }

  const formatLabels: Record<string, string> = {
    semaine: '📅 Semaine',
    mensuelle: '🗓️ Mensuelle',
    bpm_fast: '⚡ BPM Fast',
  }

  // Fonction pour obtenir les couleurs selon le format
  const getFormatColors = (format: string | null) => {
    if (format === 'semaine') {
      return 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
    } else if (format === 'mensuelle') {
      return 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
    } else if (format === 'bpm_fast') {
      return 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
    }
    // Par défaut (si format non défini)
    return 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
  }

  const getFormatTextColor = (format: string | null) => {
    if (format === 'semaine') {
      return 'text-blue-200/70'
    } else if (format === 'mensuelle') {
      return 'text-orange-200/70'
    } else if (format === 'bpm_fast') {
      return 'text-yellow-200/70'
    }
    return 'text-purple-200/70'
  }

  const getEntriesForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    return entries.filter(entry => {
      // Si specific_dates existe (format mensuelle), vérifier si la date est dans la liste
      if (entry.specific_dates && entry.specific_dates.length > 0) {
        // Normaliser les dates pour la comparaison (enlever le timezone si présent)
        const normalizedDates = entry.specific_dates.map(d => {
          // Si la date contient un T (ISO avec time), prendre seulement la partie date
          return d.includes('T') ? d.split('T')[0] : d
        })
        return normalizedDates.includes(dateStr)
      }
      
      // Sinon (format semaine), vérifier si la date est entre start_date et end_date
      const startDate = new Date(entry.start_date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(entry.end_date)
      endDate.setHours(23, 59, 59, 999)
      const checkDate = new Date(date)
      checkDate.setHours(0, 0, 0, 0)
      return checkDate >= startDate && checkDate <= endDate
    })
  }

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex justify-between items-center gap-2">
        <button
          onClick={previousMonth}
          className="px-3 sm:px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition text-xs sm:text-sm"
        >
          ← <span className="hidden sm:inline">Mois précédent</span><span className="sm:hidden">Préc.</span>
        </button>
        <h2 className="text-lg sm:text-2xl font-bold text-center flex-1">
          {format(currentDate, 'MMMM yyyy', { locale: fr })}
        </h2>
        <button
          onClick={nextMonth}
          className="px-3 sm:px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition text-xs sm:text-sm"
        >
          <span className="hidden sm:inline">Mois suivant</span><span className="sm:hidden">Suiv.</span> →
        </button>
      </div>

      {/* Calendrier Desktop */}
      <div className="hidden lg:block bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        {/* En-têtes des jours */}
        <div className="grid grid-cols-7 border-b border-white/10">
          {weekDays.map(day => (
            <div key={day} className="px-4 py-3 text-center text-sm font-medium text-white/70 border-r border-white/10 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Grille du calendrier */}
        <div className="grid grid-cols-7">
          {/* Jours avant le mois */}
          {Array.from({ length: daysBeforeMonth }).map((_, index) => (
            <div key={`before-${index}`} className="min-h-[100px] border-r border-b border-white/10 bg-white/2" />
          ))}

          {/* Jours du mois */}
          {daysInMonth.map(day => {
            const dayEntries = getEntriesForDay(day)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] border-r border-b border-white/10 p-2 ${
                  isToday ? 'bg-blue-500/10' : 'bg-white/5'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-300' : 'text-white/70'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEntries.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => {
                        setSelectedDate(day)
                        setSelectedEntries(dayEntries)
                      }}
                      className={`w-full text-left text-xs rounded px-2 py-1 truncate transition cursor-pointer ${getFormatColors(entry.leads?.[0]?.formation_format || null)}`}
                      title={entry.leads?.map(l => `${l.first_name} ${l.last_name}`).join(', ')}
                    >
                      <div className="font-medium truncate">
                        {entry.leads?.[0]?.formation_format ? formatLabels[entry.leads[0].formation_format] : '📅'}
                      </div>
                      <div className={`${getFormatTextColor(entry.leads?.[0]?.formation_format || null)} text-[10px] truncate`}>
                        {entry.leads?.length ? (entry.leads.length > 1 ? `${entry.leads.length} participants` : (formationLabels[entry.leads[0].formation] || '')) : ''}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Jours après le mois pour compléter la grille */}
          {Array.from({ length: (7 - ((daysBeforeMonth + daysInMonth.length) % 7)) % 7 }).map((_, index) => (
            <div key={`after-${index}`} className="min-h-[100px] border-r border-b border-white/10 bg-white/2" />
          ))}
        </div>
      </div>

      {/* Vue mobile - Liste */}
      <div className="lg:hidden space-y-3">
        {daysInMonth.map(day => {
          const dayEntries = getEntriesForDay(day)
          const isToday = isSameDay(day, new Date())
          if (dayEntries.length === 0) return null

          return (
            <div
              key={day.toISOString()}
              className={`apple-card rounded-xl p-4 ${
                isToday ? 'border-2 border-blue-500/30' : ''
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className={`text-base font-semibold ${isToday ? 'text-blue-300' : 'text-white'}`}>
                  {format(day, 'EEEE d MMMM yyyy', { locale: fr })}
                </h3>
                {isToday && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
                    Aujourd'hui
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {dayEntries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => {
                      setSelectedDate(day)
                      setSelectedEntries(dayEntries)
                    }}
                    className={`w-full text-left rounded-lg px-3 py-2 transition ${getFormatColors(entry.leads?.[0]?.formation_format || null)}`}
                  >
                    <div className="font-medium text-sm">
                      {entry.leads?.[0]?.formation_format ? formatLabels[entry.leads[0].formation_format] : '📅'}
                    </div>
                    <div className={`${getFormatTextColor(entry.leads?.[0]?.formation_format || null)} text-xs mt-1`}>
                      {entry.leads?.length ? (entry.leads.length > 1 ? `${entry.leads.length} participants` : (formationLabels[entry.leads[0].formation] || '')) : ''}
                    </div>
                    {entry.leads?.length ? (
                      <div className="text-xs text-white/60 mt-1">
                        {entry.leads.map(l => `${l.first_name} ${l.last_name}`).join(', ')}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        {daysInMonth.every(day => getEntriesForDay(day).length === 0) && (
          <div className="apple-card rounded-xl p-8 text-center">
            <p className="text-white/50 font-light">Aucune formation planifiée ce mois</p>
          </div>
        )}
      </div>

      {/* Modal détails */}
      {selectedDate && (
        <PlanningEntryModal
          entries={selectedEntries}
          date={selectedDate}
          onClose={() => {
            setSelectedDate(null)
            setSelectedEntries([])
          }}
          onRefresh={onRefresh}
          leads={leads}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}
