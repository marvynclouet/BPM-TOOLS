import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getAnomalyContextForAI } from '@/lib/anomaly-context'
import { requireAuth } from '@/lib/auth'
import { getReportModel, isRateLimitError, RATE_LIMIT_MESSAGE } from '@/lib/ai-model'
import { getCachedReport, setCachedReport } from '@/lib/ai-report-cache'

/**
 * Analyse anomalies via IA. Cache serveur 1h.
 */
export async function GET() {
  try {
    await requireAuth()

    const cached = await getCachedReport('anomaly')
    if (cached) return NextResponse.json({ report: cached })

    const model = getReportModel()
    if (!model) {
      return NextResponse.json(
        { error: 'Aucune clé API IA configurée' },
        { status: 503 }
      )
    }

    const context = await getAnomalyContextForAI()
    const prompt = `Tu es l'assistant IA de BPM Formation (CRM formations beatmaking et ingénierie du son).

Voici des données extraites de la base. ANALYSE tout et DÉTECTE les anomalies et incohérences.

Règles :
- Liste chaque anomalie / incohérence trouvée, avec un titre court et une explication
- Priorise par gravité (bloquant → important → mineur)
- Utilise des emojis (🔴 ⚠️ 🟡) pour la gravité
- Propose une action correctrice pour chaque anomalie
- Réponds en français, style direct et actionnable
- Pas de ** pour le gras
- Si tout est OK, dis-le clairement

--- DONNÉES ---
${context}
--- FIN ---`

    const { text } = await generateText({ model, prompt })
    const report = text.trim()
    await setCachedReport('anomaly', report)
    return NextResponse.json({ report })
  } catch (err: any) {
    console.error('anomaly-report:', err)
    const status = isRateLimitError(err) ? 429 : 500
    const friendlyMsg = isRateLimitError(err) ? RATE_LIMIT_MESSAGE : (err.message || "Erreur lors de l'analyse")
    return NextResponse.json({ error: friendlyMsg }, { status })
  }
}
