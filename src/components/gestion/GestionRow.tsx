'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import WhatsAppGroupModal from './WhatsAppGroupModal'

interface PlanningEntry {
  id: string
  start_date: string
  end_date: string
  specific_dates: string[] | null
}

interface ClosedLead {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  formation: string
  status: string
  price_fixed: number | null
  price_deposit: number | null
  formation_format: string | null
  formation_day: string | null
  formation_start_date: string | null
  documents_sent_at: string | null
  whatsapp_conversation_started_at: string | null
  whatsapp_relance_1_at: string | null
  whatsapp_relance_2_at: string | null
  whatsapp_relance_3_at: string | null
  created_at: string
  planning: PlanningEntry[]
  closer: {
    full_name: string | null
    email: string
  } | null
  acompte_paid?: number
  remaining_amount?: number | null
  accounting_entry_id?: string | null
}

interface GestionRowProps {
  lead: ClosedLead
  showWhatsAppGroup?: boolean
  showDocuments?: boolean
  showAcompteEnCours?: boolean
}

export default function GestionRow({ lead, showWhatsAppGroup = false, showDocuments = true, showAcompteEnCours = false }: GestionRowProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [editingAcompteField, setEditingAcompteField] = useState<'acompte_paid' | 'remaining_amount' | null>(null)
  const [editAcompteValue, setEditAcompteValue] = useState('')

  const formationLabels: Record<string, string> = {
    inge_son: 'Ingé son',
    beatmaking: 'Beatmaking',
    autre: 'Autre',
  }

  const formatLabels: Record<string, string> = {
    semaine: 'Semaine',
    mensuelle: 'Mensuelle',
    bpm_fast: '⚡ BPM Fast',
  }

  const planningEntry = lead.planning?.[0]
  const startDate = planningEntry?.start_date ? new Date(planningEntry.start_date) : null
  const endDate = planningEntry?.end_date ? new Date(planningEntry.end_date) : null
  const specificDates = planningEntry?.specific_dates || null

  const formatDates = () => {
    // Priorité 1 : Utiliser le planning si disponible
    if (specificDates && specificDates.length > 0) {
      // Format mensuelle : afficher les 4 dates
      const dates = specificDates.slice(0, 4).map(d => {
        const date = new Date(d.includes('T') ? d.split('T')[0] : d)
        return format(date, 'dd MMM', { locale: fr })
      })
      return dates.join(', ')
    } else if (startDate && endDate) {
      // Format semaine ou BPM Fast : du début à la fin
      return `Du ${format(startDate, 'dd MMM yyyy', { locale: fr })} au ${format(endDate, 'dd MMM yyyy', { locale: fr })}`
    }
    
    // Priorité 2 : Utiliser formation_start_date du lead si disponible
    if (lead.formation_start_date && lead.formation_format) {
      const startDate = new Date(lead.formation_start_date)
      
      if (lead.formation_format === 'mensuelle') {
        // Pour mensuelle, afficher juste la date de début (ou calculer les 4 dates si on a le jour)
        if (lead.formation_day) {
          // Calculer les 4 samedis ou dimanches du mois
          const year = startDate.getFullYear()
          const month = startDate.getMonth()
          const targetDay = lead.formation_day === 'samedi' ? 6 : 0
          const dates: Date[] = []
          
          const daysInMonth = new Date(year, month + 1, 0).getDate()
          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day)
            if (date.getDay() === targetDay) {
              dates.push(date)
            }
          }
          
          if (dates.length >= 4) {
            const formattedDates = dates.slice(0, 4).map(d => format(d, 'dd MMM', { locale: fr }))
            return formattedDates.join(', ')
          }
        }
        // Sinon, juste la date de début
        return format(startDate, 'dd MMM yyyy', { locale: fr })
      } else if (lead.formation_format === 'semaine') {
        // Pour semaine, calculer la fin (5 jours : lundi à vendredi)
        // Trouver le lundi de la semaine
        const dayOfWeek = startDate.getDay() === 0 ? 7 : startDate.getDay()
        const daysToMonday = dayOfWeek === 1 ? 0 : 1 - dayOfWeek
        const monday = new Date(startDate)
        monday.setDate(startDate.getDate() + daysToMonday)
        
        // Vendredi = lundi + 4 jours
        const friday = new Date(monday)
        friday.setDate(monday.getDate() + 4)
        
        return `Du ${format(monday, 'dd MMM yyyy', { locale: fr })} au ${format(friday, 'dd MMM yyyy', { locale: fr })}`
      } else if (lead.formation_format === 'bpm_fast') {
        // Pour BPM Fast, 2 jours consécutifs
        const endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 1)
        return `Du ${format(startDate, 'dd MMM yyyy', { locale: fr })} au ${format(endDate, 'dd MMM yyyy', { locale: fr })}`
      }
    }
    
    return 'Dates non définies'
  }

  const handleGeneratePDF = async (type: 'attestation' | 'facture') => {
    const loadingKey = type === 'attestation' ? 'generate-attestation' : 'generate-facture'
    setLoading(loadingKey)
    try {
      const response = await fetch('/api/gestion/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, type }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la génération')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = type === 'attestation'
        ? `attestation-${lead.first_name}-${lead.last_name}.pdf`
        : `facture-${lead.first_name}-${lead.last_name}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      alert(type === 'attestation' ? 'Attestation générée avec succès !' : 'Facture générée avec succès !')
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    } finally {
      setLoading(null)
    }
  }

  const handleGenerateDocuments = async (method: 'email' | 'whatsapp') => {
    if (method === 'email' && !lead.email) {
      alert('Email du client non renseigné. Veuillez d\'abord ajouter l\'email dans le CRM.')
      return
    }

    setLoading(`documents-${method}`)
    try {
      const response = await fetch('/api/gestion/generate-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          method, // 'email' ou 'whatsapp'
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la génération')
      }

      const data = await response.json()
      alert(`✅ Attestation et facture générées et envoyées par ${method === 'email' ? 'email' : 'WhatsApp'} !`)
      
      // Recharger la page pour mettre à jour l'indicateur
      window.location.reload()
    } catch (error: any) {
      // Afficher un message d'erreur plus clair, en préservant les retours à la ligne
      const errorMessage = error.message || 'Erreur inconnue'
      // Remplacer \n par des sauts de ligne dans l'alert
      alert(errorMessage.replace(/\\n/g, '\n'))
    } finally {
      setLoading(null)
    }
  }

  const handleOpenWhatsApp = async () => {
    setLoading('whatsapp-open')
    try {
      const response = await fetch('/api/gestion/open-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de l\'ouverture')
      }

      const data = await response.json()
      
      // Sur mobile, utiliser window.location.href pour ouvrir directement WhatsApp
      // Sur desktop, utiliser window.open
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      
      if (isMobile) {
        // Sur mobile, rediriger directement vers WhatsApp
        window.location.href = data.whatsappUrl
      } else {
        // Sur desktop, ouvrir dans un nouvel onglet
        window.open(data.whatsappUrl, '_blank')
      }
      
      // Recharger la page pour mettre à jour le statut (seulement sur desktop)
      if (!isMobile) {
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
      setLoading(null)
    }
  }

  const handleRelance = async (relanceNumber: 1 | 2 | 3) => {
    setLoading(`relance-${relanceNumber}`)
    try {
      const response = await fetch('/api/gestion/whatsapp-relance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leadId: lead.id,
          relanceNumber 
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la relance')
      }

      const data = await response.json()
      
      // Ouvrir WhatsApp avec le message de relance
      window.open(data.whatsappUrl, '_blank')
      
      // Recharger la page pour mettre à jour le statut
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    } finally {
      setLoading(null)
    }
  }

  // Calculer les dates pour les relances
  const getRelanceStatus = () => {
    if (!lead.whatsapp_conversation_started_at) return null
    
    const startDate = new Date(lead.whatsapp_conversation_started_at)
    const now = new Date()
    const hoursSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    const daysSinceStart = hoursSinceStart / 24

    // Calculer le temps restant avant la prochaine relance
    let nextRelanceIn: string | null = null
    let nextRelanceType: string | null = null

    if (!lead.whatsapp_relance_1_at) {
      // Relance 1 dans 72h
      const hoursUntilRelance1 = 72 - hoursSinceStart
      if (hoursUntilRelance1 > 0) {
        const days = Math.floor(hoursUntilRelance1 / 24)
        const hours = Math.floor(hoursUntilRelance1 % 24)
        if (days > 0) {
          nextRelanceIn = `${days}j ${hours}h`
        } else {
          nextRelanceIn = `${hours}h`
        }
        nextRelanceType = 'Relance 1'
      }
    } else if (!lead.whatsapp_relance_2_at) {
      // Relance 2 dans 7 jours
      const daysUntilRelance2 = 7 - daysSinceStart
      if (daysUntilRelance2 > 0) {
        nextRelanceIn = `${Math.floor(daysUntilRelance2)}j`
        nextRelanceType = 'Relance 2'
      }
    } else if (!lead.whatsapp_relance_3_at) {
      // Dernière relance (disponible après relance 2)
      nextRelanceIn = 'Disponible'
      nextRelanceType = 'Dernière relance'
    }

    return {
      startDate,
      hoursSinceStart,
      daysSinceStart,
      canRelance1: hoursSinceStart >= 72 && !lead.whatsapp_relance_1_at,
      canRelance2: daysSinceStart >= 7 && !lead.whatsapp_relance_2_at, // Après 1 semaine
      canRelance3: daysSinceStart >= 7 && !lead.whatsapp_relance_3_at && lead.whatsapp_relance_2_at, // Dernière relance après 1 semaine ET après relance 2
      nextRelanceIn,
      nextRelanceType,
    }
  }

  const relanceStatus = getRelanceStatus()

  return (
    <tr className="hover:bg-white/5 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-semibold text-white">
          {lead.first_name} {lead.last_name}
        </div>
        <div className="text-xs text-white/40 font-light">{lead.phone}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-white/70">
          {lead.email ? (
            <a 
              href={`mailto:${lead.email}`}
              className="text-blue-300 hover:text-blue-200 underline transition"
              title={`Envoyer un email à ${lead.email}`}
            >
              {lead.email}
            </a>
          ) : (
            <span className="text-white/30 italic">Non renseigné</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-white/60 font-medium">
          {lead.formation ? formationLabels[lead.formation] : '-'}
        </div>
        {lead.formation_format && (
          <div className="text-xs text-white/40 font-light">
            {formatLabels[lead.formation_format] || lead.formation_format}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-white/60 font-medium">
          {formatDates()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-semibold text-white">
          {lead.price_fixed ? `${lead.price_fixed.toFixed(2)} €` : '-'}
        </div>
        {!showAcompteEnCours && lead.price_deposit && lead.price_deposit > 0 && (
          <div className="text-xs text-white/40 font-light">
            Acompte: {lead.price_deposit.toFixed(2)} €
          </div>
        )}
      </td>
      {showAcompteEnCours && (
        <>
          <td className="px-6 py-4 whitespace-nowrap">
            {editingAcompteField === 'acompte_paid' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAcompteValue}
                  onChange={(e) => setEditAcompteValue(e.target.value)}
                  className="w-24 px-2 py-1 rounded bg-white/10 text-white text-sm border border-white/20"
                />
                <span className="text-white/60 text-sm">€</span>
                <button
                  onClick={async () => {
                    if (!lead.accounting_entry_id) return
                    const num = parseFloat(editAcompteValue.replace(',', '.'))
                    if (isNaN(num) || num < 0) { alert('Montant invalide'); return }
                    setLoading('acompte_paid')
                    try {
                      const res = await fetch('/api/accounting/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ entryId: lead.accounting_entry_id, field: 'amount', value: num }),
                      })
                      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Erreur') }
                      setEditingAcompteField(null)
                      router.refresh()
                    } catch (err: any) { alert(err.message || 'Erreur') } finally { setLoading(null) }
                  }}
                  disabled={loading === 'acompte_paid'}
                  className="px-2 py-1 rounded bg-green-500/20 text-green-300 text-xs font-medium disabled:opacity-50"
                >
                  {loading === 'acompte_paid' ? '...' : 'OK'}
                </button>
                <button type="button" onClick={() => { setEditingAcompteField(null); setEditAcompteValue('') }} className="px-2 py-1 rounded bg-white/10 text-white text-xs">Annuler</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">
                  {lead.acompte_paid != null ? `${Number(lead.acompte_paid).toFixed(2)} €` : '-'}
                </span>
                {lead.accounting_entry_id && (
                  <button type="button" onClick={() => { setEditingAcompteField('acompte_paid'); setEditAcompteValue(String(lead.acompte_paid ?? '')) }} className="text-white/40 hover:text-white text-xs" title="Modifier">✏️</button>
                )}
              </div>
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            {editingAcompteField === 'remaining_amount' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAcompteValue}
                  onChange={(e) => setEditAcompteValue(e.target.value)}
                  className="w-24 px-2 py-1 rounded bg-white/10 text-white text-sm border border-white/20"
                />
                <span className="text-white/60 text-sm">€</span>
                <button
                  onClick={async () => {
                    if (!lead.accounting_entry_id) return
                    const num = parseFloat(editAcompteValue.replace(',', '.'))
                    if (isNaN(num) || num < 0) { alert('Montant invalide'); return }
                    setLoading('remaining_amount')
                    try {
                      const res = await fetch('/api/accounting/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ entryId: lead.accounting_entry_id, field: 'remaining_amount', value: num }),
                      })
                      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Erreur') }
                      setEditingAcompteField(null)
                      router.refresh()
                    } catch (err: any) { alert(err.message || 'Erreur') } finally { setLoading(null) }
                  }}
                  disabled={loading === 'remaining_amount'}
                  className="px-2 py-1 rounded bg-green-500/20 text-green-300 text-xs font-medium disabled:opacity-50"
                >
                  {loading === 'remaining_amount' ? '...' : 'OK'}
                </button>
                <button type="button" onClick={() => { setEditingAcompteField(null); setEditAcompteValue('') }} className="px-2 py-1 rounded bg-white/10 text-white text-xs">Annuler</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-300">
                  {lead.remaining_amount != null ? `${Number(lead.remaining_amount).toFixed(2)} €` : '-'}
                </span>
                {lead.accounting_entry_id && (
                  <button type="button" onClick={() => { setEditingAcompteField('remaining_amount'); setEditAcompteValue(String(lead.remaining_amount ?? '')) }} className="text-white/40 hover:text-white text-xs" title="Modifier">✏️</button>
                )}
              </div>
            )}
          </td>
        </>
      )}
      {(showDocuments || showAcompteEnCours) && (
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-white/70">
            {lead.closer ? (
              <div>
                <div className="font-semibold text-white">
                  {lead.closer.full_name || lead.closer.email}
                </div>
                {lead.closer.full_name && (
                  <div className="text-xs text-white/40 font-light">
                    {lead.closer.email}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-white/30 italic">Non assigné</span>
            )}
          </div>
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Acomptes en cours : lien compta + marquer solde réglé */}
          {showAcompteEnCours && (
            <div className="flex flex-col gap-1">
              <a
                href="/dashboard/comptabilite"
                className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-medium hover:bg-white/20 transition text-center"
              >
                📊 Voir en compta
              </a>
              <button
                onClick={async () => {
                  if (!confirm('Marquer le solde comme réglé pour cet élève ?')) return
                  setLoading('mark-solde')
                  try {
                    const res = await fetch('/api/leads/mark-payment', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ leadId: lead.id, paymentType: 'complet' }),
                    })
                    if (!res.ok) {
                      const d = await res.json().catch(() => ({}))
                      throw new Error(d.error || 'Erreur')
                    }
                    alert('Solde marqué comme réglé. L\'élève passe en Clos.')
                    window.location.reload()
                  } catch (err: any) {
                    alert(err.message || 'Erreur')
                  } finally {
                    setLoading(null)
                  }
                }}
                disabled={loading === 'mark-solde'}
                className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium hover:bg-green-500/30 transition disabled:opacity-50"
              >
                {loading === 'mark-solde' ? '...' : '✅ Marquer solde réglé'}
              </button>
            </div>
          )}
          {/* Générer documents et envoyer (uniquement pour leads clos) */}
          {showDocuments && !showAcompteEnCours && (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleGeneratePDF('attestation')}
                disabled={loading === 'generate-attestation'}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Télécharger l'attestation d'inscription en PDF"
              >
                {loading === 'generate-attestation' ? '...' : '📄 Générer attestation'}
              </button>
              <button
                onClick={() => handleGeneratePDF('facture')}
                disabled={loading === 'generate-facture'}
                className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Télécharger la facture en PDF"
              >
                {loading === 'generate-facture' ? '...' : '🧾 Générer facture'}
              </button>
              {lead.documents_sent_at ? (
                <div
                  className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium"
                  title={`Facture et attestation envoyées le ${format(new Date(lead.documents_sent_at), 'dd MMM yyyy à HH:mm', { locale: fr })}`}
                >
                  ✅ Facture et attestation envoyées
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleGenerateDocuments('email')}
                    disabled={loading === 'documents-email' || !lead.email}
                    className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title={lead.email ? 'Envoyer la facture et l\'attestation par email' : 'Email non renseigné - Ajoutez l\'email dans le CRM'}
                  >
                    {loading === 'documents-email' ? '...' : '📧 Envoyer facture et attestation'}
                  </button>
                  <button
                    onClick={() => handleGenerateDocuments('whatsapp')}
                    disabled={loading === 'documents-whatsapp'}
                    className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium hover:bg-green-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Envoyer la facture et l'attestation par WhatsApp"
                  >
                    {loading === 'documents-whatsapp' ? '...' : '💬 Envoyer par WhatsApp'}
                  </button>
                </>
              )}
            </div>
          )}
          {showDocuments && showAcompteEnCours && (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleGeneratePDF('attestation')}
                disabled={loading === 'generate-attestation'}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition disabled:opacity-50"
              >
                {loading === 'generate-attestation' ? '...' : '📄 Générer attestation'}
              </button>
              <button
                onClick={() => handleGeneratePDF('facture')}
                disabled={loading === 'generate-facture'}
                className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-500/30 transition disabled:opacity-50"
              >
                {loading === 'generate-facture' ? '...' : '🧾 Générer facture'}
              </button>
              {!lead.documents_sent_at && lead.email && (
                <>
                  <button
                    onClick={() => handleGenerateDocuments('email')}
                    disabled={loading === 'documents-email'}
                    className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition disabled:opacity-50"
                  >
                    {loading === 'documents-email' ? '...' : '📧 Envoyer par email'}
                  </button>
                  <button
                    onClick={() => handleGenerateDocuments('whatsapp')}
                    disabled={loading === 'documents-whatsapp'}
                    className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium hover:bg-green-500/30 transition disabled:opacity-50"
                  >
                    {loading === 'documents-whatsapp' ? '...' : '💬 Envoyer par WhatsApp'}
                  </button>
                </>
              )}
              {lead.documents_sent_at && (
                <div className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium">
                  ✅ Documents envoyés
                </div>
              )}
            </div>
          )}

          {/* Ouvrir conversation WhatsApp (uniquement pour leads chauds) */}
          {showWhatsAppGroup && (
            <div className="flex flex-col gap-2">
              {lead.whatsapp_conversation_started_at ? (
                <div className="space-y-2">
                  <div className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium">
                    💬 Conversation WhatsApp en cours depuis le {format(new Date(lead.whatsapp_conversation_started_at), 'dd MMM yyyy', { locale: fr })}
                  </div>
                  <button
                    onClick={handleOpenWhatsApp}
                    disabled={loading === 'whatsapp-open'}
                    className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium hover:bg-green-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading === 'whatsapp-open' ? 'Ouverture...' : '💬 Ouvrir conversation'}
                  </button>
                  
                  {/* Timer pour la prochaine relance (si pas closé) */}
                  {lead.status !== 'clos' && relanceStatus && relanceStatus.nextRelanceIn && (
                    <div className="px-3 py-1.5 bg-yellow-500/20 text-yellow-300 rounded-lg text-xs font-medium border border-yellow-500/30">
                      ⏱ {relanceStatus.nextRelanceType} dans {relanceStatus.nextRelanceIn}
                    </div>
                  )}
                  
                  {/* Boutons de relance */}
                  {relanceStatus && (
                    <div className="flex flex-col gap-1">
                      {relanceStatus.canRelance1 && (
                        <button
                          onClick={() => handleRelance(1)}
                          disabled={loading === 'relance-1'}
                          className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition disabled:opacity-50"
                        >
                          {loading === 'relance-1' ? '...' : '📞 Relance 1 (72h)'}
                        </button>
                      )}
                      {relanceStatus.canRelance2 && (
                        <button
                          onClick={() => handleRelance(2)}
                          disabled={loading === 'relance-2'}
                          className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition disabled:opacity-50"
                        >
                          {loading === 'relance-2' ? '...' : '📞 Relance 2 (1 semaine)'}
                        </button>
                      )}
                      {relanceStatus.canRelance3 && (
                        <button
                          onClick={() => handleRelance(3)}
                          disabled={loading === 'relance-3'}
                          className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-xs font-medium hover:bg-red-500/30 transition disabled:opacity-50"
                        >
                          {loading === 'relance-3' ? '...' : '📞 Dernière relance'}
                        </button>
                      )}
                      {lead.whatsapp_relance_1_at && (
                        <div className="text-xs text-white/40">
                          Relance 1: {format(new Date(lead.whatsapp_relance_1_at), 'dd MMM yyyy', { locale: fr })}
                        </div>
                      )}
                      {lead.whatsapp_relance_2_at && (
                        <div className="text-xs text-white/40">
                          Relance 2: {format(new Date(lead.whatsapp_relance_2_at), 'dd MMM yyyy', { locale: fr })}
                        </div>
                      )}
                      {lead.whatsapp_relance_3_at && (
                        <div className="text-xs text-white/40">
                          Dernière relance: {format(new Date(lead.whatsapp_relance_3_at), 'dd MMM yyyy', { locale: fr })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleOpenWhatsApp}
                  disabled={loading === 'whatsapp-open'}
                  className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium hover:bg-green-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === 'whatsapp-open' ? 'Ouverture...' : '💬 Ouvrir conversation WhatsApp'}
                </button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}
