import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { getReportModel, isRateLimitError, RATE_LIMIT_MESSAGE } from '@/lib/ai-model'
import { getCachedReportJson, setCachedReportJson } from '@/lib/ai-report-cache'

/**
 * Rapport IA sur les leads KO. Cache serveur 1h.
 */
export async function GET() {
  try {
    await requireAuth()
    const admin = createAdminClient()

    const { data: koLeads } = await admin
      .from('leads')
      .select('id, first_name, last_name, formation, source, updated_at, closer_id')
      .eq('status', 'ko')
      .order('updated_at', { ascending: false })
      .limit(30)

    if (!koLeads || koLeads.length === 0) {
      return NextResponse.json({
        report: 'Aucun lead KO pour le moment.',
        koCount: 0,
        withoutComment: 0,
      })
    }

    const cached = await getCachedReportJson<{ report: string; koCount: number; withoutComment: number }>('ko')
    if (cached) return NextResponse.json(cached)

    const model = getReportModel()
    if (!model) {
      return NextResponse.json(
        { error: 'Aucune clé API configurée' },
        { status: 503 }
      )
    }

    const leadIds = koLeads.map((l: any) => l.id)
    const { data: comments } = await admin
      .from('lead_comments')
      .select('lead_id, comment, created_at, users:user_id(full_name)')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false })

    const commentsByLead: Record<string, string[]> = {}
    ;(comments || []).forEach((c: any) => {
      if (!commentsByLead[c.lead_id]) commentsByLead[c.lead_id] = []
      commentsByLead[c.lead_id].push(
        `[${new Date(c.created_at).toLocaleDateString('fr-FR')}] ${c.users?.full_name || '?'}: ${c.comment}`
      )
    })

    const formationLabels: Record<string, string> = {
      inge_son: 'Ingé son',
      beatmaking: 'Beatmaking',
      autre: 'Autre',
    }

    const leadsWithContext = koLeads.map((l: any) => {
      const coms = (commentsByLead[l.id] || []).slice(0, 5)
      return {
        name: `${l.first_name} ${l.last_name}`,
        formation: formationLabels[l.formation] || l.formation,
        source: l.source || 'direct',
        date: new Date(l.updated_at).toLocaleDateString('fr-FR'),
        commentaires: coms.length > 0 ? coms.join('\n    ') : 'Aucun commentaire',
      }
    })

    const withoutComment = leadsWithContext.filter((l) => l.commentaires === 'Aucun commentaire').length

    const prompt = `Tu es l'assistant IA de BPM Formation (formations beatmaking et ingénierie du son).

Analyse les leads KO ci-dessous. Pour chaque lead avec des commentaires, déduis la raison probable du KO (budget, timing, pas de réponse, autre projet, etc.). Pour ceux sans commentaire, signale-le clairement.

Règles :
- Utilise des emojis (📋 ❌ ⚠️ etc.)
- Ne pas utiliser ** pour le gras
- Style direct, en français
- Groupe les motifs récurrents en fin de rapport
- Signale explicitement les leads KO SANS commentaire comme "à documenter"

--- DONNÉES ---
${JSON.stringify(leadsWithContext, null, 2)}
--- FIN DONNÉES ---`

    const { text } = await generateText({ model, prompt })
    const result = { report: text.trim(), koCount: koLeads.length, withoutComment }
    await setCachedReportJson('ko', result)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('ko-report error:', err)
    const status = isRateLimitError(err) ? 429 : 500
    const friendlyMsg = isRateLimitError(err) ? RATE_LIMIT_MESSAGE : (err.message || 'Erreur lors de la génération')
    return NextResponse.json({ error: friendlyMsg }, { status })
  }
}
