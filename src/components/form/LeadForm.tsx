'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackMetaEvent } from '@/components/tracking/MetaPixel'

interface LeadFormProps {
  source: string
}

export default function LeadForm({ source }: LeadFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    formation: 'inge_son' as 'inge_son' | 'beatmaking' | 'je_ne_sais_pas_encore',
    source: source || 'direct',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'enregistrement')
      }

      setSuccess(true)
      
      // Tracker la conversion avec Meta Pixel
      trackMetaEvent('Lead', {
        content_name: formData.formation,
        content_category: 'Formation',
        value: 0,
        currency: 'EUR',
      })
      
      // Également tracker CompleteRegistration pour les campagnes d'inscription
      trackMetaEvent('CompleteRegistration', {
        content_name: formData.formation,
        status: true,
      })

      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        formation: 'inge_son',
      })
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold mb-2 text-green-300">
          ✅ Inscription enregistrée !
        </h2>
        <p className="text-white/70">
          Nous vous contacterons très prochainement pour finaliser votre inscription.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-5 py-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="first_name" className="block text-sm font-medium mb-2 text-white/70">
          Prénom *
        </label>
        <input
          id="first_name"
          type="text"
          value={formData.first_name}
          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          required
          className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-base"
          placeholder="Votre prénom"
        />
      </div>

      <div>
        <label htmlFor="last_name" className="block text-sm font-medium mb-2 text-white/70">
          Nom *
        </label>
        <input
          id="last_name"
          type="text"
          value={formData.last_name}
          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          required
          className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-base"
          placeholder="Votre nom"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-2 text-white/70">
          Téléphone *
        </label>
        <input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
          className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-base"
          placeholder="06 12 34 56 78"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2 text-white/70">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-base"
          placeholder="votre.email@example.com (optionnel)"
        />
      </div>

      <div>
        <label htmlFor="formation" className="block text-sm font-medium mb-2 text-white/70">
          Formation *
        </label>
        <select
          id="formation"
          value={formData.formation}
          onChange={(e) =>
            setFormData({ ...formData, formation: e.target.value as any })
          }
          required
          className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-base"
        >
          <option value="inge_son">Ingénieur du son</option>
          <option value="beatmaking">Beatmaking</option>
          <option value="je_ne_sais_pas_encore">Je ne sais pas encore</option>
        </select>
      </div>

      <div>
        <label htmlFor="source" className="block text-sm font-medium mb-2 text-white/70">
          Comment avez-vous connu BPM Formation ?
        </label>
        <select
          id="source"
          value={formData.source}
          onChange={(e) =>
            setFormData({ ...formData, source: e.target.value })
          }
          className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-base"
        >
          <option value="direct">Direct / Bouche à oreille</option>
          <option value="instagram">📷 Instagram</option>
          <option value="tiktok">🎵 TikTok</option>
          <option value="facebook">📘 Facebook</option>
          <option value="google">🔍 Google</option>
          <option value="youtube">📺 YouTube</option>
          <option value="autre">Autre</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black py-4 rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-base"
      >
        {loading ? 'Envoi...' : "S'inscrire"}
      </button>
    </form>
  )
}
