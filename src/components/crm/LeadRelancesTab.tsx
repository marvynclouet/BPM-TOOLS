'use client'

import { useState, useEffect } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

interface Exchange {
  id: string
  direction: 'sent' | 'received'
  message: string
  sent_at: string
}

interface LeadRelancesTabProps {
  leadId: string
  leadPhone: string
  isDemo?: boolean
}

export default function LeadRelancesTab({ leadId, leadPhone, isDemo }: LeadRelancesTabProps) {
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(true)
  const [direction, setDirection] = useState<'sent' | 'received'>('sent')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!isDemo) fetchHistory()
    else setLoading(false)
  }, [leadId])

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/suivi-relances/history?leadId=${leadId}`)
      const data = await res.json()
      setExchanges(data.exchanges || [])
    } catch { /* */ }
    finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!message.trim() || isDemo) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/suivi-relances/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, direction, message: message.trim() }),
      })
      if (res.ok) {
        setMessage('')
        await fetchHistory()
      }
    } catch { /* */ }
    finally { setSubmitting(false) }
  }

  const handleGenerateAI = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/relance-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      const data = await res.json()
      if (data.message) {
        setMessage(data.message)
        setDirection('sent')
      } else {
        alert(data.error || 'Erreur IA')
      }
    } catch { alert('Erreur') }
    finally { setGenerating(false) }
  }

  const normalizePhone = (p: string) => {
    let n = p.replace(/\s/g, '').replace(/[^\d+]/g, '')
    if (n.startsWith('0')) n = '+33' + n.substring(1)
    if (!n.startsWith('+')) n = '+33' + n
    return n.replace('+', '')
  }

  // Calcul alerte
  const lastSent = exchanges.filter(e => e.direction === 'sent').at(-1)
  const lastReceived = exchanges.filter(e => e.direction === 'received').at(-1)
  const hasUnanswered = lastSent && (!lastReceived || new Date(lastSent.sent_at) > new Date(lastReceived.sent_at))
  const daysSinceLastSent = lastSent ? (Date.now() - new Date(lastSent.sent_at).getTime()) / (1000 * 60 * 60 * 24) : 0
  const showAlert = hasUnanswered && daysSinceLastSent > 3

  return (
    <div className="space-y-4">
      {/* Alerte sans réponse */}
      {showAlert && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-sm text-red-300 font-medium">
            Sans réponse depuis {formatDistanceToNow(new Date(lastSent!.sent_at), { locale: fr })}
          </span>
        </div>
      )}

      {/* Timeline des échanges */}
      <div className="space-y-2 max-h-[280px] overflow-y-auto">
        {loading ? (
          <p className="text-center text-white/50 py-6 text-sm">Chargement...</p>
        ) : exchanges.length === 0 ? (
          <p className="text-center text-white/40 py-6 text-sm">Aucun échange WhatsApp enregistré</p>
        ) : (
          exchanges.map(ex => (
            <div key={ex.id} className={`flex ${ex.direction === 'sent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                ex.direction === 'sent'
                  ? 'bg-green-600/25 text-green-100 rounded-br-md'
                  : 'bg-white/10 text-white/90 rounded-bl-md'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{ex.message}</p>
                <p className={`text-xs mt-1 ${ex.direction === 'sent' ? 'text-green-300/50' : 'text-white/30'}`}>
                  {format(new Date(ex.sent_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 border-t border-white/10 pt-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => setDirection('sent')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                direction === 'sent' ? 'bg-green-600/30 text-green-300' : 'text-white/50 hover:text-white'
              }`}
            >
              Envoyé
            </button>
            <button
              onClick={() => setDirection('received')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                direction === 'received' ? 'bg-blue-600/30 text-blue-300' : 'text-white/50 hover:text-white'
              }`}
            >
              Reçu
            </button>
          </div>
          <button
            onClick={handleGenerateAI}
            disabled={generating || isDemo}
            className="px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition disabled:opacity-50"
          >
            {generating ? 'Génération...' : 'Générer relance IA'}
          </button>
          {message.trim() && direction === 'sent' && (
            <a
              href={`https://wa.me/${normalizePhone(leadPhone)}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium hover:bg-green-500/30 transition"
            >
              Ouvrir WhatsApp
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Message envoyé ou réponse reçue..."
            rows={2}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit() }}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !message.trim() || isDemo}
            className="px-3 py-2 bg-white/10 text-white rounded-xl text-xs font-medium hover:bg-white/20 transition disabled:opacity-50 self-end"
          >
            {submitting ? '...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
