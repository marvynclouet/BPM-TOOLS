'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import AIAlertsCard from './AIAlertsCard'
import AnomalyReportCard from './AnomalyReportCard'
import ChiffresReportCard from './ChiffresReportCard'
import KOReportCard from './KOReportCard'
import ReportCard from './ReportCard'

interface AIReportsSectionProps {
  userId: string
  isAdmin: boolean
}

/** Ordre de chargement séquentiel pour éviter le burst de requêtes Groq */
const LOAD_ORDER = ['chiffres', 'report', 'ko', 'anomaly'] as const

export default function AIReportsSection({ userId, isAdmin }: AIReportsSectionProps) {
  const [loadingIndex, setLoadingIndex] = useState(0)
  const [sectionInView, setSectionInView] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Lazy load : ne charger les rapports que quand la section entre dans le viewport
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSectionInView(true)
      },
      { rootMargin: '100px', threshold: 0.01 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const onLoaded = useCallback(() => {
    setLoadingIndex((i) => Math.min(i + 1, LOAD_ORDER.length))
  }, [])

  const show = (id: string) => LOAD_ORDER.indexOf(id as (typeof LOAD_ORDER)[number]) <= loadingIndex

  return (
    <div className="space-y-3" ref={sentinelRef}>
      <AIAlertsCard />
      {sectionInView && (
        <>
          {show('chiffres') && <ChiffresReportCard onLoaded={onLoaded} />}
          {show('report') && <ReportCard currentUserId={userId} isAdmin={isAdmin} onLoaded={onLoaded} />}
          {show('ko') && <KOReportCard onLoaded={onLoaded} />}
          {show('anomaly') && <AnomalyReportCard onLoaded={onLoaded} />}
        </>
      )}
      {!sectionInView && (
        <div className="apple-card rounded-xl p-6 border-white/5 text-center">
          <p className="text-sm text-white/50">Faites défiler pour charger les rapports IA…</p>
        </div>
      )}
      <p className="text-xs text-white/40">Ouvre l&apos;assistant IA (bouton en bas à droite) pour une synthèse ou poser une question.</p>
    </div>
  )
}
