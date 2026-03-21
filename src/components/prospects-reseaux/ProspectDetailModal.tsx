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

interface Prospect {
  id: string
  username: string
  platform: 'tiktok' | 'instagram'
  status: string
  formation: string | null
  phone: string | null
  notes: string | null
  profile_url: string | null
  created_at: string
  updated_at: string
}

interface Props {
  prospect: Prospect
  onClose: () => void
  onUpdate: () => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  repere: { label: 'Repéré', color: 'text-gray-300', bg: 'bg-gray-500/20', border: 'border-gray-500/30' },
  contacte: { label: 'Contacté', color: 'text-blue-300', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  a_repondu: { label: 'A répondu', color: 'text-yellow-300', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  numero_recupere: { label: 'N° récupéré', color: 'text-orange-300', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  en_discussion: { label: 'En discussion', color: 'text-purple-300', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  close: { label: 'Closé', color: 'text-green-300', bg: 'bg-green-500/20', border: 'border-green-500/30' },
  froid: { label: 'Froid', color: 'text-red-300', bg: 'bg-red-500/20', border: 'border-red-500/30' },
}

const STATUSES = ['repere', 'contacte', 'a_repondu', 'numero_recupere', 'en_discussion', 'close', 'froid']

const FORMATION_LABELS: Record<string, string> = {
  inge_son: 'Ingénierie du son',
  beatmaking: 'Beatmaking',
  autre: 'Autre',
}

export default function ProspectDetailModal({ prospect: initialProspect, onClose, onUpdate }: Props) {
  const [prospect, setProspect] = useState(initialProspect)
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loadingExchanges, setLoadingExchanges] = useState(true)
  const [newDirection, setNewDirection] = useState<'sent' | 'received'>('sent')
  const [newMessage, setNewMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(prospect.notes || '')
  const [editingPhone, setEditingPhone] = useState(false)
  const [phone, setPhone] = useState(prospect.phone || '')
  const [editingFormation, setEditingFormation] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchExchanges() }, [prospect.id])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [exchanges])

  const fetchExchanges = async () => {
    try {
      const res = await fetch(`/api/prospects-reseaux/${prospect.id}/exchanges`)
      const data = await res.json()
      setExchanges(data.exchanges || [])
    } catch { /* */ }
    finally { setLoadingExchanges(false) }
  }

  const updateField = async (updates: Record<string, any>) => {
    try {
      const res = await fetch(`/api/prospects-reseaux/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const data = await res.json()
        setProspect(data.prospect)
        onUpdate()
      }
    } catch { /* */ }
  }

  const handleStatusChange = (status: string) => {
    updateField({ status })
  }

  const handleAddExchange = async () => {
    if (!newMessage.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/prospects-reseaux/${prospect.id}/exchanges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: newDirection, message: newMessage.trim() }),
      })
      if (res.ok) {
        setNewMessage('')
        await fetchExchanges()
        // Re-fetch prospect to get updated status
        const pRes = await fetch(`/api/prospects-reseaux`)
        const pData = await pRes.json()
        const updated = pData.prospects?.find((p: any) => p.id === prospect.id)
        if (updated) setProspect(updated)
        onUpdate()
      }
    } catch { /* */ }
    finally { setSubmitting(false) }
  }

  const handleGenerateMessage = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/prospects-reseaux/${prospect.id}/generate-message`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.message) {
        setNewMessage(data.message)
        setNewDirection('sent')
      } else {
        alert(data.error || 'Erreur IA')
      }
    } catch { alert('Erreur') }
    finally { setGenerating(false) }
  }

  const handleSaveNotes = () => {
    updateField({ notes: notes.trim() || null })
    setEditingNotes(false)
  }

  const handleSavePhone = () => {
    updateField({ phone: phone.trim() || null })
    setEditingPhone(false)
  }

  const handleSaveFormation = (f: string) => {
    updateField({ formation: f || null })
    setEditingFormation(false)
  }

  const st = STATUS_CONFIG[prospect.status] || STATUS_CONFIG.repere

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-[100]" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">{prospect.platform === 'tiktok' ? '🎵' : '📷'}</span>
            <div>
              <h2 className="text-lg font-semibold text-white">@{prospect.username}</h2>
              <p className="text-xs text-white/40">
                {prospect.platform === 'tiktok' ? 'TikTok' : 'Instagram'} · Ajouté le {format(new Date(prospect.created_at), 'dd MMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {prospect.profile_url && (
              <a
                href={prospect.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 bg-white/5 text-white/60 rounded-lg text-xs hover:bg-white/10 transition"
              >
                Profil
              </a>
            )}
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl px-1">x</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status buttons */}
          <div>
            <p className="text-xs text-white/50 mb-2">Statut</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s]
                const active = prospect.status === s
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      active
                        ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                        : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-2">
            {/* Formation */}
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-white/40 mb-1">Formation</p>
              {editingFormation ? (
                <select
                  autoFocus
                  defaultValue={prospect.formation || ''}
                  onChange={e => handleSaveFormation(e.target.value)}
                  onBlur={() => setEditingFormation(false)}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white"
                >
                  <option value="">Non défini</option>
                  <option value="inge_son">Ingénierie du son</option>
                  <option value="beatmaking">Beatmaking</option>
                  <option value="autre">Autre</option>
                </select>
              ) : (
                <p
                  className="text-sm text-white cursor-pointer hover:text-blue-300 transition"
                  onClick={() => setEditingFormation(true)}
                >
                  {prospect.formation ? FORMATION_LABELS[prospect.formation] || prospect.formation : 'Non défini'}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-white/40 mb-1">Numéro</p>
              {editingPhone ? (
                <div className="flex gap-1">
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSavePhone(); if (e.key === 'Escape') setEditingPhone(false) }}
                    autoFocus
                    className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white"
                    placeholder="06..."
                  />
                  <button onClick={handleSavePhone} className="text-xs text-green-300 px-1">OK</button>
                </div>
              ) : (
                <p
                  className="text-sm text-white cursor-pointer hover:text-blue-300 transition"
                  onClick={() => setEditingPhone(true)}
                >
                  {prospect.phone || 'Aucun'}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-xs text-white/40 mb-1">Notes</p>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  autoFocus
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none"
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveNotes} className="text-xs text-green-300 hover:text-green-200">Sauvegarder</button>
                  <button onClick={() => { setNotes(prospect.notes || ''); setEditingNotes(false) }} className="text-xs text-white/40">Annuler</button>
                </div>
              </div>
            ) : (
              <p
                className="text-sm text-white/70 cursor-pointer hover:text-blue-300 transition whitespace-pre-wrap"
                onClick={() => setEditingNotes(true)}
              >
                {prospect.notes || 'Cliquer pour ajouter des notes...'}
              </p>
            )}
          </div>

          {/* Exchange history */}
          <div>
            <p className="text-xs text-white/50 mb-2">Historique des échanges</p>
            <div className="space-y-2 max-h-[250px] overflow-y-auto bg-white/[0.02] rounded-xl p-3">
              {loadingExchanges ? (
                <p className="text-center text-white/40 py-4 text-xs">Chargement...</p>
              ) : exchanges.length === 0 ? (
                <p className="text-center text-white/30 py-4 text-xs">Aucun échange enregistré</p>
              ) : (
                exchanges.map(ex => (
                  <div key={ex.id} className={`flex ${ex.direction === 'sent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                      ex.direction === 'sent'
                        ? 'bg-indigo-600/25 text-indigo-100 rounded-br-md'
                        : 'bg-white/10 text-white/90 rounded-bl-md'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{ex.message}</p>
                      <p className={`text-xs mt-1 ${ex.direction === 'sent' ? 'text-indigo-300/50' : 'text-white/30'}`}>
                        {format(new Date(ex.sent_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>

        {/* Input area - fixed at bottom */}
        <div className="border-t border-white/10 p-4 space-y-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-white/5 rounded-lg p-0.5">
              <button
                onClick={() => setNewDirection('sent')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  newDirection === 'sent' ? 'bg-indigo-600/30 text-indigo-300' : 'text-white/50 hover:text-white'
                }`}
              >
                Envoyé
              </button>
              <button
                onClick={() => setNewDirection('received')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  newDirection === 'received' ? 'bg-emerald-600/30 text-emerald-300' : 'text-white/50 hover:text-white'
                }`}
              >
                Recu
              </button>
            </div>
            <button
              onClick={handleGenerateMessage}
              disabled={generating}
              className="px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition disabled:opacity-50"
            >
              {generating ? 'Génération...' : 'Générer DM'}
            </button>
          </div>
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Message envoyé ou réponse reçue..."
              rows={2}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleAddExchange() }}
            />
            <button
              onClick={handleAddExchange}
              disabled={submitting || !newMessage.trim()}
              className="px-3 py-2 bg-white/10 text-white rounded-xl text-xs font-medium hover:bg-white/20 transition disabled:opacity-50 self-end"
            >
              {submitting ? '...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
