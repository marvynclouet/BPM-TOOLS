import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Contexte dédié au rapport chiffres (CA, argent, performance, évolution).
 */
export async function getChiffresContextForAI(): Promise<string> {
  const admin = createAdminClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const startOfWeek = new Date(now)
  const daysToMonday = now.getDay() === 0 ? 6 : now.getDay() - 1
  startOfWeek.setDate(now.getDate() - daysToMonday)
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfLastWeek = new Date(startOfWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)
  const endOfLastWeek = new Date(startOfWeek.getTime() - 1)

  try {
    const [
      { data: monthEntries },
      { data: prevMonthEntries },
      { data: weekEntries },
      { data: lastWeekEntries },
      closThisMonthResult,
      closPrevMonthResult,
      leadsThisMonthResult,
      leadsPrevMonthResult,
      { data: entriesByFormation },
      { data: entriesBySource },
    ] = await Promise.all([
      admin.from('accounting_entries').select('amount').gte('created_at', startOfMonth.toISOString()),
      admin.from('accounting_entries').select('amount').gte('created_at', startOfPrevMonth.toISOString()).lte('created_at', endOfPrevMonth.toISOString()),
      admin.from('accounting_entries').select('amount, lead_id, leads:lead_id(formation, source)').gte('created_at', startOfWeek.toISOString()),
      admin.from('accounting_entries').select('amount').gte('created_at', startOfLastWeek.toISOString()).lte('created_at', endOfLastWeek.toISOString()),
      admin.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'clos').gte('updated_at', startOfMonth.toISOString()),
      admin.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'clos').gte('updated_at', startOfPrevMonth.toISOString()).lte('updated_at', endOfPrevMonth.toISOString()),
      admin.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
      admin.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', startOfPrevMonth.toISOString()).lte('created_at', endOfPrevMonth.toISOString()),
      admin.from('accounting_entries').select('amount, leads:lead_id(formation)').gte('created_at', startOfMonth.toISOString()),
      admin.from('leads').select('source').eq('status', 'clos').gte('updated_at', startOfPrevMonth.toISOString()).lte('updated_at', endOfPrevMonth.toISOString()),
    ])

    const caMois = (monthEntries || []).reduce((s, e) => s + Number(e.amount || 0), 0)
    const caMoisPrecedent = (prevMonthEntries || []).reduce((s, e) => s + Number(e.amount || 0), 0)
    const caSemaine = (weekEntries || []).reduce((s, e) => s + Number(e.amount || 0), 0)
    const caSemaineDerniere = (lastWeekEntries || []).reduce((s, e) => s + Number(e.amount || 0), 0)
    const closMois = closThisMonthResult?.count ?? 0
    const closPrevMois = closPrevMonthResult?.count ?? 0
    const leadsMois = leadsThisMonthResult?.count ?? 0
    const leadsPrevMois = leadsPrevMonthResult?.count ?? 0

    const evolutionCAMois = caMoisPrecedent > 0 ? ((caMois - caMoisPrecedent) / caMoisPrecedent) * 100 : null
    const evolutionCASemaine = caSemaineDerniere > 0 ? ((caSemaine - caSemaineDerniere) / caSemaineDerniere) * 100 : null
    const evolutionClosMois = closPrevMois > 0 ? ((closMois - closPrevMois) / closPrevMois) * 100 : null

    const byFormation: Record<string, number> = {}
    ;(entriesByFormation || []).forEach((e: any) => {
      const f = e.leads?.formation || 'autre'
      byFormation[f] = (byFormation[f] || 0) + Number(e.amount || 0)
    })

    const bySource: Record<string, number> = {}
    ;(entriesBySource || []).forEach((l: any) => {
      const s = l.source || 'direct'
      bySource[s] = (bySource[s] || 0) + 1
    })

    const formationLabels: Record<string, string> = { inge_son: 'Ingé son', beatmaking: 'Beatmaking', autre: 'Autre' }
    const sourceLabels: Record<string, string> = {
      direct: 'Direct',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      facebook: 'Facebook',
      google: 'Google',
      youtube: 'YouTube',
    }

    const lines: string[] = [
      `=== RAPPORT CHIFFRÉS BPM Formation – ${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ===`,
      '',
      '## CHIFFRES CLÉS (argent / CA)',
      `- CA ce mois : ${caMois.toFixed(2)} €`,
      `- CA mois précédent : ${caMoisPrecedent.toFixed(2)} €`,
      evolutionCAMois !== null ? `- Évolution CA mois : ${evolutionCAMois >= 0 ? '+' : ''}${evolutionCAMois.toFixed(1)}%` : '',
      '',
      `- CA cette semaine : ${caSemaine.toFixed(2)} €`,
      `- CA semaine dernière : ${caSemaineDerniere.toFixed(2)} €`,
      evolutionCASemaine !== null ? `- Évolution CA semaine : ${evolutionCASemaine >= 0 ? '+' : ''}${evolutionCASemaine.toFixed(1)}%` : '',
      '',
      '## LEADS ET VENTES',
      `- Leads clos ce mois : ${closMois}`,
      `- Leads clos mois précédent : ${closPrevMois}`,
      evolutionClosMois !== null ? `- Évolution clos : ${evolutionClosMois >= 0 ? '+' : ''}${evolutionClosMois.toFixed(1)}%` : '',
      '',
      `- Nouveaux leads ce mois : ${leadsMois}`,
      `- Nouveaux leads mois précédent : ${leadsPrevMois}`,
      '',
      '## CA PAR FORMATION (ce mois)',
      ...Object.entries(byFormation).map(([f, v]) => `- ${formationLabels[f] || f} : ${v.toFixed(2)} €`),
      '',
      '## VENTES CLOS PAR SOURCE (mois précédent)',
      ...Object.entries(bySource).slice(0, 6).map(([s, c]) => `- ${sourceLabels[s] || s} : ${c}`),
    ].filter(Boolean)

    return lines.join('\n')
  } catch (err: any) {
    return `Erreur : ${err.message}`
  }
}
