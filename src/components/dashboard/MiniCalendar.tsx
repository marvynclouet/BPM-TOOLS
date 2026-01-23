'use client'

import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, getDay } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import Link from 'next/link'

interface MiniCalendarEntry {
  start_date: string
  end_date: string
  specific_dates: string[] | null
  leads: {
    first_name: string
    last_name: string
    formation: string
    formation_format: string | null
  } | null
}

interface MiniCalendarProps {
  entries: MiniCalendarEntry[]
}

export default function MiniCalendar({ entries }: MiniCalendarProps) {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Lundi
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const formationLabels: Record<string, string> = {
    inge_son: '🎚️',
    beatmaking: '🎵',
    autre: '📚',
  }

  const formatLabels: Record<string, string> = {
    semaine: '📅',
    mensuelle: '🗓️',
    bpm_fast: '⚡',
  }

  // Fonction pour obtenir les couleurs selon le format
  const getFormatColors = (format: string | null) => {
    if (format === 'semaine') {
      return 'bg-blue-500/20 text-blue-300'
    } else if (format === 'mensuelle') {
      return 'bg-orange-500/20 text-orange-300'
    } else if (format === 'bpm_fast') {
      return 'bg-yellow-500/20 text-yellow-300'
    }
    // Par défaut (si format non défini)
    return 'bg-purple-500/20 text-purple-300'
  }

  const getEntriesForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return entries.filter(entry => {
      if (entry.specific_dates && entry.specific_dates.length > 0) {
        const normalizedDates = entry.specific_dates.map(d => d.includes('T') ? d.split('T')[0] : d)
        return normalizedDates.includes(dateStr)
      }
      const startDate = new Date(entry.start_date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(entry.end_date)
      endDate.setHours(23, 59, 59, 999)
      const checkDate = new Date(date)
      checkDate.setHours(0, 0, 0, 0)
      return checkDate >= startDate && checkDate <= endDate
    })
  }

  const weekDayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div className="apple-card rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold text-white tracking-tight">Planning cette semaine</h3>
        <Link
          href="/dashboard/planning"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
        >
          Voir tout →
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-3">
        {weekDayNames.map((dayName, idx) => {
          const day = weekDays[idx]
          const dayEntries = getEntriesForDay(day)
          const isToday = isSameDay(day, today)

          return (
            <div
              key={idx}
              className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-all ${
                isToday
                  ? 'apple-card bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'apple-card-hover'
              }`}
            >
              <div className={`text-[10px] sm:text-xs font-medium mb-1 sm:mb-2 tracking-wide ${isToday ? 'text-blue-300' : 'text-white/50'}`}>
                {dayName}
              </div>
              <div className={`text-base font-semibold mb-2 ${isToday ? 'text-blue-300' : 'text-white'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1.5">
                {dayEntries.slice(0, 2).map((entry, entryIdx) => (
                  <div
                    key={entryIdx}
                    className={`text-xs rounded-lg px-2 py-1 truncate font-medium ${getFormatColors(entry.leads?.formation_format || null)}`}
                    title={`${entry.leads?.first_name} ${entry.leads?.last_name}`}
                  >
                    {entry.leads?.formation_format ? formatLabels[entry.leads.formation_format] : '📅'}{' '}
                    {entry.leads?.formation ? formationLabels[entry.leads.formation] : ''}
                  </div>
                ))}
                {dayEntries.length > 2 && (
                  <div className="text-xs text-white/40 font-light">+{dayEntries.length - 2}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
