'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCachedQuickSummary, setCachedQuickSummary } from '@/lib/quick-summary-cache'

interface AIAlert {
  type: string
  message: string
  count?: number
  details?: string[]
}

export default function AIAlertsCard() {
  const [alerts, setAlerts] = useState<AIAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cached = getCachedQuickSummary() as { aiAlerts?: AIAlert[] } | null
    if (cached?.aiAlerts) {
      setAlerts(cached.aiAlerts)
      setLoading(false)
      return
    }
    let cancelled = false
    fetch('/api/ai/quick-summary')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setCachedQuickSummary(d)
        setAlerts(d.aiAlerts || [])
      })
      .catch(() => !cancelled && setAlerts([]))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="apple-card rounded-xl p-4 border-white/5">
        <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-2">
          🔔 Alertes IA
        </h3>
        <p className="text-white/40 text-sm">Chargement...</p>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="apple-card rounded-xl p-4 border-white/5">
        <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-2">
          🔔 Alertes IA
        </h3>
        <p className="text-white/40 text-sm">Aucune alerte.</p>
      </div>
    )
  }

  return (
    <div className="apple-card rounded-xl p-4 border-white/5">
      <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-2">
        🔔 Alertes IA
      </h3>
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <div key={i} className="text-sm">
            <p className="text-amber-300/90 font-medium">{a.message}</p>
            {a.details && a.details.length > 0 && (
              <ul className="mt-1 ml-3 text-white/60 text-xs space-y-0.5">
                {a.details.slice(0, 3).map((d, j) => (
                  <li key={j}>• {d}</li>
                ))}
              </ul>
            )}
            {a.type === 'clos_sans_planning' && (
              <Link
                href="/dashboard/planning"
                className="text-xs text-violet-300 hover:text-violet-200 mt-1 inline-block"
              >
                → Placer sur le planning
              </Link>
            )}
            {a.type === 'sessions_fragmentees' && (
              <Link
                href="/dashboard/planning"
                className="text-xs text-violet-300 hover:text-violet-200 mt-1 inline-block"
              >
                → Fusionner les sessions
              </Link>
            )}
            {a.type === 'acompte_formation_proche' && (
              <Link
                href="/dashboard/gestion"
                className="text-xs text-violet-300 hover:text-violet-200 mt-1 inline-block"
              >
                → Gérer les acomptes
              </Link>
            )}
            {a.type === 'ko_sans_commentaire' && (
              <Link
                href="/dashboard/crm"
                className="text-xs text-violet-300 hover:text-violet-200 mt-1 inline-block"
              >
                → Ajouter des commentaires
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
