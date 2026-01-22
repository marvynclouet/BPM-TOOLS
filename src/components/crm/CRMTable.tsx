'use client'

import { useState } from 'react'
import { Lead, UserRole } from '@/types'
import LeadRow from './LeadRow'
import AddLeadModal from './AddLeadModal'
import TrelloView from './TrelloView'

interface Closer {
  id: string
  full_name: string | null
  email: string
}

interface CRMTableProps {
  leads: (Lead & { users?: { full_name: string | null; email: string } | null })[]
  closers: Closer[]
  currentUser: {
    id: string
    role: UserRole
    full_name?: string | null
    email?: string
  } | null
}

export default function CRMTable({ leads, closers, currentUser }: CRMTableProps) {
  const [viewMode, setViewMode] = useState<'table' | 'trello'>('table')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterFormation, setFilterFormation] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)

  // Générer les options de mois (12 derniers mois)
  const getMonthOptions = () => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      options.push({ value: monthYear, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }
    return options
  }

  const filteredLeads = leads.filter((lead) => {
    if (filterStatus !== 'all' && lead.status !== filterStatus) return false
    if (filterFormation !== 'all' && lead.formation !== filterFormation) return false
    if (filterSource !== 'all' && (lead.source || 'direct') !== filterSource) return false
    if (filterMonth !== 'all') {
      const leadDate = new Date(lead.created_at)
      const leadMonth = `${leadDate.getFullYear()}-${String(leadDate.getMonth() + 1).padStart(2, '0')}`
      if (leadMonth !== filterMonth) return false
    }
    return true
  })

  const statusLabels: Record<string, string> = {
    nouveau: '👶 Nouveau',
    chinois: '🇨🇳 Chinois',
    rats: '🐀 Rats',
    nrp: '📞 NRP',
    en_cours_de_closing: '👍 En cours de closing',
    acompte_en_cours: '💰 Acompte en cours',
    appele: 'Appelé',
    acompte_regle: 'Acompte réglé',
    clos: 'Closé',
    ko: 'KO',
  }

  const formationLabels: Record<string, string> = {
    inge_son: 'Ingé son',
    beatmaking: 'Beatmaking',
    autre: 'Autre',
  }

  const sourceLabels: Record<string, string> = {
    manuel: 'Manuel',
    direct: 'Direct',
    instagram: '📷 Instagram',
    tiktok: '🎵 TikTok',
    facebook: '📘 Facebook',
    google: '🔍 Google',
    youtube: '📺 YouTube',
    autre: 'Autre',
  }

  return (
    <div className="space-y-6">
      {/* Filtres, vue et bouton ajouter */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Toggle vue */}
          <div className="flex gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                viewMode === 'table'
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              📋 Tableau
            </button>
            <button
              onClick={() => setViewMode('trello')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                viewMode === 'trello'
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              📊 Trello
            </button>
          </div>

          {/* Filtres (uniquement en mode tableau) */}
          {viewMode === 'table' && (
            <>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="apple-card px-5 py-2.5 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={filterFormation}
                onChange={(e) => setFilterFormation(e.target.value)}
                className="apple-card px-5 py-2.5 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
              >
                <option value="all">Toutes les formations</option>
                {Object.entries(formationLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="apple-card px-5 py-2.5 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
              >
                <option value="all">Tous les mois</option>
                {getMonthOptions().map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="apple-card px-5 py-2.5 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
              >
                <option value="all">Toutes les sources</option>
                {Object.entries(sourceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-2.5 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg hover:shadow-xl"
        >
          ➕ Ajouter un client
        </button>
      </div>

      {/* Modal ajouter client */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onSave={() => setShowAddModal(false)}
          currentUserId={currentUser?.id || null}
        />
      )}

      {/* Vue tableau ou Trello */}
      {viewMode === 'trello' ? (
        <TrelloView leads={leads} closers={closers} currentUser={currentUser} />
      ) : (
        <div className="apple-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed" style={{ minWidth: '1400px' }}>
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '140px' }}>
                  Client
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '110px' }}>
                  Téléphone
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '150px' }}>
                  Email
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '90px' }}>
                  Formation
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '80px' }}>
                  Format
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '80px' }}>
                  Jour
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '110px' }}>
                  Date début
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '110px' }}>
                  Statut
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '100px' }}>
                  Closer
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '100px' }}>
                  Date ajout
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '90px' }}>
                  Prix fixé
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '90px' }}>
                  Acompte
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '100px' }}>
                  Intérêt
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider" style={{ width: '180px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={15} className="px-3 py-12 text-center text-white/40 font-light">
                            Aucun lead trouvé
                          </td>
                        </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} currentUser={currentUser} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  )
}
