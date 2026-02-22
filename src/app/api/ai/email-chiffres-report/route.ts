import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getChiffresContextForAI } from '@/lib/chiffres-context'
import { sendSimpleEmail } from '@/lib/communications'
import { getReportModel, isRateLimitError, RATE_LIMIT_MESSAGE } from '@/lib/ai-model'

/**
 * Génère le rapport chiffré et l'envoie par email (Lia).
 * Appelé par cron – CRON_SECRET requis.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const toEmails = process.env.AI_EMAIL_RECIPIENTS || process.env.LEAD_NOTIFICATION_EMAIL
    if (!toEmails?.trim()) {
      return NextResponse.json({ error: 'AI_EMAIL_RECIPIENTS ou LEAD_NOTIFICATION_EMAIL non configuré' }, { status: 400 })
    }

    const model = getReportModel()
    if (!model) {
      return NextResponse.json({ error: 'Aucune clé API IA configurée' }, { status: 503 })
    }

    const context = await getChiffresContextForAI()

    const prompt = `Tu es l'assistant IA de BPM Formation. Génère un RAPPORT CHIFFRÉ pour Lia (argent, CA, performance, évolution).

Règles :
- Utilise des emojis (💰 📊 📈 📉 ✅)
- Phrases courtes, en français
- Structure : 1) Synthèse chiffrée (CA, leads clos, évolution), 2) Comparaison mois vs mois précédent, semaine vs semaine précédente, 3) Analyse : pourquoi plus ou moins performant, 4) Conseils concrets pour aller plus loin
- Ne pas inventer de chiffres : uniquement ceux fournis
- Pas de ** pour le gras, texte prêt pour email

--- DONNÉES ---
${context}
--- FIN ---`

    const { text } = await generateText({ model, prompt })
    const reportHtml = text.replace(/\n/g, '<br>')

    const subject = `💰 Rapport chiffré BPM Formation – ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #111;">Rapport chiffré – Performance & CA</h2>
        <p style="color: #666;">Généré le ${new Date().toLocaleString('fr-FR')}</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; line-height: 1.6;">
          ${reportHtml}
        </div>
        <p style="color: #999; font-size: 12px;">BPM Tools – rapport automatique</p>
      </div>
    `

    const result = await sendSimpleEmail({
      to: toEmails.split(',').map((e) => e.trim()).filter(Boolean),
      subject,
      html,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Erreur envoi email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Rapport chiffré envoyé par email' })
  } catch (err: any) {
    console.error('email-chiffres-report:', err)
    const status = isRateLimitError(err) ? 429 : 500
    const friendlyMsg = isRateLimitError(err) ? RATE_LIMIT_MESSAGE : (err.message || 'Erreur')
    return NextResponse.json({ error: friendlyMsg }, { status })
  }
}
