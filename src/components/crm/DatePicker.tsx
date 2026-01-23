'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

interface DatePickerProps {
  value: string | null
  onChange: (date: string | null) => void
  formationFormat?: 'mensuelle' | 'semaine' | null
  formationDay?: string | null
  placeholder?: string
}

export default function DatePicker({ value, onChange, formationFormat, formationDay, placeholder = 'Sélectionner une date' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const firstDayOfWeek = getDay(monthStart) === 0 ? 7 : getDay(monthStart)
  const daysBeforeMonth = firstDayOfWeek === 1 ? 0 : firstDayOfWeek - 1

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    onChange(dateStr)
    setIsOpen(false)
  }


  return (
    <div className="relative">
      {/* Bouton pour ouvrir le calendrier */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 sm:px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white hover:bg-white/10 transition text-left flex items-center justify-between text-xs sm:text-sm"
      >
        <span className={value ? 'text-white truncate flex-1' : 'text-white/50'}>
          {value ? format(new Date(value), 'dd MMM yyyy', { locale: fr }) : placeholder}
        </span>
        <span className="text-base sm:text-lg flex-shrink-0 ml-2">📅</span>
      </button>

      {/* Calendrier popup */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 sm:left-auto right-0 sm:right-auto mt-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4 z-50 shadow-2xl w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[320px] max-w-[320px] sm:max-w-none">
            {/* Navigation mois */}
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-white/10 transition text-white text-xs sm:text-sm"
              >
                ←
              </button>
              <h3 className="font-semibold text-white text-xs sm:text-sm">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </h3>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-white/10 transition text-white text-xs sm:text-sm"
              >
                →
              </button>
            </div>

            {/* Grille calendrier */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {/* En-têtes jours */}
              {weekDays.map(day => (
                <div key={day} className="text-[10px] sm:text-xs text-center text-white/60 font-semibold py-1 sm:py-2">
                  {day}
                </div>
              ))}

              {/* Jours avant le mois */}
              {Array.from({ length: daysBeforeMonth }).map((_, idx) => (
                <div key={`before-${idx}`} className="aspect-square" />
              ))}

              {/* Jours du mois */}
              {daysInMonth.map(day => {
                const isSelected = value && isSameDay(day, new Date(value))
                const isToday = isSameDay(day, new Date())

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    className={`aspect-square rounded-lg text-[10px] sm:text-xs lg:text-sm font-medium transition ${
                      isSelected
                        ? 'bg-white text-black font-bold shadow-lg'
                        : isToday
                        ? 'bg-blue-500/30 text-blue-300 border border-blue-400/30'
                        : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
