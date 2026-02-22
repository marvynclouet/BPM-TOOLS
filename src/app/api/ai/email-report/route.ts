import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getDashboardContextForAI } from '@/lib/dashboard-context'
import { sendSimpleEmail } from '@/lib/communications'
import { getReportModel, isRateLimitError, RATE_LIMIT_MESSAGE } from '@/lib/ai-model'

/**
 * Génère un rapport IA (hebdo ou mensuel) et l'envoie par email.
 * Appelé par cron ou manuellement (GET avec query period=week|month).
 * Utilise AI_EMAIL_RECIPIENTS ou LEAD_NOTIFICATION_EMAIL comme destinataires.
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

    const period = request.nextUrl.searchParams.get('period') === 'month' ? 'month' : 'week'
    const model = getReportModel()
    if (!model) {
      return NextResponse.json({ error: 'Aucune clé API IA configurée' }, { status: 503 })
    }

    const context = await getDashboardContextForAI()
    const typeLabel = period === 'week' ? 'hebdomadaire' : 'mensuel'
    const prompt = `Tu es l'assistant IA de BPM Formation (formations beatmaking et ingénierie du son). Génère un rapport ${typeLabel} concis et professionnel pour l'équipe.

Règles :
- Utilise des emojis (📋 📊 ✅ 🔔)
- Pas de ** pour le gras
- Phrases courtes, en français
- Structure : activité, performance, actions prioritaires, recommandations

--- DONNÉES ---
${context}
--- FIN ---`

    const { text } = await generateText({ model, prompt })
    const reportHtml = text.replace(/\n/g, '<br>')

    const subject = period === 'week'
      ? `📊 Rapport hebdomadaire BPM Formation – ${new Date().toLocaleDateString('fr-FR')}`
      : `📊 Rapport mensuel BPM Formation – ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #111;">Rapport IA ${typeLabel}</h2>
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

    return NextResponse.json({ success: true, message: `Rapport ${typeLabel} envoyé par email` })
  } catch (err: any) {
    console.error('email-report:', err)
    const status = isRateLimitError(err) ? 429 : 500
    const friendlyMsg = isRateLimitError(err) ? RATE_LIMIT_MESSAGE : (err.message || 'Erreur')
    return NextResponse.json({ error: friendlyMsg }, { status })
  }
}
