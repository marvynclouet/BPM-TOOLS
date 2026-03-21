import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTextWithFallback } from '@/lib/ai-model'

/**
 * POST – Génère un DM de prise de contact ou de relance via IA
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const admin = createAdminClient()

    const { data: prospect, error } = await admin
      .from('social_prospects')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !prospect) {
      return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 })
    }

    // Récupérer les derniers échanges
    const { data: exchanges } = await admin
      .from('social_prospect_exchanges')
      .select('direction, message, sent_at')
      .eq('prospect_id', id)
      .order('sent_at', { ascending: false })
      .limit(5)

    let exchangeContext = ''
    if (exchanges && exchanges.length > 0) {
      exchangeContext = '\n\nHistorique récent des échanges (du plus récent au plus ancien) :\n' +
        exchanges.reverse().map(e => `- [${e.direction === 'sent' ? 'Envoyé' : 'Reçu'}] ${e.message}`).join('\n')
    }

    const platformLabel = prospect.platform === 'tiktok' ? 'TikTok' : 'Instagram'
    const formationLabel = prospect.formation === 'inge_son' ? 'ingénierie du son' :
      prospect.formation === 'beatmaking' ? 'beatmaking' : 'formation musicale'

    const statusLabels: Record<string, string> = {
      repere: 'vient d\'être repéré (premier contact)',
      contacte: 'a été contacté mais n\'a pas encore répondu (relance)',
      a_repondu: 'a répondu (continuer la conversation)',
      numero_recupere: 'a donné son numéro (passer à WhatsApp)',
      en_discussion: 'est en discussion active',
      close: 'est closé',
      froid: 'est froid / ne répond plus (tentative de réengagement)',
    }

    const context = statusLabels[prospect.status] || 'est en cours de discussion'

    const { text } = await generateTextWithFallback({
      prompt: `Génère un message DM ${platformLabel} court et naturel pour @${prospect.username} qui ${context}.

${prospect.formation ? `Cette personne s'intéresse à la ${formationLabel} chez BPM Formation.` : 'On ne sait pas encore quelle formation l\'intéresse.'}

Le message doit :
- Être adapté au ton ${platformLabel} (casual, friendly, pas commercial)
- ${prospect.status === 'repere' ? 'Faire une prise de contact naturelle en lien avec son profil/contenu' : 'Relancer naturellement la conversation'}
- ${prospect.status === 'a_repondu' || prospect.status === 'en_discussion' ? 'Avancer vers la récupération du numéro ou un appel' : ''}
- Max 2-3 phrases, ton humain et authentique
- En français
- Ne pas répéter un message déjà envoyé${exchangeContext}`,
    })

    return NextResponse.json({ message: text.trim() })
  } catch (err: any) {
    console.error('generate-message error:', err)
    return NextResponse.json({ error: err.message || 'Erreur IA' }, { status: 500 })
  }
}
