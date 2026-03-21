import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET – Vue d'ensemble Ads : CA par source, CPL, taux de conversion
 * Croisement leads CRM + accounting_entries
 */
export async function GET() {
  try {
    const admin = createAdminClient()

    // Tous les leads avec leur source (sans limite)
    const { data: leads } = await admin
      .from('leads')
      .select('id, source, status, created_at')
      .limit(10000)

    // Toutes les entrées comptables (sans limite)
    const { data: entries } = await admin
      .from('accounting_entries')
      .select('lead_id, amount, created_at')
      .limit(10000)

    // Campagnes pour le CPL
    const { data: campaigns } = await admin
      .from('ads_campaigns')
      .select('id, name, platform, spent, leads_generated, cpl, status')

    const allLeads = leads || []
    const allEntries = entries || []

    // Sources à tracker
    const sources = ['tiktok', 'instagram', 'facebook', 'google', 'direct', 'youtube', 'manuel']

    // CA par source
    const revenueBySource: Record<string, { leads: number; closed: number; ca: number }> = {}
    for (const src of sources) {
      revenueBySource[src] = { leads: 0, closed: 0, ca: 0 }
    }

    // Map lead_id → source
    const leadSourceMap: Record<string, string> = {}
    for (const lead of allLeads) {
      const src = lead.source || 'direct'
      leadSourceMap[lead.id] = src
      if (!revenueBySource[src]) revenueBySource[src] = { leads: 0, closed: 0, ca: 0 }
      revenueBySource[src].leads++
      if (lead.status === 'clos' || lead.status === 'acompte_regle') {
        revenueBySource[src].closed++
      }
    }

    // CA par source via accounting_entries
    for (const entry of allEntries) {
      const src = leadSourceMap[entry.lead_id] || 'direct'
      if (!revenueBySource[src]) revenueBySource[src] = { leads: 0, closed: 0, ca: 0 }
      revenueBySource[src].ca += Number(entry.amount) || 0
    }

    // Conversion par source
    const sourceStats = Object.entries(revenueBySource)
      .filter(([, v]) => v.leads > 0)
      .map(([source, v]) => ({
        source,
        leads: v.leads,
        closed: v.closed,
        ca: Math.round(v.ca * 100) / 100,
        conversion: v.leads > 0 ? Math.round((v.closed / v.leads) * 100) : 0,
      }))
      .sort((a, b) => b.ca - a.ca)

    // Totaux
    const totalLeads = allLeads.length
    const totalClosed = allLeads.filter(l => l.status === 'clos' || l.status === 'acompte_regle').length
    const totalCA = allEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const totalSpent = (campaigns || []).reduce((sum, c) => sum + (Number(c.spent) || 0), 0)

    console.log(`[ADS OVERVIEW] ${allLeads.length} leads, ${allEntries.length} entries, CA=${totalCA}, closés=${totalClosed}`)

    return NextResponse.json({
      sourceStats,
      totals: {
        leads: totalLeads,
        closed: totalClosed,
        ca: Math.round(totalCA * 100) / 100,
        spent: Math.round(totalSpent * 100) / 100,
        roi: totalSpent > 0 ? Math.round(((totalCA - totalSpent) / totalSpent) * 100) : null,
      },
      campaigns: campaigns || [],
    })
  } catch (err: any) {
    console.error('ads overview error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
