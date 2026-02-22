'use client'

import { useState } from 'react'

export interface SuggestedAction {
  type: 'ko' | 'relancer' | 'appele' | 'en_cours_de_closing' | 'chaud'
  label: string
}

interface LeadAIRecommendationProps {
  leadId: string
  /** Callback quand l'utilisateur clique sur une action suggérée */
  onApplyAction?: (action: SuggestedAction) => void
}

const actionStyles: Record<string, string> = {
  ko: 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30',
  relancer: 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30',
  appele: 'bg-purple-500/20 text-purple-400 border-purple-500/40 hover:bg-purple-500/30',
  en_cours_de_closing: 'bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30',
  chaud: 'bg-orange-500/20 text-orange-400 border-orange-500/40 hover:bg-orange-500/30',
}

export default function LeadAIRecommendation({ leadId, onApplyAction }: LeadAIRecommendationProps) {
  const [recommendation, setRecommendation] = useState<string | null>(null)
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendation = async () => {
    setLoading(true)
    setError(null)
    setRecommendation(null)
    setSuggestedActions([])
    try {
      const res = await fetch('/api/ai/lead-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setRecommendation(data.recommendation || '')
      setSuggestedActions(Array.isArray(data.suggestedActions) ? data.suggestedActions : [])
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'analyse')
    } finally {
      setLoading(false)
    }
  }

  const handleActionClick = (action: SuggestedAction) => {
    onApplyAction?.(action)
  }

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
      {!recommendation && !loading && !error && (
        <button
          onClick={fetchRecommendation}
          className="text-sm text-blue-400 hover:text-blue-300 font-medium"
        >
          Analyser les commentaires et proposer des actions →
        </button>
      )}
      {loading && (
        <p className="text-sm text-white/50">Analyse en cours...</p>
      )}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {recommendation && !loading && (
        <div className="space-y-3">
          <p className="text-sm text-white/90 leading-relaxed">{recommendation}</p>
          {suggestedActions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestedActions.map((action) => (
                <button
                  key={`${action.type}-${action.label}`}
                  onClick={() => handleActionClick(action)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${actionStyles[action.type] || 'bg-white/10 text-white/90 border-white/20 hover:bg-white/20'}`}
                >
                  {action.type === 'ko' && '❌ '}
                  {action.type === 'relancer' && '📞 '}
                  {action.type === 'appele' && '📱 '}
                  {action.type === 'en_cours_de_closing' && '👍 '}
                  {action.type === 'chaud' && '🔥 '}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
