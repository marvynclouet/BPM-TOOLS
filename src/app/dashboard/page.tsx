import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import PieChart from '@/components/dashboard/PieChart'
import MiniCalendar from '@/components/dashboard/MiniCalendar'
import RecentLeads from '@/components/dashboard/RecentLeads'
import RecentComments from '@/components/dashboard/RecentComments'
import ActivityChart from '@/components/dashboard/ActivityChart'
import ClosersRanking from '@/components/dashboard/ClosersRanking'
import AIReportsSection from '@/components/dashboard/AIReportsSection'
import { getDemoLeads, getDemoUser, isDemoMode } from '@/lib/demo-data'
import { getCurrentUser } from '@/lib/auth'

// Toujours recharger les données (CA, commissions, etc.) à chaque visite
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const demoSession = cookieStore.get('demo_session')?.value === '1'

  if (isDemoMode() && demoSession) {
    const demoLeads = getDemoLeads()
    const demoUser = getDemoUser()
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const leads24h = demoLeads.filter(l => new Date(l.created_at) >= last24h).length
    const leads7d = demoLeads.filter(l => new Date(l.created_at) >= last7d).length
    const leadsAppeles = demoLeads.filter(l => l.status === 'appele').length
    const leadsPayes = demoLeads.filter(l => ['clos', 'acompte_regle'].includes(l.status)).length
    const totalAppeles = demoLeads.filter(l => ['appele', 'acompte_regle', 'clos'].includes(l.status)).length
    const totalClos = demoLeads.filter(l => l.status === 'clos').length
    const closingRate = totalAppeles > 0 ? (totalClos / totalAppeles) * 100 : 0
    const statusCounts: Record<string, number> = {}
    demoLeads.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1 })
    const statusDistribution = [
      { label: 'Nouveau', value: statusCounts['nouveau'] || 0, color: 'bg-blue-500' },
      { label: 'Appelé', value: statusCounts['appele'] || 0, color: 'bg-purple-500' },
      { label: 'Acompte réglé', value: statusCounts['acompte_regle'] || 0, color: 'bg-orange-500' },
      { label: 'Closé', value: statusCounts['clos'] || 0, color: 'bg-green-500' },
      { label: 'KO', value: statusCounts['ko'] || 0, color: 'bg-red-500' },
    ]
    const recentLeads = [...demoLeads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6).map(l => ({
      id: l.id,
      first_name: l.first_name,
      last_name: l.last_name,
      phone: l.phone,
      formation: l.formation,
      status: l.status,
      created_at: l.created_at,
    }))

    return (
      <div className="space-y-6 sm:space-y-8 animate-fade-in pb-4 sm:pb-6">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-white/50 text-xs sm:text-sm">Vue d&apos;ensemble de l&apos;activité (démo)</p>
        </div>
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            Vue d&apos;ensemble
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard title="Nouveaux leads (24h)" value={leads24h} subtitle={`${leads7d} sur 7 jours`} icon="📈" color="blue" />
          <KPICard title="Appelés" value={leadsAppeles} subtitle="En attente de réponse" icon="💬" color="purple" />
          <KPICard title="Payés" value={leadsPayes} subtitle="Paiements confirmés" icon="✅" color="green" />
          <KPICard title="Closing rate" value={`${closingRate.toFixed(1)}%`} subtitle={`${totalClos} / ${totalAppeles}`} icon="📊" color="orange" />
          </div>
        </section>
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            Finances & actions prioritaires
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="apple-card rounded-xl p-3 sm:p-4 border-white/5">
            <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-2">📅 CA du mois</h3>
            <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">0 €</p>
          </div>
          <div className="apple-card rounded-xl p-3 sm:p-4 border-white/5">
            <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-2">🔔 Leads à relancer</h3>
            <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">0</p>
          </div>
          <div className="apple-card rounded-xl p-3 sm:p-4 border-white/5">
            <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-1">💰 Acomptes en cours</h3>
            <p className="text-xs text-white/50 mb-2">Élèves avec acompte réglé – restant à payer</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-white/60">Total perçus</span><span className="text-green-400 font-semibold">0,00 €</span></div>
              <div className="flex justify-between"><span className="text-white/60">Total restant</span><span className="text-amber-300 font-semibold">0,00 €</span></div>
            </div>
          </div>
          </div>
        </section>
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            Activité & tendances
          </h2>
          <ActivityChart leads={demoLeads.map(l => ({ created_at: l.created_at }))} title="Activité des leads (30 derniers jours)" />
        </section>
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            IA
          </h2>
          <AIReportsSection userId={demoUser.id} isAdmin={demoUser.role === 'admin'} />
        </section>
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            Leads & statuts
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <PieChart title="Répartition par statut" data={statusDistribution} />
            <RecentLeads leads={recentLeads} />
          </div>
          <RecentComments comments={[]} />
        </section>
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            Accès rapide
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuickAccessCard href="/dashboard/crm" title="CRM" description="Gérer les leads et suivre les ventes" icon="👥" />
          <QuickAccessCard href="/dashboard/comptabilite" title="Comptabilité" description="Voir les ventes et exporter les données" icon="💰" />
          <QuickAccessCard href="/dashboard/planning" title="Planning" description="Gérer le planning des formations" icon="📅" />
          </div>
        </section>
      </div>
    )
  }

  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      redirect('/login')
    }

    const currentUser = await getCurrentUser()
    const userId = currentUser?.id ?? authUser.id
    const isAdmin = currentUser?.role === 'admin'

    const adminClient = createAdminClient()

    // Essayer de récupérer les KPIs, mais si ça échoue, on affiche quand même la page
    let leads24h = { count: 0 }
    let leads7d = { count: 0 }
    let leadsAppeles = { count: 0 }
    let leadsPayes = { count: 0 }
    let totalAppeles = 0
    let totalClos = 0
    let recentLeads: any[] = []
    let planningEntries: any[] = []
    let statusDistribution: any[] = []
    let allLeadsForChart: any[] = []
    let closersRanking: any[] = []
    let topProducts: { formation: string; label: string; count: number; ca: number }[] = []
    let recentComments: any[] = []
    let monthStats: { caMois: number; caMoisPrecedent: number; evolutionPct: number | null } = { caMois: 0, caMoisPrecedent: 0, evolutionPct: null }
    let leadsARelancer = 0
    let acomptesEnCours: { totalPerçus: number; totalRestant: number; count: number } = { totalPerçus: 0, totalRestant: 0, count: 0 }
    let sourceStats: { source: string; label: string; count: number }[] = []
    let tendancesSemaine: { leadsDiff: number; closDiff: number } = { leadsDiff: 0, closDiff: 0 }

    try {
      const now = new Date()
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const [leads24hResult, leads7dResult, leadsAppelesResult, leadsPayesResult, recentLeadsResult, planningResult, statusResult, allLeadsResult] = await Promise.all([
        adminClient
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', last24h.toISOString()),
        adminClient
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', last7d.toISOString()),
        adminClient
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'appele'),
        adminClient
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .in('status', ['paye', 'clos']),
        adminClient
          .from('leads')
          .select('id, first_name, last_name, phone, formation, status, created_at')
          .order('created_at', { ascending: false })
          .limit(6),
        adminClient
          .from('planning')
          .select('*, planning_lead(lead_id, leads:lead_id(first_name, last_name, formation, formation_format))')
          .gte('start_date', now.toISOString())
          .lte('end_date', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('start_date', { ascending: true }),
        adminClient
          .from('leads')
          .select('status', { count: 'exact' })
          .in('status', ['nouveau', 'appele', 'acompte_regle', 'clos', 'ko']),
        adminClient
          .from('leads')
          .select('created_at')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: true }),
      ])

      leads24h = { count: leads24hResult.count || 0 }
      leads7d = { count: leads7dResult.count || 0 }
      leadsAppeles = { count: leadsAppelesResult.count || 0 }
      leadsPayes = { count: leadsPayesResult.count || 0 }
      recentLeads = recentLeadsResult.data || []
      planningEntries = (planningResult.data || []).map((p: any) => ({
        ...p,
        leads: (p.planning_lead || []).map((pl: any) => pl.leads).filter(Boolean),
      }))
      allLeadsForChart = allLeadsResult.data || []

      // Calculer la distribution des statuts
      const statusCounts: Record<string, number> = {}
      if (statusResult.data) {
        statusResult.data.forEach((item: any) => {
          statusCounts[item.status] = (statusCounts[item.status] || 0) + 1
        })
      }
      statusDistribution = [
        { label: 'Nouveau', value: statusCounts['nouveau'] || 0, color: 'bg-blue-500' },
        { label: 'Appelé', value: statusCounts['appele'] || 0, color: 'bg-purple-500' },
        { label: 'Acompte réglé', value: statusCounts['acompte_regle'] || 0, color: 'bg-orange-500' },
        { label: 'Closé', value: statusCounts['clos'] || 0, color: 'bg-green-500' },
        { label: 'KO', value: statusCounts['ko'] || 0, color: 'bg-red-500' },
      ]

      // Closing rate
      const { count: totalAppelesResult } = await adminClient
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .in('status', ['appele', 'acompte_regle', 'clos'])

      const { count: totalClosResult } = await adminClient
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'clos')

      totalAppeles = totalAppelesResult || 0
      totalClos = totalClosResult || 0

      // Calculer le classement des closers du mois
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      // Récupérer les entrées comptables du mois
      const { data: monthAccountingEntries } = await adminClient
        .from('accounting_entries')
        .select('*, leads:lead_id(closer_id, first_name, last_name)')
        .gte('created_at', startOfMonth.toISOString())
        .order('created_at', { ascending: false })

      // Récupérer les IDs des closers
      const closerIds = [...new Set(
        (monthAccountingEntries || [])
          .map((entry: any) => entry.leads?.closer_id)
          .filter(Boolean)
      )]

      // Récupérer les infos des closers
      let closersInfo: any[] = []
      if (closerIds.length > 0) {
        const { data: closersData } = await adminClient
          .from('users')
          .select('id, full_name, email')
          .in('id', closerIds)
        
        closersInfo = closersData || []
      }

      // Calculer les stats par closer
      const statsByCloser: Record<string, {
        closer_id: string
        closer_name: string
        closer_email: string
        totalCA: number
        totalCommissions: number
        totalSales: number
        closedLeads: number
      }> = {}

      // Compter les leads closés par closer
      const { data: closedLeadsData } = await adminClient
        .from('leads')
        .select('closer_id')
        .in('status', ['clos', 'acompte_regle'])
        .gte('updated_at', startOfMonth.toISOString())
        .not('closer_id', 'is', null)

      const closedLeadsByCloser: Record<string, number> = {}
      closedLeadsData?.forEach((lead: any) => {
        if (lead.closer_id) {
          closedLeadsByCloser[lead.closer_id] = (closedLeadsByCloser[lead.closer_id] || 0) + 1
        }
      })

      // Agréger les stats
      monthAccountingEntries?.forEach((entry: any) => {
        const closerId = entry.leads?.closer_id
        if (!closerId) return

        const closerInfo = closersInfo.find(c => c.id === closerId)
        
        if (!statsByCloser[closerId]) {
          statsByCloser[closerId] = {
            closer_id: closerId,
            closer_name: closerInfo?.full_name || '',
            closer_email: closerInfo?.email || '',
            totalCA: 0,
            totalCommissions: 0,
            totalSales: 0,
            closedLeads: closedLeadsByCloser[closerId] || 0,
          }
        }

        statsByCloser[closerId].totalCA += Number(entry.amount || 0)
        statsByCloser[closerId].totalCommissions += Number(entry.commission_closer || 0)
        statsByCloser[closerId].totalSales += 1
      })

      closersRanking = Object.values(statsByCloser)

      // Top des produits vendus (par formation)
      const { data: allAccountingEntries } = await adminClient
        .from('accounting_entries')
        .select('amount, lead_id, leads:lead_id(formation)')
        .order('created_at', { ascending: false })

      const formationLabels: Record<string, string> = {
        inge_son: 'Ingé son',
        beatmaking: 'Beatmaking',
        autre: 'Autre',
      }
      const byFormation: Record<string, { count: number; ca: number }> = {}
      ;(allAccountingEntries || []).forEach((entry: any) => {
        const formation = entry.leads?.formation || 'autre'
        if (!byFormation[formation]) byFormation[formation] = { count: 0, ca: 0 }
        byFormation[formation].count += 1
        byFormation[formation].ca += Number(entry.amount || 0)
      })
      topProducts = Object.entries(byFormation)
        .map(([formation, { count, ca }]) => ({
          formation,
          label: formationLabels[formation] || formation,
          count,
          ca,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      // Derniers commentaires sur les leads (date, auteur, lead, commentaire)
      const { data: commentsData } = await adminClient
        .from('lead_comments')
        .select(`
          id,
          comment,
          created_at,
          lead_id,
          leads:lead_id(first_name, last_name),
          users:user_id(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(10)
      recentComments = (commentsData || []).map((c: any) => ({
        id: c.id,
        comment: c.comment,
        created_at: c.created_at,
        lead_id: c.lead_id,
        lead: c.leads || {},
        user: c.users || {},
      }))

      // Résumé du mois : CA mois actuel + mois précédent + évolution
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      const { data: monthEntries } = await adminClient
        .from('accounting_entries')
        .select('amount')
        .gte('created_at', startOfMonth.toISOString())
      const { data: prevMonthEntries } = await adminClient
        .from('accounting_entries')
        .select('amount')
        .gte('created_at', startOfPrevMonth.toISOString())
        .lte('created_at', endOfPrevMonth.toISOString())
      const caMois = (monthEntries || []).reduce((s, e) => s + Number(e.amount || 0), 0)
      const caMoisPrecedent = (prevMonthEntries || []).reduce((s, e) => s + Number(e.amount || 0), 0)
      const evolutionPct = caMoisPrecedent > 0 ? ((caMois - caMoisPrecedent) / caMoisPrecedent) * 100 : null
      monthStats = { caMois, caMoisPrecedent, evolutionPct }

      // Leads à relancer : status appelé + (last_action_at ou updated_at) > 5 jours
      const cinqJoursAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
      const { data: appeledLeads } = await adminClient
        .from('leads')
        .select('id, last_action_at, updated_at')
        .eq('status', 'appele')
      leadsARelancer = (appeledLeads || []).filter((l: any) => {
        const d = l.last_action_at || l.updated_at
        return d && new Date(d) < new Date(cinqJoursAgo)
      }).length

      // Acomptes en cours : même logique que Gestion (leads acompte_regle + accounting_entries ou fallback lead)
      const { data: closedForAcompte } = await adminClient
        .from('leads')
        .select('id, price_fixed, price_deposit')
        .eq('status', 'acompte_regle')
      const acompteRegleLeads = closedForAcompte || []
      const acompteRegleIds = acompteRegleLeads.map((l: { id: string }) => l.id)

      const accountingByLead: Record<string, { amount: number; remaining_amount: number }> = {}
      if (acompteRegleIds.length > 0) {
        const { data: accEntries } = await adminClient
          .from('accounting_entries')
          .select('lead_id, amount, remaining_amount, status')
          .in('lead_id', acompteRegleIds)
          .eq('entry_type', 'acompte')
        const activeEntries = (accEntries || []).filter((e: any) => (e.status || 'actif') !== 'annulé')
        activeEntries.forEach((e: any) => {
          accountingByLead[e.lead_id] = {
            amount: Number(e.amount || 0),
            remaining_amount: e.remaining_amount != null ? Number(e.remaining_amount) : 0,
          }
        })
        acompteRegleLeads.forEach((l: any) => {
          if (!accountingByLead[l.id]) {
            const total = l.price_fixed != null ? Number(l.price_fixed) : 0
            const deposit = l.price_deposit != null ? Number(l.price_deposit) : 0
            accountingByLead[l.id] = { amount: deposit, remaining_amount: Math.max(0, total - deposit) }
          }
        })
      }

      acomptesEnCours = {
        totalPerçus: Object.values(accountingByLead).reduce((s, v) => s + v.amount, 0),
        totalRestant: Object.values(accountingByLead).reduce((s, v) => s + v.remaining_amount, 0),
        count: acompteRegleLeads.length,
      }

      // Répartition par source (7 derniers jours) – optimiser le marketing
      const { data: leadsSource } = await adminClient
        .from('leads')
        .select('source')
        .gte('created_at', last7d.toISOString())
      const sourceCounts: Record<string, number> = {}
      ;(leadsSource || []).forEach((l: any) => {
        const s = l.source || 'direct'
        sourceCounts[s] = (sourceCounts[s] || 0) + 1
      })
      const sourceLabels: Record<string, string> = {
        direct: 'Direct',
        instagram: 'Instagram',
        tiktok: 'TikTok',
        facebook: 'Facebook',
        google: 'Google',
        youtube: 'YouTube',
        manuel: 'Manuel',
        autre: 'Autre',
      }
      sourceStats = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, label: sourceLabels[source] || source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      // Tendances semaine : leads et clos cette semaine vs semaine précédente
      // Semaine = lundi à dimanche. Si aujourd'hui = dimanche, "cette semaine" = lundi dernier (pas lundi prochain)
      const startOfWeek = new Date(now)
      const daysToMonday = now.getDay() === 0 ? 6 : now.getDay() - 1
      startOfWeek.setDate(now.getDate() - daysToMonday)
      startOfWeek.setHours(0, 0, 0, 0)
      const startOfLastWeek = new Date(startOfWeek)
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)
      const endOfLastWeek = new Date(startOfWeek.getTime() - 1)

      const { count: leadsThisWeek } = await adminClient
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfWeek.toISOString())
      const { count: leadsLastWeek } = await adminClient
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfLastWeek.toISOString())
        .lte('created_at', endOfLastWeek.toISOString())
      const { count: closThisWeek } = await adminClient
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'clos')
        .gte('updated_at', startOfWeek.toISOString())
      const { count: closLastWeek } = await adminClient
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'clos')
        .gte('updated_at', startOfLastWeek.toISOString())
        .lte('updated_at', endOfLastWeek.toISOString())

      tendancesSemaine = {
        leadsDiff: (leadsThisWeek || 0) - (leadsLastWeek || 0),
        closDiff: (closThisWeek || 0) - (closLastWeek || 0),
      }
    } catch (dbError: any) {
      console.log('⚠️ Erreur DB (mais on continue):', dbError.message)
      // On continue quand même avec des valeurs par défaut
    }

    const closingRate =
      totalAppeles && totalAppeles > 0
        ? ((totalClos || 0) / totalAppeles) * 100
        : 0

    return (
      <div className="space-y-6 sm:space-y-8 animate-fade-in pb-4 sm:pb-6">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-white/50 text-xs sm:text-sm">Vue d&apos;ensemble de l&apos;activité</p>
        </div>

        {/* ===== VUE D'ENSEMBLE ===== */}
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            Vue d&apos;ensemble
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            title="Nouveaux leads (24h)"
            value={leads24h.count || 0}
            subtitle={`${leads7d.count || 0} sur 7 jours`}
            icon="📈"
            color="blue"
          />
          <KPICard
            title="Appelés"
            value={leadsAppeles.count || 0}
            subtitle="En attente de réponse"
            icon="💬"
            color="purple"
          />
          <KPICard
            title="Payés"
            value={leadsPayes.count || 0}
            subtitle="Paiements confirmés"
            icon="✅"
            color="green"
          />
          <KPICard
            title="Closing rate"
            value={`${closingRate.toFixed(1)}%`}
            subtitle={`${totalClos || 0} / ${totalAppeles || 0}`}
            icon="📊"
            color="orange"
          />
          </div>
        </section>

        {/* ===== FINANCES & ACTIONS PRIORITAIRES ===== */}
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            Finances & actions prioritaires
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="apple-card rounded-xl p-3 sm:p-4 border-white/5">
            <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-2">📅 CA du mois</h3>
            <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              {(Math.round(monthStats.caMois * 100) / 100).toFixed(2).replace('.', ',')} €
            </p>
            {monthStats.evolutionPct !== null && (
              <p className={`text-xs mt-1 ${monthStats.evolutionPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {monthStats.evolutionPct >= 0 ? '+' : ''}{monthStats.evolutionPct.toFixed(1)}% vs mois préc.
              </p>
            )}
          </div>
          <Link href="/dashboard/crm" className="apple-card apple-card-hover rounded-xl p-3 sm:p-4 border-white/5 block">
            <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-2">🔔 Leads à relancer</h3>
            <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">{leadsARelancer}</p>
            <p className="text-xs text-white/50 mt-1">Appelés sans action depuis 5+ jours</p>
          </Link>
          <Link href="/dashboard/gestion" className="apple-card apple-card-hover rounded-xl p-3 sm:p-4 border-white/5 block">
            <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-1">💰 Acomptes en cours</h3>
            <p className="text-xs text-white/50 mb-2">Élèves avec acompte réglé – restant à payer, modifier en compta</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-white/60">Total des acomptes perçus</span>
                <span className="font-semibold text-green-400">{(Math.round(acomptesEnCours.totalPerçus * 100) / 100).toFixed(2).replace('.', ',')} €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60">Total restant à régler</span>
                <span className="font-semibold text-amber-300">{(Math.round(acomptesEnCours.totalRestant * 100) / 100).toFixed(2).replace('.', ',')} €</span>
              </div>
            </div>
            <p className="text-[10px] text-white/40 mt-2">{acomptesEnCours.count} élève{acomptesEnCours.count > 1 ? 's' : ''}</p>
          </Link>
          </div>
        </section>

        {/* ===== ACTIVITÉ & TENDANCES ===== */}
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            Activité & tendances
          </h2>
          <div className="space-y-3">
          <ActivityChart leads={allLeadsForChart} title="Activité des leads (30 derniers jours)" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="apple-card rounded-xl p-3 sm:p-4 border-white/5">
            <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-1">📊 Tendances semaine</h3>
            <p className="text-xs text-white/50 mb-2">Cette semaine vs semaine précédente</p>
            <div className="flex gap-4 sm:gap-6">
              <div>
                <span className="text-white/60 text-sm">Nouveaux leads</span>
                <p className={`text-lg sm:text-xl font-semibold ${tendancesSemaine.leadsDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {tendancesSemaine.leadsDiff >= 0 ? '+' : ''}{tendancesSemaine.leadsDiff}
                </p>
              </div>
              <div>
                <span className="text-white/60 text-sm">Clos</span>
                <p className={`text-lg sm:text-xl font-semibold ${tendancesSemaine.closDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {tendancesSemaine.closDiff >= 0 ? '+' : ''}{tendancesSemaine.closDiff}
                </p>
              </div>
            </div>
          </div>
          <div className="apple-card rounded-xl p-3 sm:p-4 border-white/5">
            <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase mb-2">📡 Sources des leads (7j)</h3>
            {sourceStats.length > 0 ? (
              <div className="space-y-2">
                {sourceStats.slice(0, 4).map((s) => (
                  <div key={s.source} className="flex items-center gap-2">
                    <span className="text-white/70 text-sm w-20 truncate">{s.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500/80"
                        style={{ width: `${Math.max(10, Math.min(100, (s.count / (sourceStats[0]?.count || 1)) * 100))}%` }}
                      />
                    </div>
                    <span className="text-white font-medium text-sm w-6">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 text-sm">Aucune donnée sur 7 jours</p>
            )}
          </div>
          </div>
          </div>
        </section>

        {/* ===== IA ===== */}
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            IA
          </h2>
          <AIReportsSection userId={userId} isAdmin={isAdmin} />
        </section>

        {/* ===== PLANNING & FORMATIONS ===== */}
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            Planning & formations
          </h2>
          <div className="space-y-3">
        {planningEntries.length > 0 && (
          <Link href="/dashboard/planning" className="apple-card apple-card-hover rounded-xl p-4 border-white/5 block">
            <h3 className="text-base font-semibold text-white mb-3 flex items-center justify-between">
              <span>📅 Prochaines formations</span>
              <span className="text-sm text-blue-400 font-medium">Voir le planning →</span>
            </h3>
            <div className="space-y-2">
              {planningEntries.slice(0, 5).map((entry: any, idx: number) => {
                const leadList = Array.isArray(entry.leads) ? entry.leads : entry.leads ? [entry.leads] : []
                const first = leadList[0]
                const formationLabels: Record<string, string> = { inge_son: 'Ingé son', beatmaking: 'Beatmaking', autre: 'Autre' }
                const formatLabels: Record<string, string> = { semaine: 'Semaine', mensuelle: 'Mensuelle', bpm_fast: 'BPM Fast' }
                const dateStr = entry.specific_dates?.[0] || entry.start_date
                const date = dateStr ? new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`) : null
                const label = first ? `${formationLabels[first.formation] || first.formation || ''} (${formatLabels[first.formation_format] || first.formation_format || ''})` : 'Formation'
                return (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 text-sm">
                    <span className="text-white/90 font-medium truncate">{label}</span>
                    <span className="text-white/50 text-xs shrink-0">
                      {date ? date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : ''} · {leadList.length} participant{leadList.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </Link>
        )}
          <MiniCalendar entries={planningEntries} />
          </div>
        </section>

        {/* ===== LEADS & STATUTS ===== */}
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            Leads & statuts
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <PieChart
                title="Répartition par statut"
                data={statusDistribution}
              />
              <RecentLeads leads={recentLeads} />
            </div>
            <RecentComments comments={recentComments} />
          </div>
        </section>

        {/* ===== PERFORMANCE ===== */}
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            Performance
          </h2>
          <div className="space-y-3">
        {/* Top des produits vendus */}
        {topProducts.length > 0 && (
          <div className="apple-card rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <span>🏆</span> Top des produits vendus
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {topProducts.map((product, idx) => (
                <div
                  key={product.formation}
                  className="flex items-center justify-between py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-white/50 font-semibold text-sm w-5 sm:w-6">{idx + 1}</span>
                    <span className="font-medium text-white text-sm sm:text-base">{product.label}</span>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                    <span className="text-white/70">
                      <span className="text-white font-semibold">{product.count}</span> vente{product.count > 1 ? 's' : ''}
                    </span>
                    <span className="text-green-400 font-semibold">
                      {(Math.round(product.ca * 100) / 100).toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {closersRanking.length > 0 && (
          <ClosersRanking closersStats={closersRanking} period="month" />
        )}
          </div>
        </section>

        {/* ===== ACCÈS RAPIDE ===== */}
        <section className="pt-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            Accès rapide
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuickAccessCard
            href="/dashboard/crm"
            title="CRM"
            description="Gérer les leads et suivre les ventes"
            icon="👥"
          />
          <QuickAccessCard
            href="/dashboard/comptabilite"
            title="Comptabilité"
            description="Voir les ventes et exporter les données"
            icon="💰"
          />
          <QuickAccessCard
            href="/dashboard/planning"
            title="Planning"
            description="Gérer le planning des formations"
            icon="📅"
          />
          </div>
        </section>
      </div>
    )
  } catch (error: any) {
    console.error('❌ Dashboard Page - Unexpected error:', error.message)
    redirect('/login')
  }
}

function KPICard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red'
}) {
  const colorClasses = {
    blue: 'border-blue-500/20',
    purple: 'border-purple-500/20',
    green: 'border-green-500/20',
    orange: 'border-orange-500/20',
    red: 'border-red-500/20',
  }

  const iconColors = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
  }

  return (
    <div className={`apple-card apple-card-hover rounded-xl p-3 sm:p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <h3 className="text-[10px] sm:text-xs font-medium text-white/60 tracking-wide uppercase truncate flex-1 pr-2">{title}</h3>
        {icon && <span className={`text-lg sm:text-xl flex-shrink-0 ${iconColors[color]}`}>{icon}</span>}
      </div>
      <p className="text-2xl sm:text-3xl font-semibold mb-1 text-white tracking-tight animate-count-up">{value}</p>
      {subtitle && <p className="text-[10px] sm:text-xs text-white/40 font-light">{subtitle}</p>}
    </div>
  )
}

function QuickAccessCard({
  href,
  title,
  description,
  icon,
}: {
  href: string
  title: string
  description: string
  icon?: string
}) {
  return (
    <Link
      href={href}
      className="block apple-card apple-card-hover rounded-xl p-3 sm:p-4 group"
    >
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform duration-300">{icon}</span>}
        <h3 className="text-base sm:text-lg font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="text-[10px] sm:text-xs text-white/50 font-light leading-relaxed">{description}</p>
    </Link>
  )
}
