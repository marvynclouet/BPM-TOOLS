'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

interface JpoEvent {
  id: string
  title: string
  event_date: string
  status: string
  max_per_slot: number
  notes: string | null
}

interface Props {
  onSelectEvent: (event: JpoEvent | null) => void
  selectedEventId: string | null
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Brouillon', color: 'text-gray-300', bg: 'bg-gray-500/20' },
  active: { label: 'Active', color: 'text-green-300', bg: 'bg-green-500/20' },
  ended: { label: 'Terminée', color: 'text-white/40', bg: 'bg-white/10' },
}

export default function JpoEventManager({ onSelectEvent, selectedEventId }: Props) {
  const [events, setEvents] = useState<JpoEvent[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: 'Journée Portes Ouvertes', event_date: '', max_per_slot: '5' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchEvents() }, [])

  const fetchEvents = async () => {
    const res = await fetch(`/api/jpo/events?t=${Date.now()}`, { cache: 'no-store' })
    const data = await res.json()
    const evts = data.events || []
    setEvents(evts)
    if (evts.length > 0 && !selectedEventId) {
      onSelectEvent(evts[0])
    }
  }

  const handleAdd = async () => {
    if (!form.event_date) return
    setSubmitting(true)
    try {
      await fetch('/api/jpo/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, max_per_slot: parseInt(form.max_per_slot) || 5 }),
      })
      setShowAdd(false)
      setForm({ title: 'Journée Portes Ouvertes', event_date: '', max_per_slot: '5' })
      await fetchEvents()
    } catch { /* */ }
    finally { setSubmitting(false) }
  }

  const handleStatusChange = async (event: JpoEvent, newStatus: string) => {
    await fetch(`/api/jpo/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    await fetchEvents()
  }

  const handleDelete = async (event: JpoEvent) => {
    if (!confirm(`Supprimer "${event.title}" et tous ses inscrits ?`)) return
    await fetch(`/api/jpo/events/${event.id}`, { method: 'DELETE' })
    if (selectedEventId === event.id) onSelectEvent(null)
    await fetchEvents()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Événements JPO</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-500/30 transition">
          {showAdd ? 'Annuler' : '+ Nouvelle JPO'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Titre" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20" />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
            <input type="number" value={form.max_per_slot} onChange={e => setForm({ ...form, max_per_slot: e.target.value })} placeholder="Max/créneau" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <button onClick={handleAdd} disabled={submitting || !form.event_date} className="px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-xl text-sm font-medium hover:bg-indigo-500/30 transition disabled:opacity-50">
            {submitting ? '...' : 'Créer'}
          </button>
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-center py-6 text-white/30 text-sm">Aucun événement JPO</p>
      ) : (
        <div className="space-y-2">
          {events.map(evt => {
            const st = STATUS_LABELS[evt.status] || STATUS_LABELS.draft
            const isSelected = selectedEventId === evt.id
            return (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  isSelected ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{evt.title}</p>
                    <p className="text-xs text-white/40">
                      {format(new Date(evt.event_date), 'EEEE d MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>{st.label}</span>
                    {evt.status === 'active' && (
                      <button onClick={(e) => { e.stopPropagation(); handleStatusChange(evt, 'ended') }} className="text-xs text-white/30 hover:text-white/60">Terminer</button>
                    )}
                    {evt.status === 'draft' && (
                      <button onClick={(e) => { e.stopPropagation(); handleStatusChange(evt, 'active') }} className="text-xs text-green-400/60 hover:text-green-300">Activer</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(evt) }} className="text-xs text-red-400/40 hover:text-red-300">x</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
