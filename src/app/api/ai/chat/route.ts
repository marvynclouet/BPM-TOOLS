import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { getChatModel } from '@/lib/ai-model'
import { getDashboardContextForAI } from '@/lib/dashboard-context'
import { BPM_TOOLS_KNOWLEDGE } from '@/lib/bpm-tools-knowledge'

const SYSTEM_PROMPT = `Tu es l'assistant IA de BPM Formation, un CRM de formations (beatmaking, ingénierie du son). Tu connais tout sur BPM Tools et tu aides l'équipe à l'utiliser.

## Style de réponse (OBLIGATOIRE) :
- Utilise des EMOJIS pour structurer et rendre clair (📋 🔍 📤 ✅ etc.) – pas d'astérisques pour le gras
- Ne JAMAIS utiliser **pour mettre en gras** – remplace par des emojis
- Énumère avec des numéros ou des tirets, style direct et lisible
- Phrases courtes, pas de blabla

## Tu dois :
- Répondre aux questions "Comment faire X ?", "Où trouver Y ?" en t'appuyant sur la doc
- Analyser les données : leads, relances, commentaires, performance
- Alerter sur les relances (leads appelés sans action 5+ jours)
- Donner des conseils concrets, être direct et actionnable
- Si on te demande un message de relance WhatsApp : génère-le directement en t'appuyant sur les noms des leads à relancer du contexte
- Répondre en français

IMPORTANT : Inclus toujours les chemins cliquables dans tes réponses : /dashboard, /dashboard/crm, /dashboard/gestion, /dashboard/planning, /dashboard/comptabilite. Exemple : "Va dans Gestion (/dashboard/gestion) puis..."

## Documentation BPM Tools :

${BPM_TOOLS_KNOWLEDGE}

Lorsque l'utilisateur pose une question sur l'utilisation du site, réponds en t'appuyant sur cette doc. Pour les questions sur les données (stats, leads, CA), utilise le contexte fourni dans le prompt.`

export async function POST(request: NextRequest) {
  try {
    const model = getChatModel()
    if (!model) {
      return NextResponse.json(
        { error: 'Aucune clé API configurée. Ajoute GROQ_API_KEY (gratuit), XAI_API_KEY ou GOOGLE_GENERATIVE_AI_API_KEY dans .env' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const userMessage = typeof body.message === 'string' ? body.message.trim() : ''
    const isInitialSynthesis = !userMessage || userMessage.toLowerCase() === 'synthèse' || userMessage.toLowerCase() === 'resume'

    const context = await getDashboardContextForAI()

    const prompt = isInitialSynthesis
      ? `Voici les données actuelles du dashboard. Génère une synthèse concise qui :
1. Décrit l'activité récente (nouveaux leads, commentaires)
2. Met en évidence les relances urgentes si applicable
3. Résume la performance (CA, tendances semaine)
4. Donne 1 à 3 recommandations prioritaires

--- DONNÉES ---
${context}
--- FIN DONNÉES ---`
      : `Contexte à jour du dashboard :
${context}

Question de l'utilisateur : ${userMessage}

Réponds de manière concise et actionnable.`

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      prompt,
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la génération' },
      { status: 500 }
    )
  }
}
