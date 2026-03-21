import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTextWithFallback } from '@/lib/ai-model'

/**
 * Génère un message de relance personnalisé pour un lead.
 * POST { leadId: string } ou { leadName: string, formation?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const leadId = body.leadId
    const leadName = body.leadName

    let firstName = ''
    let formation = 'formation'
    let formationFormat = ''

    let exchangeContext = ''
    let formationStartDate = ''
    let priceContext = ''

    if (leadId) {
      const admin = createAdminClient()
      const { data: lead, error } = await admin
        .from('leads')
        .select('first_name, formation, formation_format, formation_start_date, price_fixed, price_deposit')
        .eq('id', leadId)
        .single()

      if (error || !lead) {
        return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 })
      }
      firstName = lead.first_name || ''
      formation = lead.formation === 'inge_son' ? 'ingénierie du son' : lead.formation === 'beatmaking' ? 'beatmaking' : lead.formation || 'formation'
      formationFormat = lead.formation_format === 'semaine' ? 'stage semaine' : lead.formation_format === 'mensuelle' ? 'formation mensuelle' : lead.formation_format || ''
      formationStartDate = lead.formation_start_date || ''
      if (lead.price_fixed) priceContext = `Prix discuté : ${lead.price_fixed} €${lead.price_deposit ? ` (acompte de ${lead.price_deposit} €)` : ''}.`

      // Récupérer les derniers échanges pour contextualiser
      const { data: exchanges } = await admin
        .from('whatsapp_exchanges')
        .select('direction, message, sent_at')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(5)

      if (exchanges && exchanges.length > 0) {
        exchangeContext = '\n\nHistorique récent des échanges (du plus récent au plus ancien) :\n' +
          exchanges.reverse().map(e => `- [${e.direction === 'sent' ? 'Envoyé' : 'Reçu'}] ${e.message}`).join('\n')
      }
    } else if (leadName) {
      firstName = leadName.split(' ')[0] || leadName
      formation = body.formation || 'formation'
    } else {
      return NextResponse.json({ error: 'leadId ou leadName requis' }, { status: 400 })
    }

    const { text } = await generateTextWithFallback({
      prompt: `Génère un message WhatsApp court et friendly pour relancer ${firstName} qui s'est inscrit à la formation ${formation} ${formationFormat ? `(${formationFormat})` : ''}${formationStartDate ? ` avec début prévu le ${formationStartDate}` : ''} chez BPM Formation.${priceContext ? `\n${priceContext}` : ''}\nLe message doit :
- Être personnel (prénom)
- Rappeler l'intérêt pour la formation${formationStartDate ? ` et la date de début prévue` : ''}${priceContext ? '\n- Évoquer subtilement le prix ou l\'investissement discuté si pertinent' : ''}
- Proposer de répondre aux questions
- Inclure un call-to-action doux (ex: "dis-moi si tu as des questions")
- Prendre en compte le contenu du dernier échange si historique fourni
- Max 3-4 phrases, ton chaleureux et pro
- En français
- Ne pas répéter un message déjà envoyé${exchangeContext}`,
    })

    return NextResponse.json({ message: text.trim() })
  } catch (err: any) {
    console.error('relance-message error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
