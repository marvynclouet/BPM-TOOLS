import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import AdminClosersStats from '@/components/dashboard/AdminClosersStats'
import type { CloserStat } from '@/components/dashboard/AdminClosersStats'

export default async function MonEspacePage() {
  const supabase = await createClient()
  
  // Vérifier si connecté
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Récupérer l'utilisateur complet
  const user = await getCurrentUser()
  const currentUserId = user?.id || authUser.id
  const isAdmin = user?.role === 'admin'

  const adminClient = createAdminClient()

  // Pour les admins : récupérer les stats de tous les closers (qui a vendu quoi, commissions)
  let closersStats: CloserStat[] = []
  if (isAdmin) {
    const { data: allEntries } = await adminClient
      .from('accounting_entries')
      .select(`
        id,
        created_at,
        amount,
        commission_closer,
        entry_type,
        lead_id,
        leads:lead_id(
          closer_id,
          first_name,
          last_name,
          formation
        )
      `)
      .order('created_at', { ascending: false })

    const closerIds = [...new Set((allEntries || []).map((e: any) => e.leads?.closer_id).filter(Boolean))]
    const { data: usersData } = await adminClient
      .from('users')
      .select('id, full_name, email')
      .in('id', closerIds)

    const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]))

    const byCloser: Record<string, CloserStat> = {}
    ;(allEntries || []).forEach((entry: any) => {
      const lead = entry.leads
      const closerId = lead?.closer_id
      if (!closerId) return

      const u = usersMap.get(closerId)
      if (!byCloser[closerId]) {
        byCloser[closerId] = {
          closer_id: closerId,
          closer_name: u?.full_name || '',
          closer_email: u?.email || '',
          totalCA: 0,
          totalCommissions: 0,
          totalSales: 0,
          sales: [],
        }
      }

      const amount = Number(entry.amount || 0)
      const commission = Number(entry.commission_closer || 0)
      byCloser[closerId].totalCA += amount
      byCloser[closerId].totalCommissions += commission
      byCloser[closerId].totalSales += 1
      byCloser[closerId].sales.push({
        id: entry.id,
        created_at: entry.created_at,
        amount,
        commission_closer: commission,
        client_name: `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim() || '-',
        formation: lead?.formation || '',
        entry_type: entry.entry_type || '',
      })
    })
    closersStats = Object.values(byCloser).sort((a, b) => b.totalCA - a.totalCA)
  }

  // Récupérer tous les leads assignés à l'utilisateur connecté
  const { data: myLeads } = await adminClient
    .from('leads')
    .select('*')
    .eq('closer_id', currentUserId)
    .order('created_at', { ascending: false })

  // Récupérer les entrées comptables pour les leads de l'utilisateur
  const myLeadIds = myLeads?.map(l => l.id) || []
  let mySales: any[] = []

  if (myLeadIds.length > 0) {
    const { data: accountingEntries } = await adminClient
      .from('accounting_entries')
      .select('*, leads:lead_id(id, first_name, last_name, formation, price_fixed)')
      .in('lead_id', myLeadIds)
      .order('created_at', { ascending: false })

    mySales = accountingEntries || []
  }

  // Calculer les statistiques
  const totalCA = mySales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0)
  const totalCommissions = mySales.reduce((sum, sale) => sum + Number(sale.commission_closer || 0), 0)
  const totalSales = mySales.length
  const closedLeads = myLeads?.filter(l => l.status === 'clos' || l.status === 'acompte_regle').length || 0

  // Statistiques par mois (12 derniers mois)
  const monthlyStats = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthYear = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
    
    const monthSales = mySales.filter(sale => {
      const saleDate = new Date(sale.created_at)
      const saleMonth = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`
      return saleMonth === monthYear
    })

    const monthCA = monthSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0)
    const monthCommissions = monthSales.reduce((sum, sale) => sum + Number(sale.commission_closer || 0), 0)

    monthlyStats.push({
      month: monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      monthYear,
      ca: monthCA,
      commissions: monthCommissions,
      sales: monthSales.length,
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Mon Espace</h1>
        <p className="text-white/50 text-sm sm:text-base lg:text-lg">
          Vos ventes et statistiques personnelles
        </p>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        <div className="apple-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 font-medium">CA Total</div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">{totalCA.toFixed(2)} €</div>
        </div>
        <div className="apple-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 font-medium">Commissions</div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">{totalCommissions.toFixed(2)} €</div>
        </div>
        <div className="apple-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 font-medium">Nombre de ventes</div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">{totalSales}</div>
        </div>
        <div className="apple-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 font-medium">Leads closés</div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">{closedLeads}</div>
        </div>
      </div>

      {/* Statistiques par mois */}
      <div className="apple-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Statistiques par mois</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-sm font-semibold text-white/60 uppercase">Mois</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white/60 uppercase">CA</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white/60 uppercase">Commissions</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white/60 uppercase">Ventes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {monthlyStats.map((stat, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">
                    {stat.month.charAt(0).toUpperCase() + stat.month.slice(1)}
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {stat.ca.toFixed(2)} €
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {stat.commissions.toFixed(2)} €
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {stat.sales}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Vue mobile - Statistiques par mois */}
        <div className="lg:hidden space-y-3">
          {monthlyStats.map((stat, idx) => (
            <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-base font-semibold text-white mb-3">
                {stat.month.charAt(0).toUpperCase() + stat.month.slice(1)}
              </h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-white/50 text-xs mb-1">CA</div>
                  <div className="text-white font-semibold">{stat.ca.toFixed(2)} €</div>
                </div>
                <div>
                  <div className="text-white/50 text-xs mb-1">Commissions</div>
                  <div className="text-green-400 font-semibold">{stat.commissions.toFixed(2)} €</div>
                </div>
                <div>
                  <div className="text-white/50 text-xs mb-1">Ventes</div>
                  <div className="text-white font-semibold">{stat.sales}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Détail des ventes */}
      <div className="apple-card rounded-2xl p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Détail de mes ventes</h2>
        {mySales.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-white/50 text-base sm:text-lg">Aucune vente enregistrée</p>
            <p className="text-white/30 text-xs sm:text-sm mt-2">
              Vos ventes apparaîtront ici une fois que vous aurez clos des leads
            </p>
          </div>
        ) : (
          <>
            {/* Vue desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/60 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/60 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/60 uppercase">Formation</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white/60 uppercase">Montant</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white/60 uppercase">Commission</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/60 uppercase">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mySales.map((sale) => {
                  const lead = sale.leads
                  const formationLabels: Record<string, string> = {
                    inge_son: 'Ingé son',
                    beatmaking: 'Beatmaking',
                    autre: 'Autre',
                  }
                  return (
                    <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-white text-sm">
                        {format(new Date(sale.created_at), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-3 text-white text-sm">
                        {lead?.first_name} {lead?.last_name}
                      </td>
                      <td className="px-4 py-3 text-white text-sm">
                        {lead?.formation ? formationLabels[lead.formation] || lead.formation : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-semibold">
                        {Number(sale.amount || 0).toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-400">
                        {Number(sale.commission_closer || 0).toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-white text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/10">
                          {sale.entry_type === 'acompte' ? 'Acompte' : 
                           sale.entry_type === 'solde' ? 'Solde' : 
                           sale.entry_type === 'complet' ? 'Complet' : sale.entry_type}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Vue mobile - Détail des ventes */}
          <div className="lg:hidden space-y-3">
            {mySales.map((sale) => {
              const lead = sale.leads
              const formationLabels: Record<string, string> = {
                inge_son: 'Ingé son',
                beatmaking: 'Beatmaking',
                autre: 'Autre',
              }
              return (
                <div key={sale.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {lead?.first_name} {lead?.last_name}
                      </h3>
                      <p className="text-sm text-white/60 mt-1">
                        {lead?.formation ? formationLabels[lead.formation] || lead.formation : '-'}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/10">
                      {sale.entry_type === 'acompte' ? 'Acompte' : 
                       sale.entry_type === 'solde' ? 'Solde' : 
                       sale.entry_type === 'complet' ? 'Complet' : sale.entry_type}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-sm">
                    <div>
                      <div className="text-white/50 text-xs mb-1">Date</div>
                      <div className="text-white">
                        {format(new Date(sale.created_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50 text-xs mb-1">Montant</div>
                      <div className="text-white font-semibold">
                        {Number(sale.amount || 0).toFixed(2)} €
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-white/50 text-xs mb-1">Commission</div>
                      <div className="text-green-400 font-semibold">
                        {Number(sale.commission_closer || 0).toFixed(2)} €
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          </>
        )}
      </div>

      {/* Section admin : stats des closers (graphiques + qui a vendu quoi) */}
      {isAdmin && (
        <div className="pt-6 sm:pt-8 border-t border-white/10">
          <AdminClosersStats closersStats={closersStats} />
        </div>
      )}
    </div>
  )
}
