'use client'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import { useState } from 'react'
import AccountingRow from './AccountingRow'

interface AccountingEntry {
  id: string
  lead_id: string
  payment_id: string | null
  entry_type: 'acompte' | 'solde' | 'complet'
  amount: number
  commission_closer: number
  commission_formateur: number
  remaining_amount: number | null
  created_at: string
  leads: {
    first_name: string
    last_name: string
    phone: string
    formation: string
    price_fixed: number | null
    price_deposit: number | null
    documents_sent_at: string | null
    email: string | null
  } | null
  payments: {
    paid_at: string | null
    created_at: string
  } | null
}

interface AccountingTableProps {
  entries: AccountingEntry[]
}

export default function AccountingTable({ entries }: AccountingTableProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUpdate = () => {
    setRefreshKey(prev => prev + 1)
    // Recharger la page pour mettre à jour les totaux
    window.location.reload()
  }

  // Calculer les totaux globaux
  const totalAmount = entries.reduce((sum, entry) => sum + Number(entry.amount), 0)
  const totalCommissionCloser = entries.reduce(
    (sum, entry) => sum + Number(entry.commission_closer),
    0
  )
  const totalCommissionFormateur = entries.reduce(
    (sum, entry) => sum + Number(entry.commission_formateur),
    0
  )
  const totalNet = totalAmount - totalCommissionCloser - totalCommissionFormateur

  // Calculer les statistiques du mois en cours
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const entriesThisMonth = entries.filter(entry => {
    const entryDate = new Date(entry.created_at)
    return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear
  })

  const caBrutMois = entriesThisMonth.reduce((sum, entry) => sum + Number(entry.amount), 0)
  const commissionsMois = entriesThisMonth.reduce(
    (sum, entry) => sum + Number(entry.commission_closer) + Number(entry.commission_formateur),
    0
  )
  const caNetMois = caBrutMois - commissionsMois
  const beneficeMois = caNetMois // Pour l'instant, bénéfice = CA net (on peut ajouter des coûts plus tard)

  return (
    <div className="space-y-8">
      {/* Statistiques du mois en cours */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-white">
          Statistiques du mois ({format(now, 'MMMM yyyy', { locale: fr })})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="apple-card rounded-2xl p-6 border-2 border-blue-500/30">
            <div className="text-sm text-white/60 mb-2 font-medium">CA Brut</div>
            <div className="text-3xl font-semibold tracking-tight text-blue-300">{caBrutMois.toFixed(2)} €</div>
          </div>
          <div className="apple-card rounded-2xl p-6 border-2 border-purple-500/30">
            <div className="text-sm text-white/60 mb-2 font-medium">CA Net</div>
            <div className="text-3xl font-semibold tracking-tight text-purple-300">{caNetMois.toFixed(2)} €</div>
          </div>
          <div className="apple-card rounded-2xl p-6 border-2 border-orange-500/30">
            <div className="text-sm text-white/60 mb-2 font-medium">Commissions</div>
            <div className="text-3xl font-semibold tracking-tight text-orange-300">{commissionsMois.toFixed(2)} €</div>
          </div>
          <div className="apple-card rounded-2xl p-6 border-2 border-green-500/30">
            <div className="text-sm text-white/60 mb-2 font-medium">Bénéfice</div>
            <div className="text-3xl font-semibold tracking-tight text-green-300">{beneficeMois.toFixed(2)} €</div>
          </div>
        </div>
      </div>

      {/* Totaux globaux */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Totaux globaux</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="apple-card rounded-2xl p-6">
            <div className="text-sm text-white/60 mb-2 font-medium">CA Total</div>
            <div className="text-3xl font-semibold tracking-tight">{totalAmount.toFixed(2)} €</div>
          </div>
          <div className="apple-card rounded-2xl p-6">
            <div className="text-sm text-white/60 mb-2 font-medium">Commissions Closers</div>
            <div className="text-3xl font-semibold tracking-tight">{totalCommissionCloser.toFixed(2)} €</div>
          </div>
          <div className="apple-card rounded-2xl p-6">
            <div className="text-sm text-white/60 mb-2 font-medium">Commissions Formateurs</div>
            <div className="text-3xl font-semibold tracking-tight">{totalCommissionFormateur.toFixed(2)} €</div>
          </div>
          <div className="apple-card rounded-2xl p-6">
            <div className="text-sm text-white/60 mb-2 font-medium">Net</div>
            <div className="text-3xl font-semibold tracking-tight">
              {totalNet.toFixed(2)} €
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="apple-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Formation
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Reste à payer
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Date paiement
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Commission Closer
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Commission Formateur
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-white/50 font-light">Aucune entrée comptable enregistrée</p>
                      <p className="text-white/30 text-xs font-light">
                        Les entrées apparaîtront ici lorsque vous marquerez des acomptes ou paiements complets dans le CRM
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <AccountingRow key={entry.id} entry={entry} onUpdate={handleUpdate} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
