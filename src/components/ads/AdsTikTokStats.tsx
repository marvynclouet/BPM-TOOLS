'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

interface TikTokStat {
  id: string
  video_title: string
  video_url: string | null
  views: number
  likes: number
  comments: number
  shares: number
  leads_estimated: number
  post_date: string
  created_at: string
}

export default function AdsTikTokStats() {
  const [stats, setStats] = useState<TikTokStat[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    video_title: '', video_url: '', views: '', likes: '', comments: '', shares: '', leads_estimated: '',
    post_date: new Date().toISOString().split('T')[0],
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/ads/tiktok-stats')
      const data = await res.json()
      setStats(data.stats || [])
    } catch { /* */ }
    finally { setLoading(false) }
  }

  const resetForm = () => {
    setForm({ video_title: '', video_url: '', views: '', likes: '', comments: '', shares: '', leads_estimated: '', post_date: new Date().toISOString().split('T')[0] })
    setEditId(null)
    setShowAdd(false)
  }

  const handleSubmit = async () => {
    if (!form.video_title.trim()) return
    setSubmitting(true)
    try {
      const payload = {
        video_title: form.video_title,
        video_url: form.video_url || null,
        views: parseInt(form.views) || 0,
        likes: parseInt(form.likes) || 0,
        comments: parseInt(form.comments) || 0,
        shares: parseInt(form.shares) || 0,
        leads_estimated: parseInt(form.leads_estimated) || 0,
        post_date: form.post_date,
      }

      if (editId) {
        await fetch(`/api/ads/tiktok-stats/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/ads/tiktok-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      resetForm()
      await fetchStats()
    } catch { /* */ }
    finally { setSubmitting(false) }
  }

  const handleEdit = (s: TikTokStat) => {
    setForm({
      video_title: s.video_title,
      video_url: s.video_url || '',
      views: s.views.toString(),
      likes: s.likes.toString(),
      comments: s.comments.toString(),
      shares: s.shares.toString(),
      leads_estimated: s.leads_estimated.toString(),
      post_date: s.post_date,
    })
    setEditId(s.id)
    setShowAdd(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette stat ?')) return
    await fetch(`/api/ads/tiktok-stats/${id}`, { method: 'DELETE' })
    await fetchStats()
  }

  const totalViews = stats.reduce((s, v) => s + v.views, 0)
  const totalLeads = stats.reduce((s, v) => s + v.leads_estimated, 0)
  const avgEngagement = stats.length > 0
    ? stats.reduce((s, v) => s + (v.views > 0 ? ((v.likes + v.comments + v.shares) / v.views) * 100 : 0), 0) / stats.length
    : 0

  if (loading) return <div className="text-center py-8 text-white/50 text-sm">Chargement...</div>

  return (
    <div className="space-y-3">
      {/* Mini KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-xs text-white/50">Vues totales</p>
          <p className="text-lg font-bold text-white">{totalViews.toLocaleString('fr-FR')}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-xs text-white/50">Leads estimés</p>
          <p className="text-lg font-bold text-blue-300">{totalLeads}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-xs text-white/50">Engagement moy.</p>
          <p className="text-lg font-bold text-cyan-300">{avgEngagement.toFixed(1)}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">{stats.length} vidéo(s)</p>
        <button
          onClick={() => { if (showAdd) resetForm(); else setShowAdd(true) }}
          className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-medium hover:bg-cyan-500/30 transition"
        >
          {showAdd ? 'Annuler' : '+ Ajouter'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={form.video_title} onChange={e => setForm({ ...form, video_title: e.target.value })} placeholder="Titre de la vidéo" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
            <input type="url" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="URL TikTok (optionnel)" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input type="number" value={form.views} onChange={e => setForm({ ...form, views: e.target.value })} placeholder="Vues" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
            <input type="number" value={form.likes} onChange={e => setForm({ ...form, likes: e.target.value })} placeholder="Likes" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
            <input type="number" value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} placeholder="Commentaires" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
            <input type="number" value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} placeholder="Partages" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.leads_estimated} onChange={e => setForm({ ...form, leads_estimated: e.target.value })} placeholder="Leads estimés" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20" />
            <input type="date" value={form.post_date} onChange={e => setForm({ ...form, post_date: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <button onClick={handleSubmit} disabled={submitting || !form.video_title.trim()} className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-xl text-sm font-medium hover:bg-cyan-500/30 transition disabled:opacity-50">
            {submitting ? '...' : editId ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      )}

      {stats.length === 0 ? (
        <p className="text-center py-8 text-white/30 text-sm">Aucune stat TikTok</p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-3 py-2 text-xs text-white/40">Vidéo</th>
                  <th className="text-right px-3 py-2 text-xs text-white/40">Vues</th>
                  <th className="text-right px-3 py-2 text-xs text-white/40">❤️</th>
                  <th className="text-right px-3 py-2 text-xs text-white/40">💬</th>
                  <th className="text-right px-3 py-2 text-xs text-white/40">🔄</th>
                  <th className="text-right px-3 py-2 text-xs text-white/40">Engage.</th>
                  <th className="text-right px-3 py-2 text-xs text-white/40">Leads</th>
                  <th className="text-center px-3 py-2 text-xs text-white/40">Date</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {stats.map(s => {
                  const engagement = s.views > 0 ? ((s.likes + s.comments + s.shares) / s.views * 100) : 0
                  return (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs">🎵</span>
                          {s.video_url ? (
                            <a href={s.video_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-cyan-300 hover:text-cyan-200 truncate max-w-[200px]">{s.video_title}</a>
                          ) : (
                            <span className="text-sm font-medium text-white truncate max-w-[200px]">{s.video_title}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-white/70 text-right">{s.views.toLocaleString('fr-FR')}</td>
                      <td className="px-3 py-2.5 text-sm text-pink-300 text-right">{s.likes.toLocaleString('fr-FR')}</td>
                      <td className="px-3 py-2.5 text-sm text-white/60 text-right">{s.comments}</td>
                      <td className="px-3 py-2.5 text-sm text-white/60 text-right">{s.shares}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          engagement >= 5 ? 'bg-green-500/20 text-green-300' :
                          engagement >= 2 ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-white/10 text-white/50'
                        }`}>
                          {engagement.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-blue-300 font-medium text-right">{s.leads_estimated}</td>
                      <td className="px-3 py-2.5 text-xs text-white/40 text-center">
                        {format(new Date(s.post_date), 'dd/MM/yy', { locale: fr })}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(s)} className="text-xs text-blue-400/60 hover:text-blue-300 px-1">Edit</button>
                          <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400/60 hover:text-red-300 px-1">x</button>
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
            {stats.map(s => {
              const engagement = s.views > 0 ? ((s.likes + s.comments + s.shares) / s.views * 100) : 0
              return (
                <div key={s.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs">🎵</span>
                      <span className="text-sm font-medium text-white truncate">{s.video_title}</span>
                    </div>
                    <span className="text-xs text-white/40 shrink-0">{format(new Date(s.post_date), 'dd/MM', { locale: fr })}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div><p className="text-xs text-white/40">Vues</p><p className="text-sm text-white/70">{s.views.toLocaleString('fr-FR')}</p></div>
                    <div><p className="text-xs text-white/40">❤️</p><p className="text-sm text-pink-300">{s.likes}</p></div>
                    <div><p className="text-xs text-white/40">Engage.</p><p className="text-sm text-cyan-300">{engagement.toFixed(1)}%</p></div>
                    <div><p className="text-xs text-white/40">Leads</p><p className="text-sm text-blue-300">{s.leads_estimated}</p></div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleEdit(s)} className="text-xs text-blue-400/60 hover:text-blue-300">Modifier</button>
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400/60 hover:text-red-300">Supprimer</button>
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
