'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import CalendarView from './CalendarView'

interface PlanningViewProps {
  entries: any[] // TODO: typer correctement
}

export default function PlanningView({ entries }: PlanningViewProps) {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const formationLabels: Record<string, string> = {
    inge_son: 'Ingé son',
    beatmaking: 'Beatmaking',
    autre: 'Autre',
  }

  return (
    <div className="space-y-4">
      {/* Toggle vue */}
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

      {viewMode === 'calendar' ? (
        <CalendarView entries={entries} />
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
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-white/50">
                  Aucun événement planifié
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const lead = entry.leads

                return (
                  <tr key={entry.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {lead?.first_name} {lead?.last_name}
                      </div>
                      <div className="text-xs text-white/50">{lead?.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white/70">
                        {lead?.formation ? formationLabels[lead.formation] : '-'}
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
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
        </div>
      )}
    </div>
  )
}
