import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'
import { xai } from '@ai-sdk/xai'
import { google } from '@ai-sdk/google'
import { createAdminClient } from '@/lib/supabase/admin'

function getModel() {
  if (process.env.XAI_API_KEY) return xai('grok-3-mini')
  if (process.env.GROQ_API_KEY) return groq('llama-3.3-70b-versatile')
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return google('gemini-2.0-flash')
  return null
}

/**
 * Génère un message de relance personnalisé pour un lead.
 * POST { leadId: string } ou { leadName: string, formation?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const model = getModel()
    if (!model) {
      return NextResponse.json({ error: 'Aucune clé API configurée' }, { status: 503 })
    }

    const body = await request.json().catch(() => ({}))
    const leadId = body.leadId
    const leadName = body.leadName

    let firstName = ''
    let formation = 'formation'
    let formationFormat = ''

    if (leadId) {
      const admin = createAdminClient()
      const { data: lead, error } = await admin
        .from('leads')
        .select('first_name, formation, formation_format')
        .eq('id', leadId)
        .single()

      if (error || !lead) {
        return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 })
      }
      firstName = lead.first_name || ''
      formation = lead.formation === 'inge_son' ? 'ingénierie du son' : lead.formation === 'beatmaking' ? 'beatmaking' : lead.formation || 'formation'
      formationFormat = lead.formation_format === 'semaine' ? 'stage semaine' : lead.formation_format === 'mensuelle' ? 'formation mensuelle' : lead.formation_format || ''
    } else if (leadName) {
      firstName = leadName.split(' ')[0] || leadName
      formation = body.formation || 'formation'
    } else {
      return NextResponse.json({ error: 'leadId ou leadName requis' }, { status: 400 })
    }

    const { text } = await generateText({
      model,
      prompt: `Génère un message WhatsApp court et friendly pour relancer ${firstName} qui s'est inscrit à la formation ${formation} ${formationFormat ? `(${formationFormat})` : ''} chez BPM Formation. Le message doit :
- Être personnel (prénom)
- Rappeler l'intérêt pour la formation
- Proposer de répondre aux questions
- Inclure un call-to-action doux (ex: "dis-moi si tu as des questions")
- Max 3-4 phrases, ton chaleureux et pro
- En français`,
    })

    return NextResponse.json({ message: text.trim() })
  } catch (err: any) {
    console.error('relance-message error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
