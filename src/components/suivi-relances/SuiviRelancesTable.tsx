'use client'

import { useState, useCallback } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import RelanceHistoryModal from './RelanceHistoryModal'

interface RelanceLead {
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
  closer_name: string | null
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

interface SuiviRelancesTableProps {
  initialLeads: RelanceLead[]
}

export default function SuiviRelancesTable({ initialLeads }: SuiviRelancesTableProps) {
  const [leads, setLeads] = useState<RelanceLead[]>(initialLeads)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addResults, setAddResults] = useState<any[]>([])
  const [addSearching, setAddSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch('/api/suivi-relances')
      const data = await res.json()
      if (data.leads) setLeads(data.leads)
    } catch { /* */ }
  }, [])

  const handleAddSearch = async (q: string) => {
    setAddSearch(q)
    if (q.length < 2) { setAddResults([]); return }
    setAddSearching(true)
    try {
      const res = await fetch(`/api/suivi-relances/add?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setAddResults(data.leads || [])
    } catch { /* */ }
    setAddSearching(false)
  }

  const handleAddLead = async (leadId: string) => {
    setAdding(leadId)
    try {
      const res = await fetch('/api/suivi-relances/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      if (res.ok) {
        setAddResults(prev => prev.filter(l => l.id !== leadId))
        await refreshData()
      }
    } catch { /* */ }
    setAdding(null)
  }

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setUpdatingStatus(leadId)
    try {
      const res = await fetch('/api/suivi-relances/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status: newStatus }),
      })
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, relance_status: newStatus, alert: newStatus === 'close' || newStatus === 'abandonne' ? false : l.alert } : l))
      }
    } catch { /* */ }
    setUpdatingStatus(null)
  }

  const normalizePhone = (p: string) => {
    let n = p.replace(/\s/g, '').replace(/[^\d+]/g, '')
    if (n.startsWith('0')) n = '+33' + n.substring(1)
    if (!n.startsWith('+')) n = '+33' + n
    return n.replace('+', '')
  }

  // Séparer alertes prioritaires et reste
  const alertLeads = leads.filter(l => l.alert)
  const filtered = leads.filter(l => {
    if (filterStatus !== 'all' && l.relance_status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.first_name.toLowerCase().includes(q) && !l.last_name.toLowerCase().includes(q) && !l.phone.includes(q)) return false
    }
    return true
  })

  const selectedLead = selectedLeadId ? leads.find(l => l.id === selectedLeadId) : null

  // --- Card prioritaire (alerte) ---
  const AlertCard = ({ lead }: { lead: RelanceLead }) => {
    const daysSince = lead.last_contact
      ? formatDistanceToNow(new Date(lead.last_contact), { locale: fr })
      : null
    return (
      <div
        className="apple-card rounded-xl p-4 border border-red-500/30 bg-red-500/[0.08] cursor-pointer hover:bg-red-500/[0.12] transition"
        onClick={() => setSelectedLeadId(lead.id)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{lead.first_name} {lead.last_name}</p>
              <p className="text-xs text-red-300/70">{lead.phone}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-red-400 font-medium">Sans réponse</p>
            <p className="text-xs text-red-300/60">{daysSince ? `depuis ${daysSince}` : ''}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-white/50">
          <span>{FORMATION_LABELS[lead.formation] || lead.formation}</span>
          {lead.price_fixed && <span>{lead.price_fixed} €</span>}
          {lead.last_sender && (
            <span className="text-white/40">
              Dernier msg : {lead.last_sender === 'nous' ? 'nous' : 'eux'}
            </span>
          )}
        </div>
        {lead.last_message && (
          <p className="mt-1.5 text-xs text-white/40 truncate italic">&laquo; {lead.last_message} &raquo;</p>
        )}
      </div>
    )
  }

  // --- Ligne tableau ---
  const TableRow = ({ lead }: { lead: RelanceLead }) => {
    const sc = STATUS_CONFIG[lead.relance_status] || STATUS_CONFIG.en_attente
    return (
      <tr
        className={`hover:bg-white/[0.03] transition cursor-pointer ${lead.alert ? 'bg-red-500/[0.06]' : ''}`}
        onClick={() => setSelectedLeadId(lead.id)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {lead.alert && (
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
            <span className="text-sm font-medium text-white">{lead.first_name} {lead.last_name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-white/70">{lead.phone}</td>
        <td className="px-4 py-3 text-sm text-white/80">{FORMATION_LABELS[lead.formation] || lead.formation}</td>
        <td className="px-4 py-3 text-sm text-white/80">{lead.price_fixed ? `${lead.price_fixed} €` : '—'}</td>
        <td className="px-4 py-3 text-sm text-white/70">
          {lead.formation_start_date ? format(new Date(lead.formation_start_date), 'dd MMM yyyy', { locale: fr }) : '—'}
        </td>
        <td className="px-4 py-3">
          <select
            value={lead.relance_status}
            onChange={e => { e.stopPropagation(); handleStatusChange(lead.id, e.target.value) }}
            onClick={e => e.stopPropagation()}
            disabled={updatingStatus === lead.id}
            className={`${sc.bg} ${sc.color} text-xs font-medium px-2 py-1 rounded-lg border-0 focus:outline-none cursor-pointer`}
          >
            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key} className="bg-[#2a2a2a] text-white">{label}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <div>
            {lead.last_contact ? (
              <span className={`text-xs ${lead.alert ? 'text-red-400 font-medium' : 'text-white/50'}`}>
                {format(new Date(lead.last_contact), 'dd MMM yyyy', { locale: fr })}
              </span>
            ) : <span className="text-xs text-white/30">—</span>}
            {lead.last_sender && (
              <span className={`text-xs block ${lead.last_sender === 'nous' ? 'text-green-400/60' : 'text-blue-400/60'}`}>
                {lead.last_sender === 'nous' ? 'Envoyé par nous' : 'Réponse reçue'}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          {lead.last_message ? (
            <p className="text-xs text-white/40 truncate max-w-[180px] italic">{lead.last_message}</p>
          ) : <span className="text-xs text-white/30">—</span>}
        </td>
      </tr>
    )
  }

  // --- Mobile card ---
  const MobileCard = ({ lead }: { lead: RelanceLead }) => {
    const sc = STATUS_CONFIG[lead.relance_status] || STATUS_CONFIG.en_attente
    return (
      <div
        className={`apple-card rounded-xl p-4 space-y-3 cursor-pointer hover:bg-white/[0.03] transition ${lead.alert ? 'ring-1 ring-red-500/30 bg-red-500/[0.05]' : ''}`}
        onClick={() => setSelectedLeadId(lead.id)}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {lead.alert && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            )}
            <div>
              <h3 className="text-base font-semibold text-white">{lead.first_name} {lead.last_name}</h3>
              <p className="text-xs text-white/50">{lead.phone}</p>
            </div>
          </div>
          <span className={`${sc.bg} ${sc.color} text-xs font-medium px-2 py-1 rounded-lg`}>{sc.label}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-white/50">Formation:</span> <span className="text-white">{FORMATION_LABELS[lead.formation] || lead.formation}</span></div>
          {lead.price_fixed && <div><span className="text-white/50">Prix:</span> <span className="text-white">{lead.price_fixed} €</span></div>}
          <div className="col-span-2">
            <span className="text-white/50">Dernier contact:</span>
            <span className={`ml-1 ${lead.alert ? 'text-red-400' : 'text-white'}`}>
              {lead.last_contact ? format(new Date(lead.last_contact), 'dd MMM yyyy', { locale: fr }) : '—'}
            </span>
            {lead.last_sender && <span className="text-white/40 ml-1">({lead.last_sender === 'nous' ? 'nous' : 'eux'})</span>}
          </div>
        </div>
        {lead.last_message && (
          <p className="text-xs text-white/40 truncate italic">&laquo; {lead.last_message} &raquo;</p>
        )}
      </div>
    )
  }

  return (
    <>
      {/* === SECTION PRIORITAIRE : SANS RÉPONSE > 3 JOURS === */}
      {alertLeads.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-red-400">Sans réponse depuis +3 jours</h2>
            <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full text-xs font-medium">{alertLeads.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alertLeads.map(lead => <AlertCard key={lead.id} lead={lead} />)}
          </div>
        </div>
      )}

      {/* === FILTRES === */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou tél..."
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 w-full sm:w-64"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/20"
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button
          onClick={() => { setShowAddModal(true); setAddSearch(''); setAddResults([]) }}
          className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition"
        >
          + Ajouter un contact
        </button>
        <span className="text-white/40 text-sm ml-auto">{filtered.length} contact{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* === TABLEAU COMPLET === */}
      {filtered.length === 0 ? (
        <div className="apple-card rounded-2xl p-12 text-center">
          <p className="text-white/50 text-lg font-light">Aucun contact WhatsApp trouvé</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block apple-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Nom</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Téléphone</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Formation</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Prix</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Début</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Dernier contact</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Dernier message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map(lead => <TableRow key={lead.id} lead={lead} />)}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile */}
          <div className="lg:hidden space-y-3">
            {filtered.map(lead => <MobileCard key={lead.id} lead={lead} />)}
          </div>
        </>
      )}

      {/* === MODAL AJOUT MANUEL === */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Ajouter au suivi relances</h2>
              <button onClick={() => setShowAddModal(false)} className="text-white/50 hover:text-white transition p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                value={addSearch}
                onChange={e => handleAddSearch(e.target.value)}
                placeholder="Rechercher par nom ou téléphone..."
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
              />
              <div className="max-h-64 overflow-y-auto space-y-2">
                {addSearching && <p className="text-white/50 text-sm text-center py-4">Recherche...</p>}
                {!addSearching && addSearch.length >= 2 && addResults.length === 0 && (
                  <p className="text-white/50 text-sm text-center py-4">Aucun lead trouvé</p>
                )}
                {addResults.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{lead.first_name} {lead.last_name}</p>
                      <p className="text-xs text-white/50">{lead.phone} &middot; {FORMATION_LABELS[lead.formation] || lead.formation}</p>
                    </div>
                    <button
                      onClick={() => handleAddLead(lead.id)}
                      disabled={adding === lead.id}
                      className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-medium hover:bg-white/20 transition disabled:opacity-50"
                    >
                      {adding === lead.id ? '...' : 'Ajouter'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === FICHE DÉTAIL (clic sur un contact) === */}
      {selectedLead && (
        <RelanceHistoryModal
          lead={selectedLead}
          onClose={() => setSelectedLeadId(null)}
          onDataChanged={refreshData}
          onStatusChange={handleStatusChange}
          normalizePhone={normalizePhone}
        />
      )}
    </>
  )
}
