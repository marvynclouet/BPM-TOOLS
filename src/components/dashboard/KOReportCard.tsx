'use client'

import { useState, useEffect } from 'react'
import { getCachedReport, setCachedReport } from '@/lib/report-cache'

const CACHE_KEY = 'bpm_report_ko'

type Cached = { report: string; koCount: number; withoutComment: number }

export default function KOReportCard({ onLoaded }: { onLoaded?: () => void }) {
  const [report, setReport] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{ koCount: number; withoutComment: number } | null>(null)
  const [isRateLimit, setIsRateLimit] = useState(false)

  const generate = async (skipCache = false) => {
    if (!skipCache) {
      const cached = getCachedReport<Cached>(CACHE_KEY)
      if (cached?.report) {
        setReport(cached.report)
        setStats({ koCount: cached.koCount || 0, withoutComment: cached.withoutComment || 0 })
        setLoading(false)
        onLoaded?.()
        return
      }
    }
    setLoading(true)
    setError(null)
    setReport(null)
    setStats(null)
    setIsRateLimit(false)
    try {
      const res = await fetch('/api/ai/ko-report')
      const data = await res.json()
      if (!res.ok) {
        setIsRateLimit(res.status === 429)
        throw new Error(data.error || 'Erreur')
      }
      setReport(data.report)
      setStats({ koCount: data.koCount || 0, withoutComment: data.withoutComment || 0 })
      if (data.report) setCachedReport(CACHE_KEY, { report: data.report, koCount: data.koCount || 0, withoutComment: data.withoutComment || 0 })
    } catch (err: any) {
      setError(err.message || 'Erreur')
    } finally {
      setLoading(false)
      onLoaded?.()
    }
  }

  useEffect(() => {
    generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="apple-card rounded-xl p-4 sm:p-5 border-white/5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase">
            ❌ Rapport leads KO
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            Analyse des motifs de KO grâce aux commentaires
          </p>
        </div>
        <button
          onClick={() => generate(true)}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          title="Rafraîchir"
        >
          {loading ? 'Analyse...' : '↻ Rafraîchir'}
        </button>
      </div>
      {stats && stats.withoutComment > 0 && (
        <p className="text-amber-400/90 text-xs mb-2">
          ⚠️ {stats.withoutComment} lead{stats.withoutComment > 1 ? 's' : ''} KO sans commentaire
        </p>
      )}
      {loading && (
        <div className="py-6 text-center text-white/50 text-sm">Analyse en cours...</div>
      )}
      {error && (
        <div className={`py-4 p-3 rounded-lg text-sm ${isRateLimit ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          <p className="font-medium">{isRateLimit ? '⚠️ Quota IA dépassé' : 'Erreur'}</p>
          <p className="mt-1">{error}</p>
        </div>
      )}
      {report && !loading && (
        <div className="mt-3 p-4 rounded-lg bg-white/5 border border-white/10 text-sm text-white/90 whitespace-pre-wrap leading-relaxed max-h-[280px] overflow-y-auto">
          {report}
        </div>
      )}
      {!report && !loading && !error && (
        <p className="text-white/40 text-sm py-4">
          Aucun lead KO avec commentaire à analyser.
        </p>
      )}
    </div>
  )
}
