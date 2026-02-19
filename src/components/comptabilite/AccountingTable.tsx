'use client'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AccountingRow from './AccountingRow'
import AddAccountingEntryModal from './AddAccountingEntryModal'

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
  status?: 'actif' | 'annulé'
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
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)

  const handleUpdate = () => {
    setRefreshKey(prev => prev + 1)
    router.refresh()
  }

  const activeEntries = entries.filter((e) => (e.status || 'actif') !== 'annulé')

  // Labels pour les types d'entrées
  const entryTypeLabels: Record<string, string> = {
    acompte: 'Acompte',
    solde: 'Solde',
    complet: 'Complet',
  }

  // Labels pour les formations
  const formationLabels: Record<string, string> = {
    inge_son: 'Ingé son',
    beatmaking: 'Beatmaking',
    autre: 'Autre',
  }

  // Totaux sur les entrées actives uniquement (annulé exclu)
  const totalAmount = activeEntries.reduce((sum, entry) => sum + Number(entry.amount), 0)
  const totalCommissionCloser = activeEntries.reduce(
    (sum, entry) => sum + Number(entry.commission_closer),
    0
  )
  const totalCommissionFormateur = activeEntries.reduce(
    (sum, entry) => sum + Number(entry.commission_formateur),
    0
  )
  const totalNet = totalAmount - totalCommissionCloser - totalCommissionFormateur

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const entriesThisMonth = activeEntries.filter(entry => {
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
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-green-500/20 text-green-300 font-medium hover:bg-green-500/30 transition text-sm"
        >
          ➕ Ajouter une entrée
        </button>
      </div>
      {showAddModal && (
        <AddAccountingEntryModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleUpdate}
        />
      )}

      {/* Statistiques du mois en cours */}
      <div className="space-y-2 sm:space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold text-white">
          Statistiques du mois ({format(now, 'MMMM yyyy', { locale: fr })})
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          <div className="apple-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-blue-500/30">
            <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 font-medium">CA Brut</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-blue-300">{caBrutMois.toFixed(2)} €</div>
          </div>
          <div className="apple-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-purple-500/30">
            <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 font-medium">CA Net</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-purple-300">{caNetMois.toFixed(2)} €</div>
          </div>
          <div className="apple-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-orange-500/30">
            <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 font-medium">Commissions</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-orange-300">{commissionsMois.toFixed(2)} €</div>
          </div>
          <div className="apple-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-green-500/30">
            <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 font-medium">Bénéfice</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-green-300">{beneficeMois.toFixed(2)} €</div>
          </div>
        </div>
      </div>

      {/* Totaux globaux */}
      <div className="space-y-2 sm:space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold text-white">Totaux globaux</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          <div className="apple-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 font-medium">CA Total</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">{totalAmount.toFixed(2)} €</div>
          </div>
          <div className="apple-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 font-medium">Commissions Closers</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">{totalCommissionCloser.toFixed(2)} €</div>
          </div>
          <div className="apple-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 font-medium">Commissions Formateurs</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">{totalCommissionFormateur.toFixed(2)} €</div>
          </div>
          <div className="apple-card rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-white/60 mb-1 sm:mb-2 font-medium">Net</div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
              {totalNet.toFixed(2)} €
            </div>
          </div>
        </div>
      </div>

      {/* Table Desktop */}
      <div className="hidden lg:block apple-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Formation
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Reste à payer
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Date paiement
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Commission Closer
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Commission Formateur
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-wider">
                  État
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
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

      {/* Vue mobile - Cartes */}
      <div className="lg:hidden space-y-3">
        {entries.length === 0 ? (
          <div className="apple-card rounded-2xl p-8 text-center">
            <p className="text-white/40 font-light">Aucune entrée comptable</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="apple-card rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white">
                    {entry.leads?.first_name} {entry.leads?.last_name}
                  </h3>
                  <p className="text-sm text-white/60">{entry.leads?.phone}</p>
                  {entry.leads?.email && (
                    <p className="text-xs text-white/50 mt-1 truncate">{entry.leads.email}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0 ml-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    (entry as { status?: string }).status === 'annulé' ? 'bg-white/20 text-white/60' : 'bg-green-500/20 text-green-300'
                  }`}>
                    {(entry as { status?: string }).status === 'annulé' ? 'Annulé' : 'Actif'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    entry.entry_type === 'complet' ? 'bg-green-500/20 text-green-300' :
                    entry.entry_type === 'acompte' ? 'bg-orange-500/20 text-orange-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {entryTypeLabels[entry.entry_type]}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-white/50">Formation:</span>
                  <span className="text-white ml-1 block truncate">{formationLabels[entry.leads?.formation || 'autre']}</span>
                </div>
                <div>
                  <span className="text-white/50">Montant:</span>
                  <span className="text-white ml-1 font-semibold">{entry.amount.toFixed(2)} €</span>
                </div>
                {entry.remaining_amount && (
                  <div>
                    <span className="text-white/50">Reste:</span>
                    <span className="text-white ml-1">{entry.remaining_amount.toFixed(2)} €</span>
                  </div>
                )}
                <div>
                  <span className="text-white/50">Date:</span>
                  <span className="text-white ml-1">{format(new Date(entry.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                <div>
                  <span className="text-white/50">Com. Closer:</span>
                  <span className="text-white ml-1">{entry.commission_closer.toFixed(2)} €</span>
                </div>
                <div>
                  <span className="text-white/50">Com. Formateur:</span>
                  <span className="text-white ml-1">{entry.commission_formateur.toFixed(2)} €</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/accounting/generate-invoice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ entryId: entry.id }),
                      })
                      if (response.ok) {
                        const blob = await response.blob()
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `facture-${entry.leads?.first_name}-${entry.leads?.last_name}.pdf`
                        document.body.appendChild(a)
                        a.click()
                        window.URL.revokeObjectURL(url)
                        document.body.removeChild(a)
                      }
                    } catch (error) {
                      alert('Erreur lors de la génération')
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition"
                >
                  📄 Générer
                </button>
                {entry.leads?.documents_sent_at ? (
                  <div className="flex-1 px-3 py-2 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium text-center">
                    ✅ Envoyée
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      if (!entry.leads?.email) {
                        alert('Email manquant')
                        return
                      }
                      try {
                        const response = await fetch('/api/gestion/generate-documents', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ leadId: entry.lead_id, method: 'email' }),
                        })
                        if (response.ok) {
                          alert('Facture envoyée !')
                          handleUpdate()
                        }
                      } catch (error) {
                        alert('Erreur lors de l\'envoi')
                      }
                    }}
                    disabled={!entry.leads?.email}
                    className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition disabled:opacity-50"
                  >
                    📧 Envoyer
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!confirm('Supprimer cette entrée ?')) return
                    try {
                      const res = await fetch(`/api/accounting/entries/${entry.id}`, { method: 'DELETE' })
                      if (res.ok) handleUpdate()
                      else {
                        const d = await res.json().catch(() => ({}))
                        alert(d.error || 'Erreur')
                      }
                    } catch (e) {
                      alert('Erreur')
                    }
                  }}
                  className="px-3 py-2 bg-red-500/20 text-red-300 rounded-lg text-xs font-medium hover:bg-red-500/30 transition"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
