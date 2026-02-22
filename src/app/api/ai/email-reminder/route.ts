import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getDashboardContextForAI } from '@/lib/dashboard-context'
import { sendSimpleEmail } from '@/lib/communications'
import { getReportModel, isRateLimitError, RATE_LIMIT_MESSAGE } from '@/lib/ai-model'

/**
 * Génère un rappel IA (alertes, priorité du jour) et l'envoie par email.
 * Appelé par cron (ex. chaque matin) ou manuellement.
 * Utilise AI_EMAIL_RECIPIENTS ou LEAD_NOTIFICATION_EMAIL.
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

    const context = await getDashboardContextForAI()
    const prompt = `Tu es l'assistant IA de BPM Formation. Génère un RAPPEL COURT pour la priorité du jour.
- 3 à 5 points max
- Style direct, actionnable
- Mets en avant : relances urgentes, nouveaux leads, alertes, actions prioritaires
- Utilise des emojis (🔔 📋 ✅)
- En français
- Pas de ** pour le gras

--- DONNÉES ---
${context}
--- FIN ---`

    const { text } = await generateText({ model, prompt })
    const reminderHtml = text.replace(/\n/g, '<br>')

    const subject = `🔔 Rappel IA BPM – Priorité du jour (${new Date().toLocaleDateString('fr-FR')})`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
        <h2 style="color: #111;">Priorité du jour</h2>
        <p style="color: #666;">${new Date().toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b; line-height: 1.6;">
          ${reminderHtml}
        </div>
        <p style="color: #999; font-size: 12px;"><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.bpmformation.fr'}/dashboard" style="color: #6366f1;">→ Ouvrir le dashboard</a></p>
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

    return NextResponse.json({ success: true, message: 'Rappel IA envoyé par email' })
  } catch (err: any) {
    console.error('email-reminder:', err)
    const status = isRateLimitError(err) ? 429 : 500
    const friendlyMsg = isRateLimitError(err) ? RATE_LIMIT_MESSAGE : (err.message || 'Erreur')
    return NextResponse.json({ error: friendlyMsg }, { status })
  }
}
