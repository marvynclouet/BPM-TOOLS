import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSimpleEmail } from '@/lib/communications'

/**
 * Envoie une alerte par email s'il y a des nouveaux leads en attente.
 * Déclenche seulement si leads24h > 0 ou nouveauxNonTraites > 0.
 * Appelé par cron (ex. plusieurs fois par jour) ou manuellement.
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

    const admin = createAdminClient()
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [
      { count: leads24h },
      { count: nouveauxCount },
      { data: nouveauxLeads },
    ] = await Promise.all([
      admin.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', last24h.toISOString()),
      admin.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'nouveau'),
      admin
        .from('leads')
        .select('first_name, last_name, formation, created_at')
        .eq('status', 'nouveau')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const count24h = leads24h || 0
    const countNouveaux = nouveauxCount || 0

    if (count24h === 0 && countNouveaux === 0) {
      return NextResponse.json({ success: true, message: 'Aucun nouveau lead en attente – email non envoyé' })
    }

    const formationLabels: Record<string, string> = {
      inge_son: 'Ingé son',
      beatmaking: 'Beatmaking',
      autre: 'Autre',
    }

    const rows =
      nouveauxLeads?.map(
        (l: any) =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${l.first_name || ''} ${l.last_name || ''}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${formationLabels[l.formation] || l.formation}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${new Date(l.created_at).toLocaleDateString('fr-FR')}</td></tr>`
      ) || []
    const tableBody = rows.length > 0 ? rows.join('') : '<tr><td colspan="3" style="padding:12px;color:#666;">Aucun détail</td></tr>'

    let title = ''
    if (count24h > 0 && countNouveaux > 0) {
      title = `${count24h} nouveau${count24h > 1 ? 'x' : ''} lead${count24h > 1 ? 's' : ''} (24h) · ${countNouveaux} en attente`
    } else if (count24h > 0) {
      title = `${count24h} nouveau${count24h > 1 ? 'x' : ''} lead${count24h > 1 ? 's' : ''} (24h)`
    } else {
      title = `${countNouveaux} lead${countNouveaux > 1 ? 's' : ''} en attente`
    }

    const subject = `🔔 BPM – ${title}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
        <h2 style="color: #111;">Nouveaux leads en attente</h2>
        <p style="color: #666;">${now.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600;">${count24h > 0 ? `📥 ${count24h} nouveau${count24h > 1 ? 'x' : ''} lead${count24h > 1 ? 's' : ''} (24h)` : ''}</p>
          <p style="margin: 0; font-size: 16px; font-weight: 600;">${countNouveaux > 0 ? `⏳ ${countNouveaux} lead${countNouveaux > 1 ? 's' : ''} non traité${countNouveaux > 1 ? 's' : ''}` : ''}</p>
        </div>
        ${rows.length > 0 ? `
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <thead><tr style="background:#f3f4f6;"><th style="padding:8px 12px;text-align:left;">Nom</th><th style="padding:8px 12px;text-align:left;">Formation</th><th style="padding:8px 12px;text-align:left;">Date</th></tr></thead>
          <tbody>${tableBody}</tbody>
        </table>
        ` : ''}
        <p style="margin-top: 20px;"><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.bpmformation.fr'}/dashboard/crm" style="display:inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">→ Voir les leads</a></p>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">BPM Tools – alerte automatique</p>
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

    return NextResponse.json({
      success: true,
      message: `Alerte envoyée : ${title}`,
      leads24h: count24h,
      nouveauxEnAttente: countNouveaux,
    })
  } catch (err: any) {
    console.error('email-new-leads-alert:', err)
    return NextResponse.json({ error: err.message || 'Erreur' }, { status: 500 })
  }
}
