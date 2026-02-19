'use client'

import { useState, useEffect } from 'react'

interface LeadOption {
  id: string
  first_name: string
  last_name: string
}

interface AddAccountingEntryModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AddAccountingEntryModal({ onClose, onSuccess }: AddAccountingEntryModalProps) {
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [leadId, setLeadId] = useState('')
  const [entryType, setEntryType] = useState<'acompte' | 'solde' | 'complet'>('complet')
  const [amount, setAmount] = useState('')
  const [remainingAmount, setRemainingAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/accounting/leads-options')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.leads) {
          setLeads(data.leads)
          if (data.leads.length > 0 && !leadId) setLeadId(data.leads[0].id)
        }
      })
      .finally(() => { if (!cancelled) setLoadingLeads(false) })
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amt = parseFloat(amount.replace(',', '.'))
    if (!leadId) {
      setError('Choisissez un élève')
      return
    }
    if (isNaN(amt) || amt < 0) {
      setError('Montant invalide')
      return
    }
    const remaining = entryType === 'acompte' ? (parseFloat(remainingAmount.replace(',', '.')) || null) : null

    setLoading(true)
    try {
      const res = await fetch('/api/accounting/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          entry_type: entryType,
          amount: amt,
          remaining_amount: remaining,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création')
        setLoading(false)
        return
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white/10 border border-white/20 rounded-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">➕ Ajouter une entrée</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Élève</label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
              required
              disabled={loadingLeads}
            >
              {loadingLeads ? (
                <option>Chargement…</option>
              ) : leads.length === 0 ? (
                <option value="">Aucun lead clos / acompte réglé</option>
              ) : (
                leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.first_name} {l.last_name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Type</label>
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value as 'acompte' | 'solde' | 'complet')}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
            >
              <option value="acompte">Acompte</option>
              <option value="solde">Solde</option>
              <option value="complet">Complet</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Montant (€)</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
              required
            />
          </div>

          {entryType === 'acompte' && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">Reste à payer (€)</label>
              <input
                type="text"
                inputMode="decimal"
                value={remainingAmount}
                onChange={(e) => setRemainingAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || loadingLeads || leads.length === 0}
              className="px-4 py-2 rounded-lg bg-white text-black font-medium text-sm disabled:opacity-50"
            >
              {loading ? 'Création…' : 'Créer l\'entrée'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
