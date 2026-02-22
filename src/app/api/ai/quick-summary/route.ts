import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAIAlerts, formatAlertsForDisplay } from '@/lib/ai-alerts'

/**
 * Résumé rapide pour les alertes visibles sans ouvrir le chat.
 * Léger, rapide, pour capturer l'attention.
 */
export async function GET() {
  try {
    const adminClient = createAdminClient()
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const cinqJoursAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: leads24h },
      { data: appeledLeads },
      { count: nouveauxCount },
      aiAlerts,
    ] = await Promise.all([
      adminClient.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', last24h.toISOString()),
      adminClient.from('leads').select('id, first_name, last_name, last_action_at, updated_at').eq('status', 'appele'),
      adminClient.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'nouveau'),
      getAIAlerts(),
    ])

    const leadsARelancer = (appeledLeads || []).filter(
      (l: any) => (l.last_action_at || l.updated_at) && new Date(l.last_action_at || l.updated_at) < new Date(cinqJoursAgo)
    ).length

    const alerts: string[] = []
    if (leadsARelancer > 0) alerts.push(`${leadsARelancer} lead${leadsARelancer > 1 ? 's' : ''} à relancer`)
    if ((leads24h || 0) > 0) alerts.push(`${leads24h} nouveau${(leads24h || 0) > 1 ? 'x' : ''} lead${(leads24h || 0) > 1 ? 's' : ''} (24h)`)
    if ((nouveauxCount || 0) > 0 && (leads24h || 0) === 0) alerts.push(`${nouveauxCount} lead${(nouveauxCount || 0) > 1 ? 's' : ''} non traités`)
    alerts.push(...formatAlertsForDisplay(aiAlerts))

    let priorite = ''
    if (leadsARelancer > 0) priorite = `${leadsARelancer} relance${leadsARelancer > 1 ? 's' : ''} à faire`
    else if ((leads24h || 0) > 0) priorite = `${leads24h} nouveau${(leads24h || 0) > 1 ? 'x' : ''} lead${(leads24h || 0) > 1 ? 's' : ''} à traiter`
    else if ((nouveauxCount || 0) > 0) priorite = `${nouveauxCount} lead${(nouveauxCount || 0) > 1 ? 's' : ''} non traités`
    else if (aiAlerts.length > 0) priorite = aiAlerts[0].message

    return NextResponse.json({
      alerts,
      priorite,
      leads24h: leads24h || 0,
      leadsARelancer,
      nouveauxNonTraites: nouveauxCount || 0,
      aiAlerts,
    })
  } catch (err: any) {
    return NextResponse.json({ alerts: [], error: err.message }, { status: 500 })
  }
}
