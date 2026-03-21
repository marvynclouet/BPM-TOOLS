'use client'

import { useState, useEffect } from 'react'

interface Slot {
  creneau: string
  inscrits: number
  max: number
  disponible: boolean
}

interface JpoData {
  active: boolean
  message?: string
  event?: { id: string; title: string; event_date: string }
  slots?: Slot[]
}

export default function JpoPublicPage() {
  const [data, setData] = useState<JpoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', social_handle: '', creneau: '', motivation: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/jpo/public')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ active: false, message: 'Erreur de chargement' }))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.phone || !form.creneau) {
      setError('Remplis tous les champs obligatoires')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/jpo/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Erreur lors de l\'inscription')
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white/50 text-sm">Chargement...</div>
      </div>
    )
  }

  if (!data?.active) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">BPM Formation</h1>
          <p className="text-white/50">Aucune Journée Portes Ouvertes n'est prévue pour le moment.</p>
          <p className="text-white/30 text-sm mt-2">Reviens bientôt !</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-white mb-2">Inscription confirmée !</h1>
          <p className="text-white/60">
            Ton créneau <strong className="text-white">{form.creneau}</strong> est réservé.
            {form.email && <><br />Un email de confirmation a été envoyé.</>}
          </p>
          <p className="text-white/30 text-sm mt-6">On a hâte de te voir !</p>
        </div>
      </div>
    )
  }

  const dateFormatted = data.event ? new Date(data.event.event_date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }) : ''

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Journée Portes Ouvertes</h1>
          <p className="text-lg text-indigo-300 mt-1">BPM Formation</p>
          <p className="text-white/50 mt-2 capitalize">{dateFormatted}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom / Prénom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Prénom *</label>
              <input
                type="text"
                value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition"
                placeholder="Ton prénom"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Nom *</label>
              <input
                type="text"
                value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition"
                placeholder="Ton nom"
              />
            </div>
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-xs text-white/40 mb-1">Téléphone *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition"
              placeholder="+33 6 12 34 56 78"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs text-white/40 mb-1">Email (pour la confirmation)</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition"
              placeholder="ton@email.com"
            />
          </div>

          {/* Créneau */}
          <div>
            <label className="block text-xs text-white/40 mb-2">Créneau souhaité *</label>
            <div className="grid grid-cols-2 gap-2">
              {data.slots?.map(slot => (
                <button
                  key={slot.creneau}
                  type="button"
                  disabled={!slot.disponible}
                  onClick={() => setForm({ ...form, creneau: slot.creneau })}
                  className={`relative px-4 py-3 rounded-xl text-sm font-medium transition border ${
                    form.creneau === slot.creneau
                      ? 'bg-indigo-500/30 border-indigo-400 text-white'
                      : slot.disponible
                        ? 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                        : 'bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed'
                  }`}
                >
                  <span>{slot.creneau}</span>
                  <span className={`block text-xs mt-0.5 ${
                    !slot.disponible ? 'text-red-400/60' : 'text-white/30'
                  }`}>
                    {slot.disponible
                      ? `${slot.max - slot.inscrits} place${slot.max - slot.inscrits > 1 ? 's' : ''}`
                      : 'Complet'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Motivation */}
          <div>
            <label className="block text-xs text-white/40 mb-1">Pourquoi tu veux apprendre ?</label>
            <textarea
              value={form.motivation}
              onChange={e => setForm({ ...form, motivation: e.target.value })}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition resize-none"
              placeholder="Dis-nous ce qui te motive..."
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !form.creneau}
            className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Inscription en cours...' : 'Je m\'inscris'}
          </button>
        </form>
      </div>
    </div>
  )
}
