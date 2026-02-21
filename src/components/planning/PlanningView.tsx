'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import CalendarView from './CalendarView'
import AddSessionModal from './AddSessionModal'
import PlanningEntryModal from './PlanningEntryModal'

interface LeadOption {
  id: string
  first_name: string
  last_name: string
}

interface LeadInfo {
  first_name: string
  last_name: string
  phone?: string
  formation: string
  formation_format: string | null
  formation_day: string | null
}

interface PlanningEntry {
  id: string
  lead_id?: string
  lead_ids?: string[]
  start_date: string
  end_date: string
  specific_dates: string[] | null
  gcal_event_id?: string | null
  leads: LeadInfo[]
  _allIds?: string[]
}

interface PlanningViewProps {
  entries: PlanningEntry[]
  leads?: LeadOption[]
  onRefresh?: () => void
  isAdmin?: boolean
}

const formatLabels: Record<string, string> = {
  semaine: 'Semaine (lun.–ven.)',
  mensuelle: 'Mensuelle',
  bpm_fast: 'BPM Fast (2 jours)',
}

const dayLabels: Record<string, string> = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi',
  vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche',
}

export default function PlanningView({ entries, leads = [], onRefresh, isAdmin = false }: PlanningViewProps) {
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'sessions'>('calendar')
  const [showAddModal, setShowAddModal] = useState(false)
  const [entryForModal, setEntryForModal] = useState<PlanningEntry | null>(null)
  const formationLabels: Record<string, string> = {
    inge_son: 'Ingé son',
    beatmaking: 'Beatmaking',
    autre: 'Autre',
  }

  const handleDeleteFromList = async (entry: PlanningEntry) => {
    if (!confirm('Supprimer cette session du planning ?')) return
    const ids = entry._allIds?.length ? entry._allIds : [entry.id]
    try {
      for (const id of ids) {
        const res = await fetch(`/api/planning/${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          alert(d.error || 'Erreur')
          return
        }
      }
      onRefresh?.()
    } catch (e: any) {
      alert(e.message || 'Erreur')
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded text-sm sm:text-base transition ${
              viewMode === 'calendar'
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            📅 <span className="hidden sm:inline">Calendrier</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded text-sm sm:text-base transition ${
              viewMode === 'list'
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            📋 <span className="hidden sm:inline">Liste</span>
          </button>
          <button
            onClick={() => setViewMode('sessions')}
            className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded text-sm sm:text-base transition ${
              viewMode === 'sessions'
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            📚 <span className="hidden sm:inline">Sessions</span>
          </button>
        </div>
        {onRefresh && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded bg-green-500/20 text-green-300 hover:bg-green-500/30 font-medium text-sm sm:text-base whitespace-nowrap"
          >
            ➕ <span className="hidden sm:inline">Ajouter une session</span><span className="sm:hidden">Ajouter</span>
          </button>
        )}
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView entries={entries} leads={leads} onRefresh={onRefresh} isAdmin={isAdmin} />
      ) : viewMode === 'sessions' ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 min-w-0 sm:grid-cols-2 lg:grid-cols-3">
          {entries.length === 0 ? (
            <p className="col-span-full text-center text-white/50 py-8 sm:py-12 text-sm sm:text-base">Aucune session planifiée</p>
          ) : (
            entries.map((entry) => {
              const leadList = entry.leads || []
              const names = leadList.map(l => [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Inconnu')
              const formations = [...new Set(leadList.map(l => l.formation).filter(Boolean))].map(f => formationLabels[f] || f).join(', ')
              const formatStr = leadList[0]?.formation_format ? formatLabels[leadList[0].formation_format] || leadList[0].formation_format : '—'
              const dayStr = leadList[0]?.formation_day ? dayLabels[leadList[0].formation_day] || leadList[0].formation_day : '—'
              return (
                <div
                  key={entry.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col min-w-0"
                >
                  <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider mb-0.5 truncate">
                        {format(new Date(entry.start_date), 'dd MMM yyyy', { locale: fr })} → {format(new Date(entry.end_date), 'dd MMM yyyy', { locale: fr })}
                      </div>
                      <div className="font-semibold text-white">
                        {formations || '—'}
                      </div>
                    </div>
                    {entry.gcal_event_id ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded shrink-0">Sync</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/10 text-white/50 rounded shrink-0">Non sync</span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm flex-1">
                    <div>
                      <span className="text-white/50 text-xs block mb-0.5">Élèves ({leadList.length})</span>
                      <ul className="text-white">
                        {leadList.length === 0 ? (
                          <li className="text-white/40">Aucun participant</li>
                        ) : (
                          names.map((name, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
                              {name}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
                      <span>Format : {formatStr}</span>
                      {dayStr !== '—' && <span>Jour : {dayStr}</span>}
                    </div>
                    {entry.specific_dates && entry.specific_dates.length > 0 && (
                      <div className="text-xs text-white/50">
                        Dates : {entry.specific_dates.map(d => format(new Date(d), 'dd MMM', { locale: fr })).join(', ')}
                      </div>
                    )}
                  </div>
                  {onRefresh && (
                    <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-4 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setEntryForModal(entry)}
                        className="flex-1 min-w-0 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-xs sm:text-sm font-medium"
                      >
                        Tout modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFromList(entry)}
                        className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs sm:text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden min-w-0">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full min-w-[640px]">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white/70 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white/70 uppercase tracking-wider">
                    Formation
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white/70 uppercase tracking-wider">
                    Date début
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white/70 uppercase tracking-wider">
                    Date fin
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white/70 uppercase tracking-wider">
                    G. Cal
                  </th>
                  {onRefresh && (
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-white/70 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={onRefresh ? 6 : 5} className="px-3 sm:px-6 py-6 sm:py-8 text-center text-white/50 text-sm">
                      Aucun événement planifié
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const leadList = entry.leads || []
                    const names = leadList.map(l => [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Inconnu').join(', ')
                    const formations = [...new Set(leadList.map(l => l.formation).filter(Boolean))].map(f => formationLabels[f] || f).join(', ')
                    const hasParticipants = leadList.length > 0
                    return (
                      <tr key={entry.id} className="hover:bg-white/5">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-white max-w-[120px] sm:max-w-none truncate">
                            {hasParticipants ? names : '— Aucun participant'}
                          </div>
                          {leadList.length > 1 && (
                            <div className="text-[10px] sm:text-xs text-white/50">{leadList.length} participant(s)</div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-white/70">
                            {hasParticipants ? (formations || '—') : '—'}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-white/70">
                            {format(new Date(entry.start_date), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-white/70">
                            {format(new Date(entry.end_date), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          {entry.gcal_event_id ? (
                            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-500/20 text-green-300 rounded">
                              Sync
                            </span>
                          ) : (
                            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-yellow-500/20 text-yellow-300 rounded">
                              Non sync
                            </span>
                          )}
                        </td>
                        {onRefresh && (
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              <button
                                type="button"
                                onClick={() => setEntryForModal(entry)}
                                className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFromList(entry)}
                                className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30"
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddSessionModal
          leads={leads}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { onRefresh?.(); setShowAddModal(false) }}
        />
      )}

      {entryForModal && (
        <PlanningEntryModal
          entries={[entryForModal]}
          date={new Date(entryForModal.start_date)}
          onClose={() => setEntryForModal(null)}
          onRefresh={() => { onRefresh?.(); setEntryForModal(null) }}
          leads={leads}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}
