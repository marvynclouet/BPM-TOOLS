'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

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
  leads: LeadInfo[]
  _allIds?: string[]
}

interface LeadOption {
  id: string
  first_name: string
  last_name: string
}

interface PlanningEntryModalProps {
  entries: PlanningEntry[]
  date: Date
  onClose: () => void
  onRefresh?: () => void
  leads?: LeadOption[]
}

export default function PlanningEntryModal({ entries, date, onClose, onRefresh, leads = [] }: PlanningEntryModalProps) {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editLeadIds, setEditLeadIds] = useState<string[]>([])
  const [editFormation, setEditFormation] = useState('')
  const [editFormat, setEditFormat] = useState('')
  const [editDay, setEditDay] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4" onClick={onClose}>
      <div 
        className="bg-white/10 border border-white/20 rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white pr-2 truncate">
            📅 {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl sm:text-3xl flex-shrink-0"
          >
            ×
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="text-white/50 text-center py-6 sm:py-8 text-sm sm:text-base">Aucune formation planifiée ce jour</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4"
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                      {entry.leads?.length ? entry.leads.map(l => `${l.first_name} ${l.last_name}`).join(', ') : '—'}
                    </h3>
                    {entry.leads?.length ? (
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs sm:text-sm font-medium">
                          {[...new Set(entry.leads.map(l => l.formation).filter(Boolean))].map(f => formationLabels[f] || f).join(', ') || 'Formation'}
                        </span>
                        {(entry.leads[0]?.formation_format) && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-[10px] sm:text-xs">
                            {formatLabels[entry.leads[0].formation_format!]}
                          </span>
                        )}
                        {(entry.leads[0]?.formation_day) && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-[10px] sm:text-xs">
                            {dayLabels[entry.leads[0].formation_day!]}
                          </span>
                        )}
                        {entry.leads.length > 1 && (
                          <span className="text-white/50 text-xs">{entry.leads.length} participants</span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-white/70">
                  {entry.leads?.map((lead, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="font-medium flex-shrink-0">📞</span>
                      <span className="truncate">{lead.first_name} {lead.last_name}: {lead.phone}</span>
                    </div>
                  ))}
                  <div className="flex items-start gap-2">
                    <span className="font-medium flex-shrink-0">📅</span>
                    <span className="break-words">
                      Du {format(new Date(entry.start_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium flex-shrink-0">⏰</span>
                    <span className="break-words">
                      Au {format(new Date(entry.end_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                  {entry.specific_dates && entry.specific_dates.length > 0 && (
                    <div className="flex items-start gap-2 mt-3">
                      <span className="font-medium">📋</span>
                      <div>
                        <span className="text-xs text-white/50 block mb-1">Dates spécifiques ({entry.leads?.[0]?.formation_day || 'N/A'}) :</span>
                        <div className="flex flex-wrap gap-1">
                          {entry.specific_dates.map((d, idx) => {
                            const date = new Date(d)
                            const dayName = format(date, 'EEEE', { locale: fr })
                            const expectedDay = entry.leads?.[0]?.formation_day
                            const isCorrectDay = expectedDay && dayName.toLowerCase() === expectedDay.toLowerCase()
                            return (
                              <span
                                key={idx}
                                className={`text-xs px-2 py-1 rounded ${
                                  isCorrectDay ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                                }`}
                                title={dayName}
                              >
                                {format(date, 'dd MMM', { locale: fr })} ({dayName.slice(0, 3)})
                              </span>
                            )
                          })}
                        </div>
                        {entry.leads?.[0]?.formation_day && (
                          <p className="text-xs text-white/40 mt-1">
                            Jour attendu: {entry.leads[0].formation_day.charAt(0).toUpperCase() + entry.leads[0].formation_day.slice(1)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {onRefresh && (
                    <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
                      {editingEntryId === entry.id ? (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {leads.length > 0 && (
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-white/70 mb-1">Participants – ajouter ou retirer des élèves</label>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white/5 rounded">
                                  {leads.map((l) => (
                                    <label key={l.id} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={editLeadIds.includes(l.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) setEditLeadIds(prev => [...prev, l.id])
                                          else setEditLeadIds(prev => prev.filter(id => id !== l.id))
                                        }}
                                        className="rounded border-white/30"
                                      />
                                      <span className="text-white text-xs">{l.first_name} {l.last_name}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-medium text-white/70 mb-1">Formation</label>
                              <select
                                value={editFormation}
                                onChange={(e) => setEditFormation(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                              >
                                <option value="inge_son">Ingé son</option>
                                <option value="beatmaking">Beatmaking</option>
                                <option value="autre">Autre</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white/70 mb-1">Format</label>
                              <select
                                value={editFormat}
                                onChange={(e) => { setEditFormat(e.target.value); setEditDay('') }}
                                className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                              >
                                <option value="">—</option>
                                <option value="semaine">Semaine</option>
                                <option value="mensuelle">Mensuelle</option>
                                <option value="bpm_fast">BPM Fast</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white/70 mb-1">Jour</label>
                              <select
                                value={editDay}
                                onChange={(e) => setEditDay(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                              >
                                <option value="">—</option>
                                {editFormat === 'semaine' && (
                                  <>
                                    <option value="lundi">Lundi</option>
                                    <option value="mardi">Mardi</option>
                                    <option value="mercredi">Mercredi</option>
                                    <option value="jeudi">Jeudi</option>
                                    <option value="vendredi">Vendredi</option>
                                  </>
                                )}
                                {(editFormat === 'mensuelle' || editFormat === 'bpm_fast') && (
                                  <>
                                    <option value="lundi">Lundi</option>
                                    <option value="mardi">Mardi</option>
                                    <option value="mercredi">Mercredi</option>
                                    <option value="jeudi">Jeudi</option>
                                    <option value="vendredi">Vendredi</option>
                                    <option value="samedi">Samedi</option>
                                    <option value="dimanche">Dimanche</option>
                                  </>
                                )}
                                {!editFormat && (
                                  <>
                                    <option value="lundi">Lundi</option>
                                    <option value="mardi">Mardi</option>
                                    <option value="mercredi">Mercredi</option>
                                    <option value="jeudi">Jeudi</option>
                                    <option value="vendredi">Vendredi</option>
                                    <option value="samedi">Samedi</option>
                                    <option value="dimanche">Dimanche</option>
                                  </>
                                )}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-white/70 mb-1">Début → Fin</label>
                              <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center">
                                <input
                                  type="datetime-local"
                                  value={editStart}
                                  onChange={(e) => setEditStart(e.target.value)}
                                  className="w-full sm:flex-1 min-w-0 sm:min-w-[160px] px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                                />
                                <span className="text-white/50 hidden sm:inline">→</span>
                                <input
                                  type="datetime-local"
                                  value={editEnd}
                                  onChange={(e) => setEditEnd(e.target.value)}
                                  className="w-full sm:flex-1 min-w-0 sm:min-w-[160px] px-2 py-1.5 bg-white/10 border border-white/20 rounded text-white text-xs"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={saving || !editStart || !editEnd}
                              onClick={async () => {
                                if (!editStart || !editEnd) return
                                const selectedIds = leads.length > 0 ? editLeadIds : (entry.lead_ids?.length ? entry.lead_ids : (entry.lead_id ? [entry.lead_id] : []))
                                if (leads.length > 0 && selectedIds.length === 0) {
                                  alert('Choisissez au moins un participant')
                                  return
                                }
                                setSaving(true)
                                try {
                                  if (selectedIds.length === 1 && (editFormation || editFormat || editDay !== undefined)) {
                                    const leadPayload: Record<string, unknown> = {}
                                    if (editFormation) leadPayload.formation = editFormation
                                    if (editFormat !== undefined) leadPayload.formation_format = editFormat || null
                                    if (editDay !== undefined) leadPayload.formation_day = editDay || null
                                    if (Object.keys(leadPayload).length > 0) {
                                      const rLead = await fetch(`/api/leads/${selectedIds[0]}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(leadPayload),
                                      })
                                      if (!rLead.ok) {
                                        const d = await rLead.json().catch(() => ({}))
                                        throw new Error(d.error || 'Erreur lead')
                                      }
                                    }
                                  }
                                  const planningPayload: { lead_ids?: string[]; start_date: string; end_date: string } = {
                                    start_date: new Date(editStart).toISOString(),
                                    end_date: new Date(editEnd).toISOString(),
                                  }
                                  if (leads.length > 0 && selectedIds.length > 0) planningPayload.lead_ids = selectedIds
                                  const res = await fetch(`/api/planning/${entry.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(planningPayload),
                                  })
                                  if (res.ok) {
                                    const otherIds = (entry._allIds || []).filter((id) => id !== entry.id)
                                    for (const id of otherIds) {
                                      await fetch(`/api/planning/${id}`, { method: 'DELETE' })
                                    }
                                    setEditingEntryId(null)
                                    onRefresh()
                                  } else {
                                    const d = await res.json().catch(() => ({}))
                                    alert(d.error || 'Erreur')
                                  }
                                } catch (err: any) {
                                  alert(err.message || 'Erreur')
                                } finally {
                                  setSaving(false)
                                }
                              }}
                              className="px-3 py-1.5 rounded bg-green-500/20 text-green-300 text-xs font-medium disabled:opacity-50"
                            >
                              Enregistrer
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingEntryId(null)}
                              className="px-3 py-1.5 rounded bg-white/10 text-white text-xs"
                            >
                              Annuler
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEntryId(entry.id)
                              const currentIds = entry.lead_ids?.length ? entry.lead_ids : (entry.lead_id ? [entry.lead_id] : [])
                              setEditLeadIds(currentIds.length ? currentIds : (leads[0] ? [leads[0].id] : []))
                              setEditFormation(entry.leads?.[0]?.formation || 'beatmaking')
                              let formatVal = entry.leads?.[0]?.formation_format || ''
                              let dayVal = entry.leads?.[0]?.formation_day || ''
                              if (!formatVal || !dayVal) {
                                const s = new Date(entry.start_date)
                                const e = new Date(entry.end_date)
                                const daysDiff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
                                if (entry.specific_dates && entry.specific_dates.length >= 4) {
                                  formatVal = 'mensuelle'
                                  const firstSpec = new Date(entry.specific_dates[0] + 'T12:00:00')
                                  const dayNames = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']
                                  dayVal = dayNames[firstSpec.getDay()]
                                } else if (daysDiff >= 4 && daysDiff <= 5) {
                                  formatVal = 'semaine'
                                  dayVal = 'lundi'
                                } else if (daysDiff <= 2) {
                                  formatVal = 'bpm_fast'
                                  const dayNames = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']
                                  dayVal = dayNames[s.getDay()]
                                }
                              }
                              setEditFormat(formatVal)
                              setEditDay(dayVal)
                              const s = new Date(entry.start_date)
                              const e = new Date(entry.end_date)
                              setEditStart(format(s, "yyyy-MM-dd'T'HH:mm"))
                              setEditEnd(format(e, "yyyy-MM-dd'T'HH:mm"))
                            }}
                            className="px-3 py-1.5 rounded bg-blue-500/20 text-blue-300 text-xs font-medium"
                          >
                            {leads.length > 0 ? 'Tout modifier' : 'Modifier les dates'}
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === entry.id}
                            onClick={async () => {
                              if (!confirm('Supprimer cette session du planning ?')) return
                              setDeletingId(entry.id)
                              try {
                                const res = await fetch(`/api/planning/${entry.id}`, { method: 'DELETE' })
                                if (res.ok) {
                                  onRefresh()
                                  onClose()
                                } else {
                                  const d = await res.json().catch(() => ({}))
                                  alert(d.error || 'Erreur')
                                }
                              } finally {
                                setDeletingId(null)
                              }
                            }}
                            className="px-3 py-1.5 rounded bg-red-500/20 text-red-300 text-xs font-medium disabled:opacity-50"
                          >
                            {deletingId === entry.id ? 'Suppression…' : 'Supprimer'}
                          </button>
                        </div>
                      )}
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
