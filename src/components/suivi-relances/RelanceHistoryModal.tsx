'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

interface Exchange {
  id: string
  direction: 'sent' | 'received'
  message: string
  sent_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  en_attente: { label: 'En attente', color: 'text-yellow-300', bg: 'bg-yellow-500/20' },
  relance: { label: 'Relancé', color: 'text-orange-300', bg: 'bg-orange-500/20' },
  repondu: { label: 'Répondu', color: 'text-blue-300', bg: 'bg-blue-500/20' },
  close: { label: 'Closé', color: 'text-green-300', bg: 'bg-green-500/20' },
  abandonne: { label: 'Abandonné', color: 'text-white/40', bg: 'bg-white/10' },
}

const FORMATION_LABELS: Record<string, string> = {
  inge_son: 'Ingé son',
  beatmaking: 'Beatmaking',
  autre: 'Autre',
  je_ne_sais_pas_encore: 'Indécis',
}

interface LeadData {
  id: string
  first_name: string
  last_name: string
  phone: string
  formation: string
  formation_format: string | null
  formation_start_date: string | null
  price_fixed: number | null
  price_deposit: number | null
  relance_status: string
  relance_notes: string
  last_contact: string | null
  last_sender: 'nous' | 'eux' | null
  last_message: string | null
  alert: boolean
}

interface RelanceHistoryModalProps {
  lead: LeadData
  onClose: () => void
  onDataChanged: () => void
  onStatusChange: (leadId: string, status: string) => void
  normalizePhone: (phone: string) => string
}

export default function RelanceHistoryModal({ lead, onClose, onDataChanged, onStatusChange, normalizePhone }: RelanceHistoryModalProps) {
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(true)
  const [direction, setDirection] = useState<'sent' | 'received'>('sent')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [notes, setNotes] = useState(lead.relance_notes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesChanged, setNotesChanged] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchHistory()
  }, [lead.id])

  useEffect(() => {
    if (!loading && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [exchanges, loading])

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/suivi-relances/history?leadId=${lead.id}`)
      const data = await res.json()
      setExchanges(data.exchanges || [])
    } catch { /* */ }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!message.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/suivi-relances/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, direction, message: message.trim() }),
      })
      if (res.ok) {
        setMessage('')
        await fetchHistory()
        onDataChanged()
      }
    } catch {
      alert('Erreur lors de l\'enregistrement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGenerateAI = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/relance-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      })
      const data = await res.json()
      if (data.message) {
        setMessage(data.message)
        setDirection('sent')
      } else {
        alert(data.error || 'Erreur IA')
      }
    } catch {
      alert('Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await fetch('/api/suivi-relances/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, notes }),
      })
      setNotesChanged(false)
      onDataChanged()
    } catch { /* */ }
    finally { setSavingNotes(false) }
  }

  const openWhatsApp = () => {
    const encoded = encodeURIComponent(message)
    const phoneNorm = normalizePhone(lead.phone)
    window.open(`https://wa.me/${phoneNorm}?text=${encoded}`, '_blank')
  }

  const sc = STATUS_CONFIG[lead.relance_status] || STATUS_CONFIG.en_attente

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-[#1a1a1a] border border-white/10 rounded-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* === HEADER : Infos lead === */}
        <div className="px-6 py-4 border-b border-white/10 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{lead.first_name} {lead.last_name}</h2>
              <p className="text-sm text-white/50">{lead.phone}</p>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white transition p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Infos clés */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-xl px-3 py-2">
              <p className="text-xs text-white/40">Formation</p>
              <p className="text-sm font-medium text-white">{FORMATION_LABELS[lead.formation] || lead.formation}</p>
              {lead.formation_format && <p className="text-xs text-white/40">{lead.formation_format}</p>}
            </div>
            <div className="bg-white/5 rounded-xl px-3 py-2">
              <p className="text-xs text-white/40">Prix discuté</p>
              <p className="text-sm font-medium text-white">{lead.price_fixed ? `${lead.price_fixed} €` : '—'}</p>
              {lead.price_deposit ? <p className="text-xs text-white/40">Acompte: {lead.price_deposit} €</p> : null}
            </div>
            <div className="bg-white/5 rounded-xl px-3 py-2">
              <p className="text-xs text-white/40">Début prévu</p>
              <p className="text-sm font-medium text-white">
                {lead.formation_start_date ? format(new Date(lead.formation_start_date), 'dd MMM yyyy', { locale: fr }) : '—'}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl px-3 py-2">
              <p className="text-xs text-white/40">Statut</p>
              <select
                value={lead.relance_status}
                onChange={e => onStatusChange(lead.id, e.target.value)}
                className={`${sc.bg} ${sc.color} text-xs font-medium px-2 py-1 rounded-lg border-0 focus:outline-none cursor-pointer mt-0.5`}
              >
                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key} className="bg-[#2a2a2a] text-white">{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dernier message reçu/envoyé */}
          {lead.last_message && (
            <div className={`rounded-xl px-3 py-2 ${lead.last_sender === 'eux' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
              <p className="text-xs text-white/40 mb-1">
                Dernier message ({lead.last_sender === 'nous' ? 'envoyé par nous' : 'reçu'})
                {lead.last_contact && ` — ${format(new Date(lead.last_contact), 'dd MMM yyyy HH:mm', { locale: fr })}`}
              </p>
              <p className="text-sm text-white/80 italic">{lead.last_message}</p>
            </div>
          )}
        </div>

        {/* === HISTORIQUE DES ÉCHANGES === */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
          {loading ? (
            <p className="text-center text-white/50 py-8">Chargement...</p>
          ) : exchanges.length === 0 ? (
            <p className="text-center text-white/50 py-8">Aucun échange enregistré</p>
          ) : (
            exchanges.map(ex => (
              <div key={ex.id} className={`flex ${ex.direction === 'sent' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  ex.direction === 'sent'
                    ? 'bg-green-600/30 text-green-100 rounded-br-md'
                    : 'bg-white/10 text-white/90 rounded-bl-md'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{ex.message}</p>
                  <p className={`text-xs mt-1 ${ex.direction === 'sent' ? 'text-green-300/60' : 'text-white/40'}`}>
                    {format(new Date(ex.sent_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* === NOTES === */}
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Notes</p>
            {notesChanged && (
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="text-xs px-2 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 transition disabled:opacity-50"
              >
                {savingNotes ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            )}
          </div>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setNotesChanged(true) }}
            onBlur={() => { if (notesChanged) handleSaveNotes() }}
            placeholder="Notes internes sur ce contact..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
          />
        </div>

        {/* === INPUT NOUVEAU MESSAGE === */}
        <div className="border-t border-white/10 p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-white/5 rounded-lg p-0.5">
              <button
                onClick={() => setDirection('sent')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  direction === 'sent' ? 'bg-green-600/30 text-green-300' : 'text-white/50 hover:text-white'
                }`}
              >
                Envoyé
              </button>
              <button
                onClick={() => setDirection('received')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  direction === 'received' ? 'bg-blue-600/30 text-blue-300' : 'text-white/50 hover:text-white'
                }`}
              >
                Reçu
              </button>
            </div>
            <button
              onClick={handleGenerateAI}
              disabled={generating}
              className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition disabled:opacity-50"
            >
              {generating ? 'Génération...' : 'Générer relance IA'}
            </button>
            {message.trim() && direction === 'sent' && (
              <button
                onClick={openWhatsApp}
                className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium hover:bg-green-500/30 transition"
              >
                Ouvrir WhatsApp
              </button>
            )}
            <a
              href={`https://wa.me/${normalizePhone(lead.phone)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-green-500/10 text-green-400/70 rounded-lg text-xs font-medium hover:bg-green-500/20 transition ml-auto"
            >
              WhatsApp
            </a>
          </div>
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Contenu du message..."
              rows={2}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit() }}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !message.trim()}
              className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition disabled:opacity-50 self-end"
            >
              {submitting ? '...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof window === 'undefined') return null
  return createPortal(modal, document.body)
}
