'use client'

import { useState, useEffect } from 'react'

interface Inscription {
  id: string
  first_name: string
  last_name: string
  phone: string
  social_handle: string | null
  creneau: string
  motivation: string | null
  status: string
  formation_interet: string | null
  email: string | null
  notes: string | null
}

const CRENEAUX = ['12h-14h', '14h-16h', '16h-18h', '18h-20h']

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  inscrit: { label: 'Inscrit', color: 'text-blue-300', bg: 'bg-blue-500/20' },
  present: { label: 'Présent', color: 'text-green-300', bg: 'bg-green-500/20' },
  signe: { label: 'Signé', color: 'text-emerald-300', bg: 'bg-emerald-500/20' },
  froid: { label: 'Froid', color: 'text-red-300', bg: 'bg-red-500/20' },
}

const FORMATION_OPTIONS = ['Ingé Son', 'Beatmaking', 'Indécis']

interface Props {
  jpoId: string
  maxPerSlot: number
}

export default function JpoPlanning({ jpoId, maxPerSlot }: Props) {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [relanceMsg, setRelanceMsg] = useState<Record<string, string>>({})
  const [generatingRelance, setGeneratingRelance] = useState<string | null>(null)

  useEffect(() => { fetchInscriptions() }, [jpoId])

  const fetchInscriptions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/jpo/inscriptions?jpo_id=${jpoId}`)
      const data = await res.json()
      setInscriptions(data.inscriptions || [])
    } catch { /* */ }
    finally { setLoading(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/jpo/inscriptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchInscriptions()
  }

  const updateFormation = async (id: string, formation_interet: string) => {
    await fetch(`/api/jpo/inscriptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formation_interet }),
    })
    await fetchInscriptions()
  }

  const generateRelance = async (id: string) => {
    setGeneratingRelance(id)
    try {
      const res = await fetch(`/api/jpo/inscriptions/${id}/generate-relance`, { method: 'POST' })
      const data = await res.json()
      if (data.message) {
        setRelanceMsg(prev => ({ ...prev, [id]: data.message }))
      }
    } catch { /* */ }
    finally { setGeneratingRelance(null) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet inscrit ?')) return
    await fetch(`/api/jpo/inscriptions/${id}`, { method: 'DELETE' })
    await fetchInscriptions()
  }

  if (loading) return <div className="text-center py-8 text-white/50 text-sm">Chargement...</div>

  // Stats
  const totalInscrits = inscriptions.length
  const presents = inscriptions.filter(i => i.status === 'present' || i.status === 'signe').length
  const signes = inscriptions.filter(i => i.status === 'signe').length
  const froids = inscriptions.filter(i => i.status === 'froid').length

  const bySlot = CRENEAUX.map(c => ({
    creneau: c,
    inscriptions: inscriptions.filter(i => i.creneau === c),
    places: maxPerSlot,
  }))

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-xs text-white/50">Inscrits</p>
          <p className="text-xl font-bold text-white">{totalInscrits}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-xs text-white/50">Présents</p>
          <p className="text-xl font-bold text-green-300">{presents}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-xs text-white/50">Signés</p>
          <p className="text-xl font-bold text-emerald-300">{signes}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-xs text-white/50">Froids</p>
          <p className="text-xl font-bold text-red-300">{froids}</p>
        </div>
      </div>

      {/* Créneaux */}
      <div className="space-y-3">
        {bySlot.map(slot => (
          <div key={slot.creneau} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white">{slot.creneau}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  slot.inscriptions.length >= slot.places ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white/50'
                }`}>
                  {slot.inscriptions.length}/{slot.places}
                </span>
              </div>
              {slot.inscriptions.length >= slot.places && (
                <span className="text-xs text-red-400">Complet</span>
              )}
            </div>

            {slot.inscriptions.length === 0 ? (
              <p className="px-4 py-4 text-center text-white/20 text-sm">Aucun inscrit</p>
            ) : (
              <div className="divide-y divide-white/5">
                {slot.inscriptions.map(insc => {
                  const st = STATUS_CONFIG[insc.status] || STATUS_CONFIG.inscrit
                  const isExpanded = expandedId === insc.id
                  return (
                    <div key={insc.id}>
                      <div
                        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
                        onClick={() => setExpandedId(isExpanded ? null : insc.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm font-medium text-white">{insc.first_name} {insc.last_name}</span>
                          {insc.social_handle && (
                            <span className="text-xs text-white/30">@{insc.social_handle}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {insc.formation_interet && (
                            <span className="text-xs text-white/30">{insc.formation_interet}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>{st.label}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                          {/* Infos */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-white/40">Téléphone</p>
                              <p className="text-white/70">{insc.phone}</p>
                            </div>
                            {insc.email && (
                              <div>
                                <p className="text-xs text-white/40">Email</p>
                                <p className="text-white/70">{insc.email}</p>
                              </div>
                            )}
                          </div>

                          {insc.motivation && (
                            <div>
                              <p className="text-xs text-white/40 mb-1">Motivation</p>
                              <p className="text-sm text-white/60 italic">"{insc.motivation}"</p>
                            </div>
                          )}

                          {/* Statut buttons */}
                          <div>
                            <p className="text-xs text-white/40 mb-2">Statut</p>
                            <div className="flex gap-1.5 flex-wrap">
                              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <button
                                  key={key}
                                  onClick={() => updateStatus(insc.id, key)}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                                    insc.status === key
                                      ? `${cfg.bg} ${cfg.color} ring-1 ring-white/20`
                                      : 'bg-white/5 text-white/30 hover:text-white/60'
                                  }`}
                                >
                                  {cfg.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Formation intéressée */}
                          <div>
                            <p className="text-xs text-white/40 mb-2">Formation</p>
                            <div className="flex gap-1.5">
                              {FORMATION_OPTIONS.map(f => (
                                <button
                                  key={f}
                                  onClick={() => updateFormation(insc.id, f)}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                                    insc.formation_interet === f
                                      ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30'
                                      : 'bg-white/5 text-white/30 hover:text-white/60'
                                  }`}
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Relance IA */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => generateRelance(insc.id)}
                              disabled={generatingRelance === insc.id}
                              className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition disabled:opacity-50"
                            >
                              {generatingRelance === insc.id ? 'Génération...' : 'Générer relance IA'}
                            </button>
                            <button
                              onClick={() => handleDelete(insc.id)}
                              className="px-3 py-1.5 text-red-400/60 hover:text-red-300 text-xs transition"
                            >
                              Supprimer
                            </button>
                          </div>

                          {relanceMsg[insc.id] && (
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                              <p className="text-xs text-purple-300/60 mb-1">Message de relance</p>
                              <p className="text-sm text-purple-200 whitespace-pre-wrap">{relanceMsg[insc.id]}</p>
                              <button
                                onClick={() => navigator.clipboard.writeText(relanceMsg[insc.id])}
                                className="mt-2 text-xs text-purple-300/60 hover:text-purple-300"
                              >
                                Copier
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
