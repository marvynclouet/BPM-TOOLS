import { createAdminClient } from '@/lib/supabase/admin'
import { getAIAlerts } from '@/lib/ai-alerts'

/**
 * Récupère les données du dashboard pour alimenter l'assistant IA.
 * Utilisé par l'API /api/ai/chat
 */
export async function getDashboardContextForAI(): Promise<string> {
  const adminClient = createAdminClient()
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const cinqJoursAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
  const startOfWeek = new Date(now)
  const daysToMonday = now.getDay() === 0 ? 6 : now.getDay() - 1
  startOfWeek.setDate(now.getDate() - daysToMonday)
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfLastWeek = new Date(startOfWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)
  const endOfLastWeek = new Date(startOfWeek.getTime() - 1)
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  try {
    const [
      leads24h,
      leads7d,
      recentLeads,
      recentComments,
      appeledLeads,
      monthEntries,
      prevMonthEntries,
      planningEntries,
      leadsSource,
      leadsThisWeek,
      leadsLastWeek,
      closThisWeek,
      closLastWeek,
      statusResult,
      closersData,
    ] = await Promise.all([
      adminClient.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', last24h.toISOString()),
      adminClient.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', last7d.toISOString()),
      adminClient.from('leads').select('id, first_name, last_name, formation, status, source, created_at').order('created_at', { ascending: false }).limit(8),
      adminClient.from('lead_comments').select(`
        id, comment, created_at, lead_id,
        leads:lead_id(first_name, last_name),
        users:user_id(full_name)
      `).order('created_at', { ascending: false }).limit(8),
      adminClient.from('leads').select('id, first_name, last_name, last_action_at, updated_at').eq('status', 'appele'),
      adminClient.from('accounting_entries').select('amount').gte('created_at', startOfMonth.toISOString()),
      adminClient.from('accounting_entries').select('amount').gte('created_at', startOfPrevMonth.toISOString()).lte('created_at', endOfPrevMonth.toISOString()),
      adminClient.from('planning').select('*, planning_lead(lead_id, leads:lead_id(first_name, last_name, formation, formation_format))').gte('start_date', now.toISOString()).lte('end_date', new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()).order('start_date', { ascending: true }).limit(10),
      adminClient.from('leads').select('source').gte('created_at', last7d.toISOString()),
      adminClient.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', startOfWeek.toISOString()),
      adminClient.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', startOfLastWeek.toISOString()).lte('created_at', endOfLastWeek.toISOString()),
      adminClient.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'clos').gte('updated_at', startOfWeek.toISOString()),
      adminClient.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'clos').gte('updated_at', startOfLastWeek.toISOString()).lte('updated_at', endOfLastWeek.toISOString()),
      adminClient.from('leads').select('status').in('status', ['nouveau', 'appele', 'acompte_regle', 'clos', 'ko']),
      adminClient.from('accounting_entries').select('amount, leads:lead_id(closer_id, first_name, last_name)').gte('created_at', startOfMonth.toISOString()),
    ])

    const leadsARelancer = (appeledLeads.data || []).filter((l: any) => {
      const d = l.last_action_at || l.updated_at
      return d && new Date(d) < cinqJoursAgo
    })

    const caMois = (monthEntries.data || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
    const caMoisPrecedent = (prevMonthEntries.data || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
    const evolutionPct = caMoisPrecedent > 0 ? ((caMois - caMoisPrecedent) / caMoisPrecedent) * 100 : null

    const sourceCounts: Record<string, number> = {}
    ;(leadsSource.data || []).forEach((l: any) => {
      const s = l.source || 'direct'
      sourceCounts[s] = (sourceCounts[s] || 0) + 1
    })

    const formationLabels: Record<string, string> = { inge_son: 'Ingé son', beatmaking: 'Beatmaking', autre: 'Autre' }
    const formatLabels: Record<string, string> = { semaine: 'Semaine', mensuelle: 'Mensuelle', bpm_fast: 'BPM Fast' }

    const lines: string[] = [
      `=== DONNÉES DASHBOARD BPM Formation (${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}) ===`,
      '',
      '## Nouveaux leads',
      `- 24h : ${leads24h.count || 0}`,
      `- 7 jours : ${leads7d.count || 0}`,
    ]

    if (recentLeads.data && recentLeads.data.length > 0) {
      lines.push('', 'Derniers leads (prénom, nom, formation, statut, source) :')
      recentLeads.data.slice(0, 6).forEach((l: any) => {
        lines.push(`  - ${l.first_name} ${l.last_name} | ${formationLabels[l.formation] || l.formation} | ${l.status} | ${l.source || 'direct'} | ${new Date(l.created_at).toLocaleDateString('fr-FR')}`)
      })
    }

    lines.push('', '## Alertes IA')
    try {
      const aiAlerts = await getAIAlerts()
      if (aiAlerts.length > 0) {
        aiAlerts.forEach((a) => {
          lines.push(`- ${a.message}`)
          if (a.details && a.details.length > 0) {
            a.details.slice(0, 3).forEach((d) => lines.push(`  • ${d}`))
          }
        })
      } else {
        lines.push('Aucune alerte.')
      }
    } catch {
      lines.push('(non disponible)')
    }

    lines.push('', '## Relances urgentes')
    if (leadsARelancer.length > 0) {
      lines.push(`${leadsARelancer.length} lead(s) appelé(s) sans action depuis 5+ jours :`)
      leadsARelancer.slice(0, 5).forEach((l: any) => {
        lines.push(`  - ${l.first_name} ${l.last_name}`)
      })
    } else {
      lines.push('Aucun.')
    }

    if (recentComments.data && recentComments.data.length > 0) {
      lines.push('', '## Derniers commentaires')
      recentComments.data.slice(0, 5).forEach((c: any) => {
        const lead = c.leads || {}
        const user = c.users || {}
        lines.push(`  - ${user.full_name || '?'} sur ${lead.first_name} ${lead.last_name} : "${String(c.comment || '').slice(0, 80)}..." (${new Date(c.created_at).toLocaleDateString('fr-FR')})`)
      })
    }

    lines.push('', '## Performance')
    lines.push(`- CA du mois : ${caMois.toFixed(2)} €`)
    lines.push(`- CA mois précédent : ${caMoisPrecedent.toFixed(2)} €`)
    if (evolutionPct !== null) lines.push(`- Évolution : ${evolutionPct >= 0 ? '+' : ''}${evolutionPct.toFixed(1)}%`)

    const statusCounts: Record<string, number> = {}
    ;(statusResult.data || []).forEach((item: any) => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1
    })
    lines.push('', 'Répartition par statut : Nouveau, Appelé, Acompte réglé, Clos, KO')
    lines.push(`  ${JSON.stringify(statusCounts)}`)

    const totalCAFromEntries = (closersData.data || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
    if (totalCAFromEntries > 0) {
      lines.push('', `Total ventes ce mois (accounting) : ${totalCAFromEntries.toFixed(2)} €`)
    }

    lines.push('', '## Tendances semaine (vs semaine précédente)')
    const lTw = leadsThisWeek.count || 0
    const lLw = leadsLastWeek.count || 0
    const cTw = closThisWeek.count || 0
    const cLw = closLastWeek.count || 0
    lines.push(`- Nouveaux leads : ${lTw - lLw >= 0 ? '+' : ''}${lTw - lLw}`)
    lines.push(`- Clos : ${cTw - cLw >= 0 ? '+' : ''}${cTw - cLw}`)

    lines.push('', '## Sources des leads (7j)')
    const sorted = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
    sorted.forEach(([source, count]) => lines.push(`  - ${source} : ${count}`))

    if (planningEntries.data && planningEntries.data.length > 0) {
      lines.push('', '## Prochaines formations (14 jours)')
      planningEntries.data.slice(0, 5).forEach((p: any) => {
        const leadList = (p.planning_lead || []).map((pl: any) => pl.leads).filter(Boolean)
        const first = leadList[0]
        const label = first ? `${formationLabels[first.formation] || first.formation} (${formatLabels[first.formation_format] || first.formation_format || ''})` : 'Formation'
        lines.push(`  - ${label} | ${new Date(p.start_date).toLocaleDateString('fr-FR')} | ${leadList.length} participant(s)`)
      })
    }

    return lines.join('\n')
  } catch (err: any) {
    return `Erreur lors de la récupération des données : ${err.message}`
  }
}

/**
 * Récupère le contexte pour un rapport IA centré sur un closer.
 * Utilisé par /api/ai/report avec closerId.
 */
export async function getCloserContextForAI(closerId: string, period: 'week' | 'month'): Promise<string> {
  const adminClient = createAdminClient()
  const now = new Date()
  const isMonth = period === 'month'
  const startDate = isMonth
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : (() => {
        const startOfWeek = new Date(now)
        const daysToMonday = now.getDay() === 0 ? 6 : now.getDay() - 1
        startOfWeek.setDate(now.getDate() - daysToMonday)
        startOfWeek.setHours(0, 0, 0, 0)
        return startOfWeek
      })()
  const endDate = now
  const startPrev = isMonth
    ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
    : (() => {
        const s = new Date(startDate)
        s.setDate(s.getDate() - 7)
        return s
      })()

  try {
    const { data: closerUser } = await adminClient
      .from('users')
      .select('full_name, email')
      .eq('id', closerId)
      .single()

    const closerName = closerUser?.full_name || closerUser?.email || 'Closer'

    const { data: myLeads } = await adminClient
      .from('leads')
      .select('id, first_name, last_name, formation, status, source, created_at, updated_at, last_action_at')
      .eq('closer_id', closerId)
      .order('created_at', { ascending: false })

    const myLeadIds = (myLeads || []).map((l: any) => l.id)

    let mySales: any[] = []
    let prevSales: any[] = []
    if (myLeadIds.length > 0) {
      const { data: sales } = await adminClient
        .from('accounting_entries')
        .select('*, leads:lead_id(first_name, last_name, formation)')
        .in('lead_id', myLeadIds)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
      mySales = sales || []
      const { data: prev } = await adminClient
        .from('accounting_entries')
        .select('amount')
        .in('lead_id', myLeadIds)
        .gte('created_at', startPrev.toISOString())
        .lt('created_at', startDate.toISOString())
      prevSales = prev || []
    }

    const caPeriod = mySales.reduce((s, e) => s + Number(e.amount || 0), 0)
    const commissionsPeriod = mySales.reduce((s, e) => s + Number(e.commission_closer || 0), 0)
    const caPrev = prevSales.reduce((s, e) => s + Number(e.amount || 0), 0)
    const evolutionPct = caPrev > 0 ? ((caPeriod - caPrev) / caPrev) * 100 : null

    const statusCounts: Record<string, number> = {}
    ;(myLeads || []).forEach((l: any) => {
      statusCounts[l.status] = (statusCounts[l.status] || 0) + 1
    })

    const appeled = (myLeads || []).filter((l: any) => l.status === 'appele')
    const cinqJoursAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
    const leadsARelancer = appeled.filter(
      (l: any) => (l.last_action_at || l.updated_at) && new Date(l.last_action_at || l.updated_at) < cinqJoursAgo
    ).length

    const formationLabels: Record<string, string> = { inge_son: 'Ingé son', beatmaking: 'Beatmaking', autre: 'Autre' }

    const lines: string[] = [
      `=== RAPPORT CLOSER : ${closerName} (${period === 'week' ? 'hebdo' : 'mensuel'}) ===`,
      '',
      '## Mes leads',
      `- Total assignés : ${myLeads?.length || 0}`,
      `- Répartition : ${JSON.stringify(statusCounts)}`,
      '',
      '## Performance',
      `- CA de la période : ${caPeriod.toFixed(2)} €`,
      `- Commissions : ${commissionsPeriod.toFixed(2)} €`,
      `- CA période précédente : ${caPrev.toFixed(2)} €`,
      evolutionPct !== null ? `- Évolution : ${evolutionPct >= 0 ? '+' : ''}${evolutionPct.toFixed(1)}%` : '',
      `- Ventes : ${mySales.length}`,
      '',
      '## Relances',
      `- Leads à relancer (5+ jours sans action) : ${leadsARelancer}`,
      leadsARelancer > 0
        ? appeled
            .filter((l: any) => (l.last_action_at || l.updated_at) && new Date(l.last_action_at || l.updated_at) < cinqJoursAgo)
            .slice(0, 5)
            .map((l: any) => `  - ${l.first_name} ${l.last_name}`)
            .join('\n')
        : '',
      '',
      '## Dernières ventes',
      ...(mySales.slice(0, 5).map((e: any) => {
        const lead = e.leads || {}
        return `  - ${lead.first_name} ${lead.last_name} | ${formationLabels[lead.formation] || lead.formation} | ${Number(e.amount || 0).toFixed(2)} €`
      }) || ['Aucune']),
    ].filter(Boolean)

    return lines.join('\n')
  } catch (err: any) {
    return `Erreur : ${err.message}`
  }
}
