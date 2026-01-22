import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

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

  const adminClient = createAdminClient()

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
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Mon Espace</h1>
        <p className="text-white/50 text-lg">
          Vos ventes et statistiques personnelles
        </p>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="apple-card rounded-2xl p-6">
          <div className="text-sm text-white/60 mb-2 font-medium">CA Total</div>
          <div className="text-3xl font-semibold tracking-tight">{totalCA.toFixed(2)} €</div>
        </div>
        <div className="apple-card rounded-2xl p-6">
          <div className="text-sm text-white/60 mb-2 font-medium">Commissions</div>
          <div className="text-3xl font-semibold tracking-tight">{totalCommissions.toFixed(2)} €</div>
        </div>
        <div className="apple-card rounded-2xl p-6">
          <div className="text-sm text-white/60 mb-2 font-medium">Nombre de ventes</div>
          <div className="text-3xl font-semibold tracking-tight">{totalSales}</div>
        </div>
        <div className="apple-card rounded-2xl p-6">
          <div className="text-sm text-white/60 mb-2 font-medium">Leads closés</div>
          <div className="text-3xl font-semibold tracking-tight">{closedLeads}</div>
        </div>
      </div>

      {/* Statistiques par mois */}
      <div className="apple-card rounded-2xl p-6">
        <h2 className="text-2xl font-semibold text-white mb-6">Statistiques par mois</h2>
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
      </div>

      {/* Détail des ventes */}
      <div className="apple-card rounded-2xl p-6">
        <h2 className="text-2xl font-semibold text-white mb-6">Détail de mes ventes</h2>
        {mySales.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/50 text-lg">Aucune vente enregistrée</p>
            <p className="text-white/30 text-sm mt-2">
              Vos ventes apparaîtront ici une fois que vous aurez clos des leads
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
        )}
      </div>
    </div>
  )
}
