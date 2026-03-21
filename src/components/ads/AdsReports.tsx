'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

interface Report {
  id: string
  report_date: string
  source: string
  title: string
  content: string
  recommendations: string | null
  created_at: string
}

const SOURCE_LABELS: Record<string, string> = {
  tiktok: '🎵 TikTok',
  meta: '📘 Meta Ads',
  instagram: '📷 Instagram',
  google: '🔍 Google',
  autre: '📋 Autre',
}

export default function AdsReports() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', source: 'meta', content: '', recommendations: '', report_date: new Date().toISOString().split('T')[0] })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchReports() }, [])

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/ads/reports')
      const data = await res.json()
      setReports(data.reports || [])
    } catch { /* */ }
    finally { setLoading(false) }
  }

  const handleAdd = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/ads/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowAdd(false)
        setForm({ title: '', source: 'meta', content: '', recommendations: '', report_date: new Date().toISOString().split('T')[0] })
        await fetchReports()
      }
    } catch { /* */ }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce rapport ?')) return
    await fetch(`/api/ads/reports/${id}`, { method: 'DELETE' })
    await fetchReports()
  }

  if (loading) return <div className="text-center py-8 text-white/50 text-sm">Chargement...</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">{reports.length} rapport(s)</p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-500/30 transition"
        >
          {showAdd ? 'Annuler' : '+ Ajouter un rapport'}
        </button>
      </div>

      {/* Form */}
      {showAdd && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Titre du rapport"
              className="sm:col-span-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />
            <select
              value={form.source}
              onChange={e => setForm({ ...form, source: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            >
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <textarea
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            placeholder="Contenu du rapport..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
          />
          <textarea
            value={form.recommendations}
            onChange={e => setForm({ ...form, recommendations: e.target.value })}
            placeholder="Recommandations IA (optionnel)..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
          />
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={form.report_date}
              onChange={e => setForm({ ...form, report_date: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={submitting || !form.title.trim() || !form.content.trim()}
              className="px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-xl text-sm font-medium hover:bg-indigo-500/30 transition disabled:opacity-50"
            >
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {reports.length === 0 ? (
        <p className="text-center py-8 text-white/30 text-sm">Aucun rapport sauvegardé</p>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm shrink-0">{SOURCE_LABELS[r.source]?.split(' ')[0] || '📋'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.title}</p>
                    <p className="text-xs text-white/40">{format(new Date(r.report_date), 'dd MMMM yyyy', { locale: fr })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    r.source === 'meta' ? 'bg-blue-500/20 text-blue-300' :
                    r.source === 'tiktok' ? 'bg-cyan-500/20 text-cyan-300' :
                    'bg-white/10 text-white/60'
                  }`}>
                    {SOURCE_LABELS[r.source]?.split(' ').slice(1).join(' ') || r.source}
                  </span>
                  <span className="text-white/30 text-sm">{expanded === r.id ? '▲' : '▼'}</span>
                </div>
              </div>
              {expanded === r.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Contenu</p>
                    <p className="text-sm text-white/80 whitespace-pre-wrap">{r.content}</p>
                  </div>
                  {r.recommendations && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                      <p className="text-xs text-purple-300/60 mb-1">Recommandations</p>
                      <p className="text-sm text-purple-200 whitespace-pre-wrap">{r.recommendations}</p>
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-red-400/60 hover:text-red-300 transition"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
