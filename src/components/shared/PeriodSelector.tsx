'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

type Preset = 'all' | 'month' | 'last_month' | 'quarter' | 'year' | 'custom'

export interface PeriodSelectorProps {
  /** Valeurs initiales depuis l’URL (pour afficher le libellé) */
  initialFrom?: string | null
  initialTo?: string | null
  /** Label optionnel au-dessus du sélecteur */
  label?: string
}

function getPresetFromRange(from: string | null, to: string | null): Preset {
  if (!from || !to) return 'all'
  const dFrom = new Date(from)
  const dTo = new Date(to)
  const now = new Date()

  const startMonth = startOfMonth(now)
  const endMonth = endOfMonth(now)
  if (format(dFrom, 'yyyy-MM-dd') === format(startMonth, 'yyyy-MM-dd') &&
      format(dTo, 'yyyy-MM-dd') === format(endMonth, 'yyyy-MM-dd')) return 'month'

  const startLast = startOfMonth(subMonths(now, 1))
  const endLast = endOfMonth(subMonths(now, 1))
  if (format(dFrom, 'yyyy-MM-dd') === format(startLast, 'yyyy-MM-dd') &&
      format(dTo, 'yyyy-MM-dd') === format(endLast, 'yyyy-MM-dd')) return 'last_month'

  const startQ = startOfQuarter(now)
  const endQ = endOfQuarter(now)
  if (format(dFrom, 'yyyy-MM-dd') === format(startQ, 'yyyy-MM-dd') &&
      format(dTo, 'yyyy-MM-dd') === format(endQ, 'yyyy-MM-dd')) return 'quarter'

  const startY = startOfYear(now)
  const endY = endOfYear(now)
  if (format(dFrom, 'yyyy-MM-dd') === format(startY, 'yyyy-MM-dd') &&
      format(dTo, 'yyyy-MM-dd') === format(endY, 'yyyy-MM-dd')) return 'year'

  return 'custom'
}

function getRangeForPreset(preset: Preset): { from: string; to: string } | null {
  const now = new Date()
  let start: Date
  let end: Date
  switch (preset) {
    case 'all':
      return null
    case 'month':
      start = startOfMonth(now)
      end = endOfMonth(now)
      break
    case 'last_month':
      start = startOfMonth(subMonths(now, 1))
      end = endOfMonth(subMonths(now, 1))
      break
    case 'quarter':
      start = startOfQuarter(now)
      end = endOfQuarter(now)
      break
    case 'year':
      start = startOfYear(now)
      end = endOfYear(now)
      break
    default:
      return null
  }
  return {
    from: format(start, 'yyyy-MM-dd'),
    to: format(end, 'yyyy-MM-dd'),
  }
}

export default function PeriodSelector({ initialFrom, initialTo, label = 'Période' }: PeriodSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [customFrom, setCustomFrom] = useState(initialFrom || '')
  const [customTo, setCustomTo] = useState(initialTo || '')
  const [showCustom, setShowCustom] = useState(getPresetFromRange(initialFrom || null, initialTo || null) === 'custom')

  const applyPeriod = useCallback((from: string | null, to: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('from')
    params.delete('to')
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const q = params.toString()
    startTransition(() => {
      router.push(q ? `${pathname}?${q}` : pathname)
    })
  }, [pathname, router, searchParams])

  const handlePresetChange = (preset: Preset) => {
    if (preset === 'custom') {
      setShowCustom(true)
      return
    }
    setShowCustom(false)
    const range = getRangeForPreset(preset)
    applyPeriod(range?.from ?? null, range?.to ?? null)
  }

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      applyPeriod(customFrom, customTo)
    }
  }

  const currentPreset = getPresetFromRange(initialFrom || null, initialTo || null)
  const presetLabels: Record<Preset, string> = {
    all: 'Tout',
    month: 'Ce mois',
    last_month: 'Mois dernier',
    quarter: 'Ce trimestre',
    year: 'Cette année',
    custom: 'Personnalisé',
  }

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-sm font-medium text-white/70">{label}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={showCustom ? 'custom' : currentPreset}
          onChange={(e) => handlePresetChange(e.target.value as Preset)}
          className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          {(Object.keys(presetLabels) as Preset[]).map((key) => (
            <option key={key} value={key} className="bg-zinc-900 text-white">
              {presetLabels[key]}
            </option>
          ))}
        </select>

        {showCustom && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <span className="text-white/50 text-sm">→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              type="button"
              onClick={handleCustomApply}
              disabled={!customFrom || !customTo || isPending}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-sm font-medium text-white disabled:opacity-50 transition-colors"
            >
              Appliquer
            </button>
          </>
        )}

        {isPending && (
          <span className="text-white/50 text-sm">Chargement…</span>
        )}
      </div>

      {initialFrom && initialTo && !showCustom && (
        <p className="text-xs text-white/50">
          {format(new Date(initialFrom), 'd MMM yyyy', { locale: fr })} → {format(new Date(initialTo), 'd MMM yyyy', { locale: fr })}
        </p>
      )}
    </div>
  )
}
