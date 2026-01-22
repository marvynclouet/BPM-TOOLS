'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import DatePicker from './DatePicker'

interface AddLeadModalProps {
  onClose: () => void
  onSave: () => void
  currentUserId: string | null
}

export default function AddLeadModal({ onClose, onSave, currentUserId }: AddLeadModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    formation: 'inge_son' as 'inge_son' | 'beatmaking' | 'autre',
    status: 'nouveau' as 'nouveau' | 'chinois' | 'rats' | 'nrp' | 'en_cours_de_closing' | 'acompte_en_cours' | 'appele' | 'acompte_regle' | 'clos' | 'ko',
    source: 'manuel',
    comment: '',
    price_fixed: null as number | null,
    price_deposit: null as number | null,
    formation_format: null as 'mensuelle' | 'semaine' | 'bpm_fast' | null,
    formation_day: null as 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche' | null,
    formation_start_date: null as string | null,
    interest_level: null as 'froid' | 'moyen' | 'chaud' | null,
  })

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.phone) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    setLoading(true)
    const { error } = await supabase
      .from('leads')
      .insert({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        formation: formData.formation,
        status: formData.status,
        source: formData.source,
        comment: formData.comment.trim() || null,
        price_fixed: formData.price_fixed,
        price_deposit: formData.price_deposit,
        formation_format: formData.formation_format,
        formation_day: formData.formation_day,
        formation_start_date: formData.formation_start_date,
        interest_level: formData.interest_level,
        closer_id: currentUserId,
      })

    if (!error) {
      onSave()
      onClose()
      router.refresh()
    } else {
      alert('Erreur lors de la création: ' + error.message)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
        {/* En-tête fixe */}
        <div className="flex justify-between items-center p-6 border-b border-white/5 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white">➕ Ajouter un client</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">
              Prénom *
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
              placeholder="Prénom"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">
              Nom *
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
              placeholder="Nom"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">
              Téléphone *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
              placeholder="06 12 34 56 78"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
              placeholder="email@example.com (optionnel)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">
              Formation *
            </label>
            <select
              value={formData.formation}
              onChange={(e) => setFormData({ ...formData, formation: e.target.value as any })}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
            >
              <option value="inge_son">Ingé son</option>
              <option value="beatmaking">Beatmaking</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">
              Source
            </label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
            >
              <option value="manuel">Manuel</option>
              <option value="direct">Direct / Bouche à oreille</option>
              <option value="instagram">📷 Instagram</option>
              <option value="tiktok">🎵 TikTok</option>
              <option value="facebook">📘 Facebook</option>
              <option value="google">🔍 Google</option>
              <option value="youtube">📺 YouTube</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">
              Statut initial
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
            >
              <option value="nouveau">👶 Nouveau</option>
              <option value="chinois">🇨🇳 Chinois</option>
              <option value="rats">🐀 Rats</option>
              <option value="nrp">📞 NRP</option>
              <option value="en_cours_de_closing">👍 En cours de closing</option>
              <option value="acompte_en_cours">💰 Acompte en cours</option>
              <option value="appele">Appelé</option>
              <option value="acompte_regle">Acompte réglé</option>
              <option value="clos">Closé</option>
              <option value="ko">KO</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">
              Prix fixé (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price_fixed ?? ''}
              onChange={(e) => setFormData({ ...formData, price_fixed: e.target.value ? parseFloat(e.target.value) : null })}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">
              Prix acompte (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price_deposit ?? ''}
              onChange={(e) => setFormData({ ...formData, price_deposit: e.target.value ? parseFloat(e.target.value) : null })}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">
              Format de formation
            </label>
            <select
              value={formData.formation_format || ''}
              onChange={(e) => setFormData({ ...formData, formation_format: e.target.value as any || null, formation_day: null })}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
            >
              <option value="">Non défini</option>
              <option value="semaine">Semaine (Lundi-Vendredi)</option>
              <option value="mensuelle">Mensuelle (4 Samedis/Dimanches)</option>
              <option value="bpm_fast">⚡ BPM Fast (2 jours)</option>
            </select>
          </div>

          {formData.formation_format && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-white/70">
                  {formData.formation_format === 'semaine' 
                    ? 'Jour de référence (pour la date)'
                    : 'Jour de formation'}
                </label>
                <select
                  value={formData.formation_day || ''}
                  onChange={(e) => setFormData({ ...formData, formation_day: e.target.value as any || null })}
                  className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
                >
                  <option value="">Sélectionner un jour</option>
                  {formData.formation_format === 'semaine' ? (
                    <>
                      <option value="lundi">Lundi</option>
                      <option value="mardi">Mardi</option>
                      <option value="mercredi">Mercredi</option>
                      <option value="jeudi">Jeudi</option>
                      <option value="vendredi">Vendredi</option>
                    </>
                  ) : formData.formation_format === 'mensuelle' ? (
                    <>
                      <option value="samedi">Samedi</option>
                      <option value="dimanche">Dimanche</option>
                    </>
                  ) : formData.formation_format === 'bpm_fast' ? (
                    <>
                      <option value="lundi">Lundi</option>
                      <option value="mardi">Mardi</option>
                      <option value="mercredi">Mercredi</option>
                      <option value="jeudi">Jeudi</option>
                      <option value="vendredi">Vendredi</option>
                      <option value="samedi">Samedi</option>
                      <option value="dimanche">Dimanche</option>
                    </>
                  ) : null}
                </select>
                {formData.formation_format === 'semaine' && (
                  <p className="text-xs text-white/40 mt-1">
                    ⚠️ Le jour choisi sert uniquement à déterminer la semaine. La réservation sera toujours lundi-vendredi.
                  </p>
                )}
              </div>
              {formData.formation_day && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-white/70">
                    Date de début *
                  </label>
                  <DatePicker
                    value={formData.formation_start_date}
                    onChange={(date) => setFormData({ ...formData, formation_start_date: date })}
                    formationFormat={formData.formation_format}
                    formationDay={formData.formation_day}
                    placeholder="Sélectionner une date"
                  />
                  <p className="text-xs text-white/50 mt-2">
                    {formData.formation_format === 'semaine' 
                      ? '📅 La semaine complète (lundi-vendredi) sera toujours réservée, peu importe le jour choisi'
                      : formData.formation_format === 'mensuelle'
                      ? `🗓️ Les 4 ${formData.formation_day}s du mois seront réservés`
                      : formData.formation_format === 'bpm_fast'
                      ? '⚡ 2 jours consécutifs seront réservés à partir de la date choisie'
                      : ''}
                  </p>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">
              Niveau d&apos;intérêt
            </label>
            <select
              value={formData.interest_level || ''}
              onChange={(e) => setFormData({ ...formData, interest_level: e.target.value as any || null })}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
            >
              <option value="">Non défini</option>
              <option value="froid">Froid</option>
              <option value="moyen">Moyen</option>
              <option value="chaud">Chaud</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/70">
              Commentaire
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition resize-none"
              placeholder="Notes..."
              rows={3}
            />
          </div>
          </div>
        </div>

        {/* Footer fixe avec boutons */}
        <div className="flex justify-end gap-3 p-6 border-t border-white/5 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition disabled:opacity-50 shadow-lg"
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}
