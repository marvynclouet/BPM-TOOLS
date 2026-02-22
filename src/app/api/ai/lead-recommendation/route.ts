import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { xai } from '@ai-sdk/xai'
import { groq } from '@ai-sdk/groq'
import { google } from '@ai-sdk/google'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_ACTION_TYPES = ['ko', 'relancer', 'appele', 'en_cours_de_closing', 'chaud'] as const

function parseActions(text: string): { recommendation: string; suggestedActions: { type: string; label: string }[] } {
  const recommendation = text.trim()
  let suggestedActions: { type: string; label: string }[] = []
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const rec = typeof parsed.recommendation === 'string' ? parsed.recommendation : recommendation
      const actions = Array.isArray(parsed.suggestedActions)
        ? parsed.suggestedActions
            .filter((a: any) => a?.type && VALID_ACTION_TYPES.includes(a.type as any))
            .map((a: any) => ({ type: a.type, label: typeof a.label === 'string' ? a.label : a.type }))
        : []
      return { recommendation: rec || recommendation, suggestedActions: actions }
    }
  } catch {
    // ignorer si JSON invalide
  }
  return { recommendation, suggestedActions }
}

function getModel() {
  if (process.env.XAI_API_KEY) return xai('grok-3-mini')
  if (process.env.GROQ_API_KEY) return groq('llama-3.3-70b-versatile')
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return google('gemini-2.0-flash')
  return null
}

/**
 * Analyse les commentaires d'un lead et propose une recommandation + actions suggérées (relancer, KO, etc.).
 * POST { leadId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const model = getModel()
    if (!model) {
      return NextResponse.json(
        { error: 'Aucune clé API configurée' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const leadId = body.leadId
    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json({ error: 'leadId requis' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: lead, error: leadError } = await admin
      .from('leads')
      .select('first_name, last_name, formation, status, source, last_action_at, updated_at')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 })
    }

    const { data: comments } = await admin
      .from('lead_comments')
      .select('comment, created_at, users:user_id(full_name)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(10)

    const formationLabels: Record<string, string> = {
      inge_son: 'Ingénierie du son',
      beatmaking: 'Beatmaking',
      autre: 'Autre',
    }
    const statusLabels: Record<string, string> = {
      nouveau: 'Nouveau',
      appele: 'Appelé',
      acompte_regle: 'Acompte réglé',
      clos: 'Clos',
      ko: 'KO',
    }

    const commentsText =
      comments && comments.length > 0
        ? comments
            .map(
              (c: any) =>
                `[${new Date(c.created_at).toLocaleDateString('fr-FR')}] ${c.users?.full_name || '?'}: ${c.comment}`
            )
            .join('\n')
        : 'Aucun commentaire'

    const prompt = `Tu es un assistant CRM pour BPM Formation (formations beatmaking et ingénierie du son).

Lead : ${lead.first_name} ${lead.last_name}
Formation : ${formationLabels[lead.formation] || lead.formation}
Statut actuel : ${statusLabels[lead.status] || lead.status}
Dernière action : ${lead.last_action_at ? new Date(lead.last_action_at).toLocaleDateString('fr-FR') : 'Jamais'}
Source : ${lead.source || 'direct'}

Commentaires récents :
${commentsText}

Analyse ces échanges et :
1. Donne UNE recommandation courte (1 phrase actionnable).
2. Propose 1 à 3 actions parmi : ko, relancer, appele, en_cours_de_closing, chaud.

Règles :
- ko : si le lead semble perdu, pas de réponse, budget coupé
- relancer : si pas de nouvelle ou lead à recontacter
- appele : si un appel a été fait récemment
- en_cours_de_closing : si négociation avancée
- chaud : si forte intention d'achat

Réponds UNIQUEMENT avec un objet JSON valide (pas de texte avant ou après), de cette forme exacte :
{"recommendation": "ta phrase de recommandation", "suggestedActions": [{"type": "relancer", "label": "Relancer par WhatsApp"}, {"type": "ko", "label": "Mettre en KO"}]}
Les valeurs possibles pour type sont : ko, relancer, appele, en_cours_de_closing, chaud.`

    const { text } = await generateText({ model, prompt })
    const { recommendation, suggestedActions } = parseActions(text)

    return NextResponse.json({
      recommendation,
      suggestedActions,
    })
  } catch (err: any) {
    console.error('AI lead-recommendation error:', err)
    return NextResponse.json(
      { error: err.message || 'Erreur lors de l\'analyse' },
      { status: 500 }
    )
  }
}
