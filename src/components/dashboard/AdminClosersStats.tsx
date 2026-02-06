'use client'

import PieChart from './PieChart'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

export interface CloserStat {
  closer_id: string
  closer_name: string
  closer_email: string
  totalCA: number
  totalCommissions: number
  totalSales: number
  sales: {
    id: string
    created_at: string
    amount: number
    commission_closer: number
    client_name: string
    formation: string
    entry_type: string
  }[]
}

const formationLabels: Record<string, string> = {
  inge_son: 'Ingé son',
  beatmaking: 'Beatmaking',
  autre: 'Autre',
}

const entryTypeLabels: Record<string, string> = {
  acompte: 'Acompte',
  solde: 'Solde',
  complet: 'Complet',
}

export default function AdminClosersStats({ closersStats }: { closersStats: CloserStat[] }) {
  if (closersStats.length === 0) {
    return (
      <div className="apple-card rounded-xl sm:rounded-2xl p-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">Stats des closers</h2>
        <p className="text-white/50 text-center py-8">Aucune vente enregistrée pour le moment.</p>
      </div>
    )
  }

  const totalCA = closersStats.reduce((s, c) => s + c.totalCA, 0)
  const totalCommissions = closersStats.reduce((s, c) => s + c.totalCommissions, 0)

  const formatEuro = (value: number) => {
    const rounded = Math.round(value * 100) / 100
    return rounded.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',') + ' €'
  }

  const pieDataCA = closersStats.map((c, idx) => ({
    label: c.closer_name || c.closer_email || 'Sans nom',
    value: Math.round(c.totalCA * 100) / 100,
    color: ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-yellow-500'][idx % 6],
  }))

  const pieDataCommissions = closersStats.map((c, idx) => ({
    label: c.closer_name || c.closer_email || 'Sans nom',
    value: Math.round(c.totalCommissions * 100) / 100,
    color: ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-yellow-500'][idx % 6],
  }))

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-1 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white tracking-tight">
          Stats des closers
        </h2>
        <p className="text-white/50 text-sm sm:text-base">
          Qui a vendu quoi, CA et commissions par closer
        </p>
      </div>

      {/* Graphiques camembert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <PieChart
          title="Répartition du CA par closer"
          data={pieDataCA}
          valueFormat={formatEuro}
        />
        <PieChart
          title="Répartition des commissions par closer"
          data={pieDataCommissions}
          valueFormat={formatEuro}
        />
      </div>

      {/* Tableau récap par closer */}
      <div className="apple-card rounded-xl sm:rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-white/10">
          <h3 className="text-lg sm:text-xl font-semibold text-white">Récap par closer</h3>
          <p className="text-white/50 text-xs sm:text-sm mt-1">
            Total global : {totalCA.toFixed(2)} € CA · {totalCommissions.toFixed(2)} € commissions
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase">Closer</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white/70 uppercase">CA</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white/70 uppercase">Commissions</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white/70 uppercase">Ventes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {closersStats.map((stat) => (
                <tr key={stat.closer_id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-white">
                      {stat.closer_name || stat.closer_email || 'Sans nom'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-white font-semibold">
                    {stat.totalCA.toFixed(2)} €
                  </td>
                  <td className="px-4 py-3 text-right text-green-400 font-semibold">
                    {stat.totalCommissions.toFixed(2)} €
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {stat.totalSales}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Détail : qui a vendu quoi */}
      <div className="space-y-4 sm:space-y-6">
        <h3 className="text-lg sm:text-xl font-semibold text-white">Détail des ventes par closer</h3>
        {closersStats.map((stat) => (
          <div key={stat.closer_id} className="apple-card rounded-xl sm:rounded-2xl overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-white/10 bg-white/5">
              <span className="font-semibold text-white">
                {stat.closer_name || stat.closer_email || 'Sans nom'}
              </span>
              <span className="text-white/50 text-sm ml-2">
                · {stat.totalSales} vente(s) · {stat.totalCA.toFixed(2)} € · {stat.totalCommissions.toFixed(2)} € comm.
              </span>
            </div>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-white/60 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-white/60 uppercase">Client</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-white/60 uppercase">Formation</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-white/60 uppercase">Montant</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-white/60 uppercase">Commission</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-white/60 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stat.sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-white/5">
                      <td className="px-4 py-2 text-white text-sm">
                        {format(new Date(sale.created_at), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-2 text-white text-sm">{sale.client_name}</td>
                      <td className="px-4 py-2 text-white/80 text-sm">
                        {formationLabels[sale.formation] || sale.formation}
                      </td>
                      <td className="px-4 py-2 text-right text-white font-medium text-sm">
                        {sale.amount.toFixed(2)} €
                      </td>
                      <td className="px-4 py-2 text-right text-green-400 font-medium text-sm">
                        {sale.commission_closer.toFixed(2)} €
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-white/80">
                          {entryTypeLabels[sale.entry_type] || sale.entry_type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Vue mobile - cartes */}
            <div className="lg:hidden p-4 space-y-3">
              {stat.sales.map((sale) => (
                <div
                  key={sale.id}
                  className="bg-white/5 rounded-lg p-3 border border-white/10"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-white text-sm">{sale.client_name}</span>
                    <span className="text-green-400 font-semibold text-sm">
                      {sale.amount.toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-white/60">
                    <span>{format(new Date(sale.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                    <span>·</span>
                    <span>{formationLabels[sale.formation] || sale.formation}</span>
                    <span>·</span>
                    <span className="text-green-400">Comm. {sale.commission_closer.toFixed(2)} €</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
