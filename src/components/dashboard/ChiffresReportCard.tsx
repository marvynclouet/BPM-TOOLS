'use client'

import { useState, useEffect } from 'react'
import { getCachedReport, setCachedReport } from '@/lib/report-cache'

const CACHE_KEY = 'bpm_report_chiffres'

export default function ChiffresReportCard({ onLoaded }: { onLoaded?: () => void }) {
  const [report, setReport] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRateLimit, setIsRateLimit] = useState(false)

  useEffect(() => {
    let cancelled = false
    const cached = getCachedReport<{ report: string }>(CACHE_KEY)
    if (cached?.report) {
      setReport(cached.report)
      setLoading(false)
      onLoaded?.()
      return
    }
    setLoading(true)
    setError(null)
    setIsRateLimit(false)
    fetch('/api/ai/chiffres-report')
      .then((r) => r.json().then((data) => ({ ok: r.ok, status: r.status, data })))
      .then(({ ok, status, data }) => {
        if (cancelled) return
        if (!ok && data.error) {
          setIsRateLimit(status === 429)
          throw new Error(data.error)
        }
        setReport(data.report)
        if (data.report) setCachedReport(CACHE_KEY, { report: data.report })
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Erreur')
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          onLoaded?.()
        }
      })
    return () => { cancelled = true }
  }, [onLoaded])

  if (loading) {
    return (
      <div className="apple-card rounded-xl p-4 sm:p-5 border-white/5">
        <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-2">
          💰 Rapport chiffré
        </h3>
        <p className="text-white/50 text-sm py-6 text-center">Génération en cours…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="apple-card rounded-xl p-4 sm:p-5 border-white/5">
        <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-2">
          💰 Rapport chiffré
        </h3>
        <div className={`p-3 rounded-lg text-sm ${isRateLimit ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          <p className="font-medium">{isRateLimit ? '⚠️ Quota IA dépassé' : 'Erreur'}</p>
          <p className="mt-1 text-white/90">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="apple-card rounded-xl p-4 sm:p-5 border-white/5">
      <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-2">
        💰 Rapport chiffré
      </h3>
      <p className="text-xs text-white/50 mb-3">CA, performance, évolution et conseils</p>
      {report && (
        <div className="mt-3 p-4 rounded-lg bg-white/5 border border-white/10 text-sm text-white/90 whitespace-pre-wrap leading-relaxed max-h-[320px] overflow-y-auto">
          {report}
        </div>
      )}
    </div>
  )
}
