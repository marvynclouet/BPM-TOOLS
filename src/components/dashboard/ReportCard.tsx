'use client'

import { useState, useEffect } from 'react'
import { getCachedReport, setCachedReport } from '@/lib/report-cache'

interface Closer {
  id: string
  full_name: string
  email: string
}

interface ReportCardProps {
  currentUserId: string
  isAdmin: boolean
  onLoaded?: () => void
}

function cacheKey(period: 'week' | 'month', closerId: string | undefined) {
  return `bpm_report_${period}_${closerId || 'global'}`
}

export default function ReportCard({ currentUserId, isAdmin, onLoaded }: ReportCardProps) {
  const [report, setReport] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRateLimit, setIsRateLimit] = useState(false)
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [selectedCloserId, setSelectedCloserId] = useState<string>('')
  const [closers, setClosers] = useState<Closer[]>([])

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/ai/closers-for-report')
        .then((r) => r.json())
        .then((d) => setClosers(d.closers || []))
        .catch(() => setClosers([]))
    }
  }, [isAdmin])

  const generateReport = async (p: 'week' | 'month', forceRefresh = false) => {
    setPeriod(p)
    const targetCloserId = isAdmin ? (selectedCloserId || undefined) : currentUserId
    const key = cacheKey(p, targetCloserId)

    if (!forceRefresh) {
      const cached = getCachedReport<{ report: string }>(key)
      if (cached?.report) {
        setReport(cached.report)
        onLoaded?.()
        return
      }
    }

    setLoading(true)
    setError(null)
    setIsRateLimit(false)
    setReport(null)
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: p, closerId: targetCloserId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setIsRateLimit(res.status === 429)
        throw new Error(data.error || 'Erreur')
      }
      setReport(data.report)
      if (data.report) setCachedReport(key, { report: data.report })
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la génération')
    } finally {
      setLoading(false)
      onLoaded?.()
    }
  }

  useEffect(() => {
    generateReport('week')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGenerate = (p: 'week' | 'month') => {
    generateReport(p, false)
  }

  const subtitle = isAdmin
    ? selectedCloserId
      ? `Rapport de ${closers.find((c) => c.id === selectedCloserId)?.full_name || 'closer'}`
      : 'Rapport équipe'
    : 'Mon rapport perso'

  return (
    <div className="apple-card rounded-xl p-4 sm:p-5 border-white/5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase">
            📄 Rapport IA
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            {subtitle} · {period === 'week' ? 'hebdo' : 'mensuel'}
          </p>
        </div>
        {isAdmin && closers.length > 0 && (
          <select
            value={selectedCloserId}
            onChange={(e) => setSelectedCloserId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30"
          >
            <option value="">Équipe (global)</option>
            {closers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => handleGenerate('week')}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hebdo
          </button>
          <button
            onClick={() => handleGenerate('month')}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mensuel
          </button>
        </div>
      </div>
      {loading && (
        <div className="py-8 text-center text-white/50 text-sm">Génération en cours...</div>
      )}
      {error && (
        <div className={`py-4 p-3 rounded-lg text-sm ${isRateLimit ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          <p className="font-medium">{isRateLimit ? '⚠️ Quota IA dépassé' : 'Erreur'}</p>
          <p className="mt-1">{error}</p>
        </div>
      )}
      {report && !loading && (
        <div className="mt-3 p-4 rounded-lg bg-white/5 border border-white/10 text-sm text-white/90 whitespace-pre-wrap leading-relaxed max-h-[320px] overflow-y-auto">
          {report}
        </div>
      )}
      {!report && !loading && !error && (
        <p className="text-white/40 text-sm py-4">Rapport en cours de génération…</p>
      )}
    </div>
  )
}
