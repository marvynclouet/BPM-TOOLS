'use client'

import { useState } from 'react'
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
  price_fixed: number | null
  price_deposit: number | null
  formation_format: string | null
  formation_day: string | null
  formation_start_date: string | null
  documents_sent_at: string | null
  created_at: string
  planning: PlanningEntry[]
}

interface GestionRowProps {
  lead: ClosedLead
  showWhatsAppGroup?: boolean
  showDocuments?: boolean
}

export default function GestionRow({ lead, showWhatsAppGroup = false, showDocuments = true }: GestionRowProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)

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
    if (specificDates && specificDates.length > 0) {
      // Format mensuelle : afficher les 4 dates
      const dates = specificDates.slice(0, 4).map(d => {
        const date = new Date(d.includes('T') ? d.split('T')[0] : d)
        return format(date, 'dd MMM', { locale: fr })
      })
      return dates.join(', ')
    } else if (startDate && endDate) {
      // Format semaine : du lundi au vendredi
      return `Du ${format(startDate, 'dd MMM yyyy', { locale: fr })} au ${format(endDate, 'dd MMM yyyy', { locale: fr })}`
    }
    return 'Dates non définies'
  }

  const handleGeneratePDF = async () => {
    setLoading('generate-pdf')
    try {
      const response = await fetch('/api/gestion/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
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
      a.download = `documents-${lead.first_name}-${lead.last_name}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      alert('PDF généré avec succès !')
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

  const handleCreateWhatsAppGroup = () => {
    setShowWhatsAppModal(true)
  }

  const handleWhatsAppSuccess = (data: { whatsappUrl: string; method: string; groupId?: string }) => {
    // Le modal gère déjà l'affichage du succès
    // On peut ajouter ici une logique supplémentaire si nécessaire
  }

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
        {lead.price_deposit && lead.price_deposit > 0 && (
          <div className="text-xs text-white/40 font-light">
            Acompte: {lead.price_deposit.toFixed(2)} €
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {/* Bouton 1 : Générer documents et envoyer (uniquement pour leads closés) */}
          {showDocuments && (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleGeneratePDF()}
                disabled={loading === 'generate-pdf'}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Générer l'attestation et la facture en PDF"
              >
                {loading === 'generate-pdf' ? '...' : '📄 Générer attestation et facture'}
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

          {/* Bouton 2 : Créer groupe WhatsApp (uniquement pour leads chauds) */}
          {showWhatsAppGroup && (
            <button
              onClick={handleCreateWhatsAppGroup}
              disabled={loading === 'whatsapp-group'}
              className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium hover:bg-green-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'whatsapp-group' ? 'Création...' : '📱 Créer groupe WhatsApp'}
            </button>
          )}
        </div>
      </td>

      {/* Modal WhatsApp */}
      {showWhatsAppModal && (
        <WhatsAppGroupModal
          lead={{
            id: lead.id,
            first_name: lead.first_name,
            last_name: lead.last_name,
            phone: lead.phone,
          }}
          onClose={() => setShowWhatsAppModal(false)}
          onSuccess={handleWhatsAppSuccess}
        />
      )}
    </tr>
  )
}
