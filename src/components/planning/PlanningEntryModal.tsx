'use client'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

interface PlanningEntry {
  id: string
  start_date: string
  end_date: string
  specific_dates: string[] | null
  leads: {
    first_name: string
    last_name: string
    phone: string
    formation: string
    formation_format: string | null
    formation_day: string | null
  } | null
}

interface PlanningEntryModalProps {
  entries: PlanningEntry[]
  date: Date
  onClose: () => void
}

export default function PlanningEntryModal({ entries, date, onClose }: PlanningEntryModalProps) {
  const formationLabels: Record<string, string> = {
    inge_son: 'Ingé son',
    beatmaking: 'Beatmaking',
    autre: 'Autre',
  }

  const formatLabels: Record<string, string> = {
    semaine: 'Semaine',
    mensuelle: 'Mensuelle',
    bpm_fast: '⚡ BPM Fast',
  }

  const dayLabels: Record<string, string> = {
    lundi: 'Lundi',
    mardi: 'Mardi',
    mercredi: 'Mercredi',
    jeudi: 'Jeudi',
    vendredi: 'Vendredi',
    samedi: 'Samedi',
    dimanche: 'Dimanche',
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white/10 border border-white/20 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            📅 {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="text-white/50 text-center py-8">Aucune formation planifiée ce jour</p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {entry.leads?.first_name} {entry.leads?.last_name}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-sm font-medium">
                        {entry.leads?.formation ? formationLabels[entry.leads.formation] : 'Formation'}
                      </span>
                      {entry.leads?.formation_format && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                          {formatLabels[entry.leads.formation_format]}
                        </span>
                      )}
                      {entry.leads?.formation_day && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                          {dayLabels[entry.leads.formation_day]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">📞</span>
                    <span>{entry.leads?.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">📅</span>
                    <span>
                      Du {format(new Date(entry.start_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">⏰</span>
                    <span>
                      Au {format(new Date(entry.end_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                  {entry.specific_dates && entry.specific_dates.length > 0 && (
                    <div className="flex items-start gap-2 mt-3">
                      <span className="font-medium">📋</span>
                      <div>
                        <span className="text-xs text-white/50 block mb-1">Dates spécifiques ({entry.leads?.formation_day || 'N/A'}) :</span>
                        <div className="flex flex-wrap gap-1">
                          {entry.specific_dates.map((d, idx) => {
                            const date = new Date(d)
                            const dayName = format(date, 'EEEE', { locale: fr })
                            const isCorrectDay = (entry.leads?.formation_day === 'samedi' && dayName.toLowerCase() === 'samedi') ||
                                                 (entry.leads?.formation_day === 'dimanche' && dayName.toLowerCase() === 'dimanche')
                            return (
                              <span
                                key={idx}
                                className={`text-xs px-2 py-1 rounded ${
                                  isCorrectDay ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                                }`}
                                title={`${dayName} - ${isCorrectDay ? 'Correct' : 'ERREUR: devrait être ' + entry.leads?.formation_day}`}
                              >
                                {format(date, 'dd MMM', { locale: fr })} ({dayName.slice(0, 3)})
                              </span>
                            )
                          })}
                        </div>
                        {entry.leads?.formation_day && (
                          <p className="text-xs text-white/40 mt-1">
                            Jour attendu: {entry.leads.formation_day.charAt(0).toUpperCase() + entry.leads.formation_day.slice(1)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
