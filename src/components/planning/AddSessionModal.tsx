'use client'

import { useState } from 'react'
import { calculateFormationDates } from '@/lib/planning'
import type { FormationFormat, FormationDay } from '@/lib/planning'

function todayYYYYMMDD(): string {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

interface LeadOption {
  id: string
  first_name: string
  last_name: string
}

interface AddSessionModalProps {
  leads: LeadOption[]
  onClose: () => void
  onSuccess: () => void
}

export default function AddSessionModal({ leads, onClose, onSuccess }: AddSessionModalProps) {
  const [leadIds, setLeadIds] = useState<string[]>([])
  const [formation, setFormation] = useState<string>('beatmaking')
  const [format, setFormat] = useState<FormationFormat>('semaine')
  const [day, setDay] = useState<FormationDay | ''>('')
  const [dateRef, setDateRef] = useState(() => todayYYYYMMDD()) // date de référence : défaut = aujourd'hui
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const getSpecificDates = (): string[] | null => {
    if (!dateRef) return null
    const d = new Date(dateRef + 'T12:00:00')
    if (format === 'bpm_fast') {
      const d2 = new Date(d)
      d2.setDate(d.getDate() + 1)
      return [
        d.toISOString().split('T')[0],
        d2.toISOString().split('T')[0],
      ]
    }
    if (format === 'mensuelle' && (day === 'samedi' || day === 'dimanche')) {
      const targetDay = day === 'samedi' ? 6 : 0
      const cursor = new Date(d)
      cursor.setHours(12, 0, 0, 0)
      while (cursor.getDay() !== targetDay) {
        cursor.setDate(cursor.getDate() + 1)
      }
      const dates: string[] = []
      for (let i = 0; i < 4; i++) {
        dates.push(cursor.toISOString().split('T')[0])
        cursor.setDate(cursor.getDate() + 7)
      }
      return dates
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (leadIds.length === 0) {
      setError('Choisissez au moins un participant')
      return
    }
    if (!dateRef) {
      setError('Choisissez une date / semaine / mois')
      return
    }
    if (format === 'mensuelle' && day !== 'samedi' && day !== 'dimanche') {
      setError('Format mensuelle : choisissez Samedi ou Dimanche')
      return
    }

    const startDate = new Date(dateRef + 'T12:00:00')
    const dayForCalc: FormationDay = format === 'mensuelle' ? (day as FormationDay) : 'lundi'
    let startIso: string
    let endIso: string
    let specific_dates: string[] | null = null

    try {
      const dates = calculateFormationDates(format, dayForCalc, startDate)
      startIso = dates.startDate.toISOString()
      endIso = dates.endDate.toISOString()
      specific_dates = getSpecificDates()
    } catch (err: any) {
      setError(err.message || 'Dates invalides')
      return
    }

    setSaving(true)
    try {
      const body: { lead_ids: string[]; start_date: string; end_date: string; specific_dates?: string[] } = {
        lead_ids: leadIds,
        start_date: startIso,
        end_date: endIso,
      }
      if (specific_dates && specific_dates.length > 0) body.specific_dates = specific_dates

      const res = await fetch('/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création')
        setSaving(false)
        return
      }
      // Mettre à jour les leads avec la formation et les infos de session
      const firstDateStr = startIso.split('T')[0]
      const formationDay = format === 'mensuelle' ? day : (format === 'semaine' ? 'lundi' : null)
      for (const lid of leadIds) {
        try {
          await fetch(`/api/leads/${lid}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              formation,
              formation_format: format,
              formation_day: formationDay,
              formation_start_date: firstDateStr,
            }),
          })
        } catch (_) {}
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-white/10 border border-white/20 rounded-lg p-3 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-white truncate pr-2">➕ Ajouter une session</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl sm:text-2xl shrink-0">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Participants (plusieurs possibles)</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white/5 rounded border border-white/10">
              {leads.map((l) => (
                <label key={l.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={leadIds.includes(l.id)}
                    onChange={(e) => {
                      if (e.target.checked) setLeadIds(prev => [...prev, l.id])
                      else setLeadIds(prev => prev.filter(id => id !== l.id))
                    }}
                    className="rounded border-white/30"
                  />
                  <span className="text-white text-sm">{l.first_name} {l.last_name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Formation</label>
            <select
              value={formation}
              onChange={(e) => setFormation(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
            >
              <option value="beatmaking">Beatmaking</option>
              <option value="inge_son">Ingé son</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => {
                setFormat(e.target.value as FormationFormat)
                setDay(e.target.value === 'mensuelle' ? 'samedi' : '')
              }}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
            >
              <option value="semaine">Semaine (lundi → vendredi)</option>
              <option value="mensuelle">Mensuelle (4 samedis ou 4 dimanches)</option>
              <option value="bpm_fast">BPM Fast (2 jours consécutifs)</option>
            </select>
            {format === 'semaine' && (
              <p className="text-white/50 text-xs mt-1">Du lundi au vendredi de la semaine choisie</p>
            )}
            {format === 'mensuelle' && (
              <p className="text-white/50 text-xs mt-1">4 samedis ou 4 dimanches du mois</p>
            )}
            {format === 'bpm_fast' && (
              <p className="text-white/50 text-xs mt-1">2 jours consécutifs</p>
            )}
          </div>

          {format === 'mensuelle' && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Jour (mensuelle)</label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value as FormationDay)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
              >
                <option value="samedi">4 Samedis</option>
                <option value="dimanche">4 Dimanches</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              {format === 'semaine' ? 'Semaine du (un jour de la semaine)' : format === 'mensuelle' ? 'Mois (un jour du mois)' : 'Date de début'}
            </label>
            <input
              type="date"
              value={dateRef}
              onChange={(e) => setDateRef(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
            />
          </div>

          {error && <p className="text-xs sm:text-sm text-red-300">{error}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded bg-white/10 text-white hover:bg-white/20 text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || leads.length === 0}
              className="w-full sm:w-auto px-4 py-2 rounded bg-white text-black font-medium disabled:opacity-50 text-sm"
            >
              {saving ? 'Enregistrement…' : 'Créer la session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
