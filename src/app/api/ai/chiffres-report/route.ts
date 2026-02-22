import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { getChiffresContextForAI } from '@/lib/chiffres-context'
import { getReportModel, isRateLimitError, RATE_LIMIT_MESSAGE } from '@/lib/ai-model'
import { getCachedReport, setCachedReport } from '@/lib/ai-report-cache'

/**
 * Génère le rapport chiffré (CA, performance, évolution, conseils).
 * GET – authentification requise (dashboard). Cache serveur 1h.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    }

    const cached = await getCachedReport('chiffres')
    if (cached) return NextResponse.json({ report: cached })

    const model = getReportModel()
    if (!model) {
      return NextResponse.json({ error: 'Aucune clé API IA configurée' }, { status: 503 })
    }

    const context = await getChiffresContextForAI()

    const prompt = `Tu es l'assistant IA de BPM Formation (formations beatmaking et ingénierie du son). Génère un RAPPORT CHIFFRÉ centré sur l'argent (CA) et la performance.

Règles :
- Phrases courtes, en français
- Utilise des emojis (💰 📊 📈 📉 ✅)
- Structure : 1) Synthèse chiffrée, 2) Évolution et comparaison (mois vs mois préc., semaine vs semaine préc.), 3) Analyse : pourquoi c'est plus ou moins performant (facteurs possibles), 4) Conseils concrets pour aller plus loin
- Ne pas inventer de chiffres : uniquement ceux fournis dans le contexte
- Pas de ** pour le gras, rester lisible en texte brut

--- DONNÉES ---
${context}
--- FIN ---`

    const { text } = await generateText({ model, prompt })
    await setCachedReport('chiffres', text)

    return NextResponse.json({ report: text })
  } catch (err: any) {
    console.error('chiffres-report:', err)
    const msg = err?.message || 'Erreur'
    const status = isRateLimitError(err) ? 429 : 500
    const friendlyMsg = isRateLimitError(err) ? RATE_LIMIT_MESSAGE : msg
    return NextResponse.json({ error: friendlyMsg }, { status })
  }
}
