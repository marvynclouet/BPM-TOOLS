import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getDashboardContextForAI, getCloserContextForAI } from '@/lib/dashboard-context'
import { requireAuth } from '@/lib/auth'
import { getReportModel, isRateLimitError, RATE_LIMIT_MESSAGE } from '@/lib/ai-model'
import { getCachedReport, setCachedReport } from '@/lib/ai-report-cache'

/**
 * Génère un rapport hebdomadaire ou mensuel. Cache serveur 1h.
 * POST { period: 'week' | 'month', closerId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const period = body.period === 'month' ? 'month' : 'week'
    const closerId = typeof body.closerId === 'string' ? body.closerId.trim() || null : null

    if (closerId && user.role !== 'admin' && closerId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé à générer le rapport d\'un autre closer' }, { status: 403 })
    }

    const reportKey = closerId ? `${period}_${closerId}` : `${period}_global`
    const cached = await getCachedReport('report', reportKey)
    if (cached) return NextResponse.json({ report: cached })

    const model = getReportModel()
    if (!model) {
      return NextResponse.json(
        { error: 'Aucune clé API configurée (GROQ_API_KEY, XAI_API_KEY ou GOOGLE_GENERATIVE_AI_API_KEY)' },
        { status: 503 }
      )
    }

    const isCloserReport = closerId != null
    const context = isCloserReport
      ? await getCloserContextForAI(closerId!, period)
      : await getDashboardContextForAI()

    const typeLabel = period === 'week' ? 'hebdomadaire' : 'mensuel'
    const scopeLabel = isCloserReport ? `pour le closer (données personnelles)` : `pour l'équipe`
    const prompt = `Tu es l'assistant IA de BPM Formation (formations beatmaking et ingénierie du son). Génère un rapport ${typeLabel} ${scopeLabel}, concis et professionnel.

Règles :
- Utilise des emojis pour structurer (📋 📊 ✅ 🔔 etc.)
- Ne pas utiliser ** pour le gras
- Phrases courtes, style direct
- Réponds en français

Structure du rapport :
1. Résumé de l'activité (leads, ventes, CA)
2. Performance (évolution vs période précédente)
3. Actions prioritaires (relances si pertinent)
4. 2 à 3 recommandations concrètes

--- DONNÉES ---
${context}
--- FIN DONNÉES ---`

    const { text } = await generateText({ model, prompt })
    const report = text.trim()
    await setCachedReport('report', report, reportKey)
    return NextResponse.json({ report })
  } catch (err: any) {
    console.error('AI report error:', err)
    const status = isRateLimitError(err) ? 429 : 500
    const friendlyMsg = isRateLimitError(err) ? RATE_LIMIT_MESSAGE : (err.message || 'Erreur lors de la génération du rapport')
    return NextResponse.json({ error: friendlyMsg }, { status })
  }
}
