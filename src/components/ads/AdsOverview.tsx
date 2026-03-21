'use client'

import { useState, useEffect } from 'react'

interface SourceStat {
  source: string
  leads: number
  closed: number
  ca: number
  conversion: number
}

interface Totals {
  leads: number
  closed: number
  ca: number
  spent: number
  roi: number | null
}

const SOURCE_LABELS: Record<string, string> = {
  tiktok: '🎵 TikTok',
  instagram: '📷 Instagram',
  facebook: '📘 Facebook',
  google: '🔍 Google',
  youtube: '📺 YouTube',
  direct: '🔗 Direct',
  manuel: '✏️ Manuel',
}

const PERCENT_OPTIONS = [5, 8, 10, 12, 15, 20, 25, 30]

export default function AdsOverview() {
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([])
  const [totals, setTotals] = useState<Totals>({ leads: 0, closed: 0, ca: 0, spent: 0, roi: null })
  const [budgetPercent, setBudgetPercent] = useState(10)
  const [loading, setLoading] = useState(true)
  const [savingPercent, setSavingPercent] = useState(false)

  useEffect(() => {
    const t = Date.now()
    Promise.all([
      fetch(`/api/ads/overview?t=${t}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/ads/settings?t=${t}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/ads/campaigns?t=${t}`, { cache: 'no-store' }).then(r => r.json()),
    ])
      .then(([overviewData, settingsData, campaignsData]) => {
        setSourceStats(overviewData.sourceStats || [])
        // Calculer le spent directement depuis les campagnes
        const campaigns = campaignsData.campaigns || []
        const realSpent = campaigns.reduce((sum: number, c: any) => sum + (Number(c.spent) || 0), 0)
        const baseTotals = overviewData.totals || { leads: 0, closed: 0, ca: 0, spent: 0, roi: null }
        const spent = Math.round(realSpent * 100) / 100
        setTotals({
          ...baseTotals,
          spent,
          roi: spent > 0 ? Math.round(((baseTotals.ca - spent) / spent) * 100) : null,
        })
        setBudgetPercent(settingsData.budget_percent || 10)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handlePercentChange = async (pct: number) => {
    setBudgetPercent(pct)
    setSavingPercent(true)
    try {
      await fetch('/api/ads/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget_percent: pct }),
      })
    } catch { /* */ }
    finally { setSavingPercent(false) }
  }

  if (loading) return <div className="text-center py-8 text-white/50 text-sm">Chargement...</div>

  const budgetDispo = Math.round(totals.ca * budgetPercent / 100)
  const restant = budgetDispo - totals.spent
  const usagePct = budgetDispo > 0 ? Math.min(100, Math.round((totals.spent / budgetDispo) * 100)) : 0

  return (
    <div className="space-y-4">
      {/* Budget calculator */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Budget Ads</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">% du CA :</span>
            <select
              value={budgetPercent}
              onChange={e => handlePercentChange(Number(e.target.value))}
              disabled={savingPercent}
              className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-sm text-white font-medium focus:outline-none"
            >
              {PERCENT_OPTIONS.map(p => (
                <option key={p} value={p}>{p}%</option>
              ))}
            </select>
          </div>
        </div>

        {/* Budget KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/5 rounded-xl px-4 py-3">
            <p className="text-xs text-white/50">CA total</p>
            <p className="text-xl font-bold text-emerald-300">{totals.ca.toLocaleString('fr-FR')} €</p>
          </div>
          <div className="bg-white/5 rounded-xl px-4 py-3">
            <p className="text-xs text-white/50">Budget dispo ({budgetPercent}%)</p>
            <p className="text-xl font-bold text-white">{budgetDispo.toLocaleString('fr-FR')} €</p>
          </div>
          <div className="bg-white/5 rounded-xl px-4 py-3">
            <p className="text-xs text-white/50">Dépensé</p>
            <p className={`text-xl font-bold ${usagePct > 90 ? 'text-red-300' : usagePct > 70 ? 'text-yellow-300' : 'text-orange-300'}`}>
              {totals.spent.toLocaleString('fr-FR')} €
            </p>
          </div>
          <div className="bg-white/5 rounded-xl px-4 py-3">
            <p className="text-xs text-white/50">Restant</p>
            <p className={`text-xl font-bold ${restant < 0 ? 'text-red-400' : restant < budgetDispo * 0.2 ? 'text-yellow-300' : 'text-green-300'}`}>
              {restant.toLocaleString('fr-FR')} €
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/40">Utilisation du budget</span>
            <span className={`text-xs font-medium ${usagePct > 90 ? 'text-red-300' : usagePct > 70 ? 'text-yellow-300' : 'text-white/60'}`}>
              {usagePct}%
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePct > 90 ? 'bg-red-400' : usagePct > 70 ? 'bg-yellow-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Leads total', value: totals.leads.toString(), color: 'text-white' },
          { label: 'Closés', value: totals.closed.toString(), color: 'text-green-300' },
          { label: 'ROI global', value: totals.roi !== null ? `${totals.roi > 0 ? '+' : ''}${totals.roi}%` : '-', color: totals.roi !== null && totals.roi > 0 ? 'text-green-300' : 'text-red-300' },
          { label: 'CPL moyen', value: totals.leads > 0 ? `${Math.round(totals.spent / totals.leads)} €` : '-', color: 'text-orange-300' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <p className="text-xs text-white/50">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* CA par source */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-medium text-white">Performance par source</h3>
        </div>
        {sourceStats.length === 0 ? (
          <p className="text-center py-6 text-white/30 text-sm">Aucune donnée</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-2 text-xs text-white/40">Source</th>
                <th className="text-right px-4 py-2 text-xs text-white/40">Leads</th>
                <th className="text-right px-4 py-2 text-xs text-white/40">Closés</th>
                <th className="text-right px-4 py-2 text-xs text-white/40">Conversion</th>
                <th className="text-right px-4 py-2 text-xs text-white/40">CA</th>
              </tr>
            </thead>
            <tbody>
              {sourceStats.map(s => (
                <tr key={s.source} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-4 py-2.5 text-sm text-white">{SOURCE_LABELS[s.source] || s.source}</td>
                  <td className="px-4 py-2.5 text-sm text-white/70 text-right">{s.leads}</td>
                  <td className="px-4 py-2.5 text-sm text-green-300 text-right">{s.closed}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      s.conversion >= 30 ? 'bg-green-500/20 text-green-300' :
                      s.conversion >= 15 ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {s.conversion}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-emerald-300 font-medium text-right">{s.ca.toLocaleString('fr-FR')} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
