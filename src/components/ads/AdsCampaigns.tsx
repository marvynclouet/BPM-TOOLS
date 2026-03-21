'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

interface Campaign {
  id: string
  name: string
  platform: string
  budget: number
  spent: number
  leads_generated: number
  cpl: number | null
  status: string
  date_start: string | null
  date_end: string | null
  notes: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-green-300', bg: 'bg-green-500/20' },
  paused: { label: 'Pausée', color: 'text-yellow-300', bg: 'bg-yellow-500/20' },
  ended: { label: 'Terminée', color: 'text-gray-300', bg: 'bg-gray-500/20' },
}

const PLATFORM_LABELS: Record<string, string> = {
  meta: '📘 Meta',
  tiktok: '🎵 TikTok',
  google: '🔍 Google',
  autre: '📋 Autre',
}

export default function AdsCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', platform: 'meta', spent: '', leads_generated: '',
    status: 'active', date_start: '', date_end: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchCampaigns() }, [])

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/ads/campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch { /* */ }
    finally { setLoading(false) }
  }

  const resetForm = () => {
    setForm({ name: '', platform: 'meta', spent: '', leads_generated: '', status: 'active', date_start: '', date_end: '', notes: '' })
    setEditId(null)
    setShowAdd(false)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        platform: form.platform,
        budget: 0,
        spent: parseFloat(form.spent) || 0,
        leads_generated: parseInt(form.leads_generated) || 0,
        status: form.status,
        date_start: form.date_start || null,
        date_end: form.date_end || null,
        notes: form.notes || null,
      }

      if (editId) {
        await fetch(`/api/ads/campaigns/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/ads/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      resetForm()
      await fetchCampaigns()
    } catch { /* */ }
    finally { setSubmitting(false) }
  }

  const handleEdit = (c: Campaign) => {
    setForm({
      name: c.name,
      platform: c.platform,
      spent: c.spent.toString(),
      leads_generated: c.leads_generated.toString(),
      status: c.status,
      date_start: c.date_start || '',
      date_end: c.date_end || '',
      notes: c.notes || '',
    })
    setEditId(c.id)
    setShowAdd(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return
    await fetch(`/api/ads/campaigns/${id}`, { method: 'DELETE' })
    await fetchCampaigns()
  }

  const handleStatusToggle = async (c: Campaign) => {
    const next = c.status === 'active' ? 'paused' : c.status === 'paused' ? 'active' : c.status
    await fetch(`/api/ads/campaigns/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    await fetchCampaigns()
  }

  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
  const totalLeads = campaigns.reduce((s, c) => s + c.leads_generated, 0)

  if (loading) return <div className="text-center py-8 text-white/50 text-sm">Chargement...</div>

  return (
    <div className="space-y-3">
      {/* Totaux campagnes */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-xs text-white/50">Total dépensé</p>
          <p className="text-lg font-bold text-orange-300">{totalSpent.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-xs text-white/50">Total leads</p>
          <p className="text-lg font-bold text-blue-300">{totalLeads}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-xs text-white/50">CPL moyen</p>
          <p className="text-lg font-bold text-white">{totalLeads > 0 ? `${(totalSpent / totalLeads).toFixed(2)} €` : '-'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">{campaigns.length} campagne(s)</p>
        <button
          onClick={() => { if (showAdd) resetForm(); else setShowAdd(true) }}
          className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-500/30 transition"
        >
          {showAdd ? 'Annuler' : '+ Ajouter'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nom de la campagne" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
            <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
              {Object.entries(PLATFORM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <input type="number" value={form.spent} onChange={e => setForm({ ...form, spent: e.target.value })} placeholder="Dépensé €" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
            <input type="number" value={form.leads_generated} onChange={e => setForm({ ...form, leads_generated: e.target.value })} placeholder="Leads générés" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
              <option value="active">Active</option>
              <option value="paused">Pausée</option>
              <option value="ended">Terminée</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={form.date_start} onChange={e => setForm({ ...form, date_start: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
            <input type="date" value={form.date_end} onChange={e => setForm({ ...form, date_end: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optionnel)" rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none" />
          <button onClick={handleSubmit} disabled={submitting || !form.name.trim()} className="px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-xl text-sm font-medium hover:bg-indigo-500/30 transition disabled:opacity-50">
            {submitting ? '...' : editId ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      )}

      {campaigns.length === 0 ? (
        <p className="text-center py-8 text-white/30 text-sm">Aucune campagne</p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-3 py-2 text-xs text-white/40">Campagne</th>
                  <th className="text-right px-3 py-2 text-xs text-white/40">Dépensé</th>
                  <th className="text-right px-3 py-2 text-xs text-white/40">Leads</th>
                  <th className="text-right px-3 py-2 text-xs text-white/40">CPL</th>
                  <th className="text-center px-3 py-2 text-xs text-white/40">Statut</th>
                  <th className="text-center px-3 py-2 text-xs text-white/40">Période</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => {
                  const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.active
                  return (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{PLATFORM_LABELS[c.platform]?.split(' ')[0] || '📋'}</span>
                          <div>
                            <span className="text-sm font-medium text-white">{c.name}</span>
                            {c.notes && <p className="text-xs text-white/30 truncate max-w-[200px]">{c.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-orange-300 font-medium text-right">{c.spent.toLocaleString('fr-FR')} €</td>
                      <td className="px-3 py-2.5 text-sm text-blue-300 text-right">{c.leads_generated}</td>
                      <td className="px-3 py-2.5 text-sm text-white/70 text-right">{c.cpl ? `${c.cpl.toFixed(2)} €` : '-'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => handleStatusToggle(c)} className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.color} hover:opacity-80 transition`}>
                          {st.label}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/40 text-center">
                        {c.date_start ? format(new Date(c.date_start), 'dd/MM', { locale: fr }) : '?'}
                        {' → '}
                        {c.date_end ? format(new Date(c.date_end), 'dd/MM', { locale: fr }) : '...'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(c)} className="text-xs text-blue-400/60 hover:text-blue-300 px-1">Edit</button>
                          <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400/60 hover:text-red-300 px-1">x</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {campaigns.map(c => {
              const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.active
              return (
                <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{PLATFORM_LABELS[c.platform]?.split(' ')[0]}</span>
                      <span className="text-sm font-medium text-white">{c.name}</span>
                    </div>
                    <button onClick={() => handleStatusToggle(c)} className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>{st.label}</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-xs text-white/40">Dépensé</p><p className="text-sm text-orange-300">{c.spent.toLocaleString('fr-FR')}€</p></div>
                    <div><p className="text-xs text-white/40">Leads</p><p className="text-sm text-blue-300">{c.leads_generated}</p></div>
                    <div><p className="text-xs text-white/40">CPL</p><p className="text-sm text-white/70">{c.cpl ? `${c.cpl.toFixed(2)}€` : '-'}</p></div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleEdit(c)} className="text-xs text-blue-400/60 hover:text-blue-300">Modifier</button>
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400/60 hover:text-red-300">Supprimer</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
