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
import { getDemoLeads, isDemoMode } from '@/lib/demo-data'

// Toujours recharger les données (CA, commissions, etc.) à chaque visite
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const demoSession = cookieStore.get('demo_session')?.value === '1'

  if (isDemoMode() && demoSession) {
    const demoLeads = getDemoLeads()
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
      <div className="space-y-3 sm:space-y-4 animate-fade-in pb-4 sm:pb-6">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-white/50 text-xs sm:text-sm">Vue d&apos;ensemble de l&apos;activité (démo)</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard title="Nouveaux leads (24h)" value={leads24h} subtitle={`${leads7d} sur 7 jours`} icon="📈" color="blue" />
          <KPICard title="Appelés" value={leadsAppeles} subtitle="En attente de réponse" icon="💬" color="purple" />
          <KPICard title="Payés" value={leadsPayes} subtitle="Paiements confirmés" icon="✅" color="green" />
          <KPICard title="Closing rate" value={`${closingRate.toFixed(1)}%`} subtitle={`${totalClos} / ${totalAppeles}`} icon="📊" color="orange" />
        </div>
        <ActivityChart leads={demoLeads.map(l => ({ created_at: l.created_at }))} title="Activité des leads (30 derniers jours)" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PieChart title="Répartition par statut" data={statusDistribution} />
          <RecentLeads leads={recentLeads} />
        </div>
        <RecentComments comments={[]} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuickAccessCard href="/dashboard/crm" title="CRM" description="Gérer les leads et suivre les ventes" icon="👥" />
          <QuickAccessCard href="/dashboard/comptabilite" title="Comptabilité" description="Voir les ventes et exporter les données" icon="💰" />
          <QuickAccessCard href="/dashboard/planning" title="Planning" description="Gérer le planning des formations" icon="📅" />
        </div>
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
    } catch (dbError: any) {
      console.log('⚠️ Erreur DB (mais on continue):', dbError.message)
      // On continue quand même avec des valeurs par défaut
    }

    const closingRate =
      totalAppeles && totalAppeles > 0
        ? ((totalClos || 0) / totalAppeles) * 100
        : 0

    return (
      <div className="space-y-3 sm:space-y-4 animate-fade-in pb-4 sm:pb-6">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-white/50 text-xs sm:text-sm">Vue d&apos;ensemble de l&apos;activité</p>
        </div>

        {/* KPIs avec animations */}
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

        {/* Graphique d'activité */}
        <ActivityChart leads={allLeadsForChart} title="Activité des leads (30 derniers jours)" />

        {/* Graphiques et données */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PieChart
            title="Répartition par statut"
            data={statusDistribution}
          />
          <RecentLeads leads={recentLeads} />
        </div>

        {/* Derniers commentaires sur les leads */}
        <RecentComments comments={recentComments} />

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

        {/* Classement des closers */}
        {closersRanking.length > 0 && (
          <ClosersRanking closersStats={closersRanking} period="month" />
        )}

        {/* Planning */}
        <div>
          <MiniCalendar entries={planningEntries} />
        </div>

        {/* Accès rapide alignés horizontalement */}
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
