'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'

interface AddProspectModalProps {
  onClose: () => void
  onAdded: () => void
}

export default function AddProspectModal({ onClose, onAdded }: AddProspectModalProps) {
  const [username, setUsername] = useState('')
  const [platform, setPlatform] = useState<'tiktok' | 'instagram'>('instagram')
  const [formation, setFormation] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!username.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/prospects-reseaux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().replace(/^@/, ''),
          platform,
          formation: formation || null,
          profile_url: profileUrl || null,
          notes: notes || null,
        }),
      })
      if (res.ok) onAdded()
    } catch { /* */ }
    finally { setSubmitting(false) }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">Nouveau prospect</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Pseudo *</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="@pseudo"
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Plateforme *</label>
            <div className="flex gap-2">
              {(['instagram', 'tiktok'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    platform === p
                      ? p === 'instagram' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {p === 'instagram' ? '📷 Instagram' : '🎵 TikTok'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Formation</label>
            <select
              value={formation}
              onChange={e => setFormation(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="">Pas encore défini</option>
              <option value="inge_son">Ingénierie du son</option>
              <option value="beatmaking">Beatmaking</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Lien profil</label>
            <input
              type="url"
              value={profileUrl}
              onChange={e => setProfileUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Contexte, pourquoi ce prospect..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/5 text-white/60 rounded-xl text-sm hover:bg-white/10 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!username.trim() || submitting}
            className="flex-1 px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-xl text-sm font-medium hover:bg-indigo-500/30 transition disabled:opacity-50"
          >
            {submitting ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
