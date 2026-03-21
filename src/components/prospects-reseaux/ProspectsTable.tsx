'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import ProspectDetailModal from './ProspectDetailModal'
import AddProspectModal from './AddProspectModal'

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
  last_message: string | null
  last_message_at: string | null
  last_message_direction: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  repere: { label: 'Repéré', color: 'text-gray-300', bg: 'bg-gray-500/20' },
  contacte: { label: 'Contacté', color: 'text-blue-300', bg: 'bg-blue-500/20' },
  a_repondu: { label: 'A répondu', color: 'text-yellow-300', bg: 'bg-yellow-500/20' },
  numero_recupere: { label: 'N° récupéré', color: 'text-orange-300', bg: 'bg-orange-500/20' },
  en_discussion: { label: 'En discussion', color: 'text-purple-300', bg: 'bg-purple-500/20' },
  close: { label: 'Closé', color: 'text-green-300', bg: 'bg-green-500/20' },
  froid: { label: 'Froid', color: 'text-red-300', bg: 'bg-red-500/20' },
}

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: '🎵',
  instagram: '📷',
}

const FORMATION_LABELS: Record<string, string> = {
  inge_son: 'Ingé son',
  beatmaking: 'Beatmaking',
  autre: 'Autre',
}

export default function ProspectsTable() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => { fetchProspects() }, [])

  const fetchProspects = async () => {
    try {
      const res = await fetch('/api/prospects-reseaux')
      const data = await res.json()
      setProspects(data.prospects || [])
    } catch { /* */ }
    finally { setLoading(false) }
  }

  const filtered = prospects.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    if (filterPlatform !== 'all' && p.platform !== filterPlatform) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.username.toLowerCase().includes(q) && !(p.notes || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const stats = {
    total: prospects.length,
    repere: prospects.filter(p => p.status === 'repere').length,
    contacte: prospects.filter(p => p.status === 'contacte').length,
    a_repondu: prospects.filter(p => p.status === 'a_repondu').length,
    en_discussion: prospects.filter(p => ['numero_recupere', 'en_discussion'].includes(p.status)).length,
    close: prospects.filter(p => p.status === 'close').length,
  }

  return (
    <>
      {selectedProspect && (
        <ProspectDetailModal
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onUpdate={fetchProspects}
        />
      )}
      {showAddModal && (
        <AddProspectModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); fetchProspects() }}
        />
      )}

      <div className="space-y-4">
        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Repérés', value: stats.repere, color: 'text-gray-300' },
            { label: 'Contactés', value: stats.contacte, color: 'text-blue-300' },
            { label: 'Ont répondu', value: stats.a_repondu, color: 'text-yellow-300' },
            { label: 'En discussion', value: stats.en_discussion, color: 'text-purple-300' },
            { label: 'Closés', value: stats.close, color: 'text-green-300' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <p className="text-xs text-white/50">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Rechercher un pseudo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="all">Toutes plateformes</option>
            <option value="tiktok">🎵 TikTok</option>
            <option value="instagram">📷 Instagram</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="all">Tous statuts</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-xl text-sm font-medium hover:bg-indigo-500/30 transition"
          >
            + Ajouter
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-white/50">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            {prospects.length === 0 ? 'Aucun prospect. Ajoute ton premier prospect !' : 'Aucun résultat pour ces filtres.'}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-3 py-2 text-xs text-white/50 font-medium">Pseudo</th>
                    <th className="text-left px-3 py-2 text-xs text-white/50 font-medium">Plateforme</th>
                    <th className="text-left px-3 py-2 text-xs text-white/50 font-medium">Statut</th>
                    <th className="text-left px-3 py-2 text-xs text-white/50 font-medium">Formation</th>
                    <th className="text-left px-3 py-2 text-xs text-white/50 font-medium">Dernier message</th>
                    <th className="text-left px-3 py-2 text-xs text-white/50 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const st = STATUS_CONFIG[p.status] || STATUS_CONFIG.repere
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedProspect(p)}
                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition"
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">@{p.username}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-sm">{PLATFORM_ICONS[p.platform]} {p.platform === 'tiktok' ? 'TikTok' : 'Instagram'}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-white/60">
                          {p.formation ? FORMATION_LABELS[p.formation] || p.formation : '-'}
                        </td>
                        <td className="px-3 py-3">
                          {p.last_message ? (
                            <div className="max-w-[250px]">
                              <p className="text-xs text-white/60 truncate">
                                {p.last_message_direction === 'sent' ? '→ ' : '← '}
                                {p.last_message}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-white/30">Aucun échange</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-white/40">
                          {p.last_message_at
                            ? format(new Date(p.last_message_at), 'dd MMM yyyy', { locale: fr })
                            : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {filtered.map(p => {
                const st = STATUS_CONFIG[p.status] || STATUS_CONFIG.repere
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProspect(p)}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/8 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{PLATFORM_ICONS[p.platform]}</span>
                        <span className="text-sm font-medium text-white">@{p.username}</span>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    {p.formation && (
                      <p className="text-xs text-white/50 mb-1">{FORMATION_LABELS[p.formation] || p.formation}</p>
                    )}
                    {p.last_message && (
                      <p className="text-xs text-white/40 truncate">
                        {p.last_message_direction === 'sent' ? '→ ' : '← '}
                        {p.last_message}
                        {p.last_message_at && (
                          <span className="ml-2 text-white/30">
                            {format(new Date(p.last_message_at), 'dd MMM', { locale: fr })}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}
