'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

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

interface AccountingRowProps {
  entry: AccountingEntry
  onUpdate: () => void
}

export default function AccountingRow({ entry, onUpdate }: AccountingRowProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({
    amount: entry.amount,
    commission_closer: entry.commission_closer,
    commission_formateur: entry.commission_formateur,
    remaining_amount: entry.remaining_amount,
  })
  const [loading, setLoading] = useState(false)
  const [loadingInvoice, setLoadingInvoice] = useState(false)

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

  const handleFieldClick = (field: string) => {
    setEditingField(field)
  }

  const handleFieldChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setEditValues(prev => ({
      ...prev,
      [field]: numValue,
    }))
  }

  const handleFieldSave = async (field: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/accounting/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: entry.id,
          field,
          value: editValues[field as keyof typeof editValues],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la mise à jour')
      }

      setEditingField(null)
      onUpdate()
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldCancel = () => {
    setEditValues({
      amount: entry.amount,
      commission_closer: entry.commission_closer,
      commission_formateur: entry.commission_formateur,
      remaining_amount: entry.remaining_amount,
    })
    setEditingField(null)
  }

  const handleGenerateInvoice = async () => {
    if (!entry.lead_id) {
      alert('Lead ID manquant')
      return
    }

    setLoadingInvoice(true)
    try {
      const response = await fetch('/api/gestion/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: entry.lead_id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la génération')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `facture-${lead?.first_name}-${lead?.last_name}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      alert('Facture générée avec succès !')
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    } finally {
      setLoadingInvoice(false)
    }
  }

  const handleSendInvoice = async () => {
    if (!entry.lead_id) {
      alert('Lead ID manquant')
      return
    }

    // Vérifier que le lead a un email (on va le vérifier côté serveur aussi)
    setLoadingInvoice(true)
    try {
      const response = await fetch('/api/gestion/generate-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: entry.lead_id,
          method: 'email',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de l\'envoi')
      }

      alert('Facture et attestation envoyées par email avec succès !')
      onUpdate()
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    } finally {
      setLoadingInvoice(false)
    }
  }

  const lead = entry.leads
  const payment = entry.payments

  return (
    <tr className="hover:bg-white/5 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-semibold text-white">
          {lead?.first_name} {lead?.last_name}
        </div>
        <div className="text-xs text-white/40 font-light">{lead?.phone}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-white/60 font-medium">
          {lead?.formation ? formationLabels[lead.formation] : '-'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${
          entry.entry_type === 'acompte' 
            ? 'bg-orange-500/20 text-orange-300'
            : entry.entry_type === 'solde'
            ? 'bg-blue-500/20 text-blue-300'
            : 'bg-green-500/20 text-green-300'
        }`}>
          {entryTypeLabels[entry.entry_type]}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {editingField === 'amount' ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={editValues.amount}
              onChange={(e) => handleFieldChange('amount', e.target.value)}
              className="w-24 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
              autoFocus
              onBlur={() => handleFieldSave('amount')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFieldSave('amount')
                if (e.key === 'Escape') handleFieldCancel()
              }}
            />
            <span className="text-sm text-white/60">€</span>
          </div>
        ) : (
          <div
            className="text-sm font-semibold text-white cursor-pointer hover:bg-white/5 rounded px-2 py-1 -mx-2 -my-1"
            onClick={() => handleFieldClick('amount')}
            title="Cliquez pour modifier"
          >
            {Number(entry.amount).toFixed(2)} €
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {editingField === 'remaining_amount' ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={editValues.remaining_amount || ''}
              onChange={(e) => handleFieldChange('remaining_amount', e.target.value)}
              className="w-24 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
              autoFocus
              onBlur={() => handleFieldSave('remaining_amount')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFieldSave('remaining_amount')
                if (e.key === 'Escape') handleFieldCancel()
              }}
            />
            <span className="text-sm text-white/60">€</span>
          </div>
        ) : (
          <div
            className="text-sm text-white/60 font-medium cursor-pointer hover:bg-white/5 rounded px-2 py-1 -mx-2 -my-1"
            onClick={() => handleFieldClick('remaining_amount')}
            title="Cliquez pour modifier"
          >
            {entry.remaining_amount !== null && entry.remaining_amount > 0
              ? `${entry.remaining_amount.toFixed(2)} €`
              : '-'}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-white/60 font-medium">
          {payment?.paid_at
            ? format(new Date(payment.paid_at), 'dd MMM yyyy', { locale: fr })
            : payment?.created_at
            ? format(new Date(payment.created_at), 'dd MMM yyyy', { locale: fr })
            : entry.created_at
            ? format(new Date(entry.created_at), 'dd MMM yyyy', { locale: fr })
            : '-'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {editingField === 'commission_closer' ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={editValues.commission_closer}
              onChange={(e) => handleFieldChange('commission_closer', e.target.value)}
              className="w-24 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
              autoFocus
              onBlur={() => handleFieldSave('commission_closer')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFieldSave('commission_closer')
                if (e.key === 'Escape') handleFieldCancel()
              }}
            />
            <span className="text-sm text-white/60">€</span>
          </div>
        ) : (
          <div
            className="text-sm text-white/60 font-medium cursor-pointer hover:bg-white/5 rounded px-2 py-1 -mx-2 -my-1"
            onClick={() => handleFieldClick('commission_closer')}
            title="Cliquez pour modifier"
          >
            {Number(entry.commission_closer).toFixed(2)} €
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {editingField === 'commission_formateur' ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={editValues.commission_formateur}
              onChange={(e) => handleFieldChange('commission_formateur', e.target.value)}
              className="w-24 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
              autoFocus
              onBlur={() => handleFieldSave('commission_formateur')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFieldSave('commission_formateur')
                if (e.key === 'Escape') handleFieldCancel()
              }}
            />
            <span className="text-sm text-white/60">€</span>
          </div>
        ) : (
          <div
            className="text-sm text-white/60 font-medium cursor-pointer hover:bg-white/5 rounded px-2 py-1 -mx-2 -my-1"
            onClick={() => handleFieldClick('commission_formateur')}
            title="Cliquez pour modifier"
          >
            {Number(entry.commission_formateur).toFixed(2)} €
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateInvoice}
            disabled={loadingInvoice}
            className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Générer la facture en PDF"
          >
            {loadingInvoice ? '...' : '📄 Générer facture'}
          </button>
          {lead && (
            lead.documents_sent_at ? (
              <div
                className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium"
                title={`Facture envoyée le ${format(new Date(lead.documents_sent_at), 'dd MMM yyyy à HH:mm', { locale: fr })}`}
              >
                ✅ Facture envoyée
              </div>
            ) : (
              <button
                onClick={handleSendInvoice}
                disabled={loadingInvoice || !lead.email}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title={!lead.email ? "Email manquant pour envoyer la facture" : "Envoyer la facture par email"}
              >
                {loadingInvoice ? '...' : '📧 Envoyer facture'}
              </button>
            )
          )}
        </div>
      </td>
    </tr>
  )
}
