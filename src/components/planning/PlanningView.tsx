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
}

interface PlanningViewProps {
  entries: PlanningEntry[]
  leads?: LeadOption[]
  onRefresh?: () => void
}

export default function PlanningView({ entries, leads = [], onRefresh }: PlanningViewProps) {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [showAddModal, setShowAddModal] = useState(false)
  const [entryForModal, setEntryForModal] = useState<PlanningEntry | null>(null)
  const formationLabels: Record<string, string> = {
    inge_son: 'Ingé son',
    beatmaking: 'Beatmaking',
    autre: 'Autre',
  }

  const handleDeleteFromList = async (entry: PlanningEntry) => {
    if (!confirm('Supprimer cette session du planning ?')) return
    try {
      const res = await fetch(`/api/planning/${entry.id}`, { method: 'DELETE' })
      if (res.ok) onRefresh?.()
      else {
        const d = await res.json().catch(() => ({}))
        alert(d.error || 'Erreur')
      }
    } catch (e: any) {
      alert(e.message || 'Erreur')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded transition ${
              viewMode === 'calendar'
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            📅 Calendrier
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded transition ${
              viewMode === 'list'
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            📋 Liste
          </button>
        </div>
        {onRefresh && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded bg-green-500/20 text-green-300 hover:bg-green-500/30 font-medium"
          >
            ➕ Ajouter une session
          </button>
        )}
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView entries={entries} leads={leads} onRefresh={onRefresh} />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Formation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Date début
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Date fin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Google Calendar
                  </th>
                  {onRefresh && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={onRefresh ? 6 : 5} className="px-6 py-8 text-center text-white/50">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">
                            {hasParticipants ? names : '— Aucun participant'}
                          </div>
                          {leadList.length > 1 && (
                            <div className="text-xs text-white/50">{leadList.length} participant(s)</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white/70">
                            {hasParticipants ? (formations || '—') : '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white/70">
                            {format(new Date(entry.start_date), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white/70">
                            {format(new Date(entry.end_date), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {entry.gcal_event_id ? (
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded">
                              Synchronisé
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded">
                              Non synchronisé
                            </span>
                          )}
                        </td>
                        {onRefresh && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setEntryForModal(entry)}
                                className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFromList(entry)}
                                className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30"
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
        />
      )}
    </div>
  )
}
