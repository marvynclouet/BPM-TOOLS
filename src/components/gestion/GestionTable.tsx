'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import GestionRow from './GestionRow'

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

interface GestionTableProps {
  leads: ClosedLead[]
  showWhatsAppGroup?: boolean
  showDocuments?: boolean
  showAcompteEnCours?: boolean
}

export default function GestionTable({ leads, showWhatsAppGroup = false, showDocuments = true, showAcompteEnCours = false }: GestionTableProps) {
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

  const totalAcompte = showAcompteEnCours
    ? leads.reduce((s, l) => s + (Number((l as ClosedLead).acompte_paid) || 0), 0)
    : 0
  const totalRestant = showAcompteEnCours
    ? leads.reduce((s, l) => s + (Number((l as ClosedLead).remaining_amount) || 0), 0)
    : 0

  if (leads.length === 0) {
    return (
      <div className="apple-card rounded-2xl p-12">
        <div className="text-center">
          <p className="text-white/50 text-lg font-light">
            {showWhatsAppGroup 
              ? 'Aucun lead chaud attribué à vous pour le moment' 
              : showAcompteEnCours 
                ? 'Aucun acompte en cours pour le moment' 
                : 'Aucun lead clos (payé en entier) pour le moment'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Totaux Acomptes en cours */}
      {showAcompteEnCours && leads.length > 0 && (
        <div className="apple-card rounded-2xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <span className="text-white/60 text-sm font-medium">Total des acomptes perçus</span>
            <span className="text-lg font-semibold text-white">{totalAcompte.toFixed(2)} €</span>
          </div>
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <span className="text-white/60 text-sm font-medium">Total restant à régler</span>
            <span className="text-lg font-semibold text-amber-300">{totalRestant.toFixed(2)} €</span>
          </div>
        </div>
      )}
      {/* Vue desktop - Table */}
      <div className="hidden lg:block apple-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                Élève
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                Formation
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                Prix
              </th>
              {showAcompteEnCours && (
                <>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Acompte payé
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Restant à payer
                  </th>
                </>
              )}
              {(showDocuments || showAcompteEnCours) && (
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Closer
                </th>
              )}
              <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {leads.map((lead) => (
              <GestionRow 
                key={lead.id} 
                lead={lead} 
                showWhatsAppGroup={showWhatsAppGroup}
                showDocuments={showDocuments}
                showAcompteEnCours={showAcompteEnCours}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Vue mobile - Cartes */}
    <div className="lg:hidden space-y-3">
      {leads.length === 0 ? (
        <div className="apple-card rounded-2xl p-8 text-center">
          <p className="text-white/50 text-lg font-light">
            {showWhatsAppGroup 
              ? 'Aucun lead chaud attribué à vous pour le moment' 
              : 'Aucun lead closé pour le moment'}
          </p>
        </div>
      ) : (
        leads.map((lead) => (
          <div key={lead.id} className="apple-card rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white truncate">
                  {lead.first_name} {lead.last_name}
                </h3>
                <p className="text-sm text-white/60">{lead.phone}</p>
                {lead.email && (
                  <p className="text-xs text-white/50 mt-1 truncate">{lead.email}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-white/50">Formation:</span>
                <span className="text-white ml-1 block truncate">{formationLabels[lead.formation] || lead.formation}</span>
                {lead.formation_format && (
                  <span className="text-white/40 text-xs block">{formatLabels[lead.formation_format]}</span>
                )}
              </div>
              {lead.price_fixed && (
                <div>
                  <span className="text-white/50">Prix:</span>
                  <span className="text-white ml-1 font-semibold">{lead.price_fixed.toFixed(2)} €</span>
                </div>
              )}
              {showAcompteEnCours && (lead as ClosedLead).acompte_paid != null && (
                <div>
                  <span className="text-white/50">Acompte payé:</span>
                  <span className="text-white ml-1">{(lead as ClosedLead).acompte_paid!.toFixed(2)} €</span>
                </div>
              )}
              {showAcompteEnCours && (lead as ClosedLead).remaining_amount != null && (
                <div>
                  <span className="text-white/50">Restant:</span>
                  <span className="text-amber-300 ml-1 font-semibold">{(lead as ClosedLead).remaining_amount!.toFixed(2)} €</span>
                </div>
              )}
              {(showDocuments || showAcompteEnCours) && lead.closer && (
                <div className="col-span-2">
                  <span className="text-white/50">Closer:</span>
                  <span className="text-white ml-1">{lead.closer.full_name || lead.closer.email}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/10 space-y-2">
              {showAcompteEnCours && (
                <div className="flex flex-col gap-2">
                  <a
                    href="/dashboard/comptabilite"
                    className="w-full px-3 py-2 bg-white/10 text-white rounded-lg text-xs font-medium hover:bg-white/20 transition text-center"
                  >
                    📊 Voir en compta
                  </a>
                  <button
                    onClick={async () => {
                      if (!confirm('Marquer le solde comme réglé ?')) return
                      try {
                        const res = await fetch('/api/leads/mark-payment', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ leadId: lead.id, paymentType: 'complet' }),
                        })
                        if (res.ok) {
                          alert('Solde marqué comme réglé.')
                          window.location.reload()
                        } else {
                          const d = await res.json().catch(() => ({}))
                          alert(d.error || 'Erreur')
                        }
                      } catch (e) {
                        alert('Erreur')
                      }
                    }}
                    className="w-full px-3 py-2 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium hover:bg-green-500/30 transition"
                  >
                    ✅ Marquer solde réglé
                  </button>
                </div>
              )}
              {/* Actions mobiles : documents (clos) ou PDF (acomptes en cours) */}
              {showDocuments && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/gestion/generate-pdf', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ leadId: lead.id, type: 'attestation' }),
                        })
                        if (response.ok) {
                          const blob = await response.blob()
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `attestation-${lead.first_name}-${lead.last_name}.pdf`
                          document.body.appendChild(a)
                          a.click()
                          window.URL.revokeObjectURL(url)
                          document.body.removeChild(a)
                          alert('Attestation générée !')
                        }
                      } catch (error) {
                        alert('Erreur')
                      }
                    }}
                    className="w-full px-3 py-2 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition"
                  >
                    📄 Générer attestation
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/gestion/generate-pdf', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ leadId: lead.id, type: 'facture' }),
                        })
                        if (response.ok) {
                          const blob = await response.blob()
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `facture-${lead.first_name}-${lead.last_name}.pdf`
                          document.body.appendChild(a)
                          a.click()
                          window.URL.revokeObjectURL(url)
                          document.body.removeChild(a)
                          alert('Facture générée !')
                        }
                      } catch (error) {
                        alert('Erreur')
                      }
                    }}
                    className="w-full px-3 py-2 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-500/30 transition"
                  >
                    🧾 Générer facture
                  </button>
                  {lead.documents_sent_at ? (
                    <div className="w-full px-3 py-2 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium text-center">
                      ✅ Documents envoyés
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!lead.email) {
                            alert('Email manquant')
                            return
                          }
                          try {
                            const response = await fetch('/api/gestion/generate-documents', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ leadId: lead.id, method: 'email' }),
                            })
                            if (response.ok) {
                              alert('Documents envoyés !')
                              window.location.reload()
                            }
                          } catch (error) {
                            alert('Erreur')
                          }
                        }}
                        disabled={!lead.email}
                        className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition disabled:opacity-50"
                      >
                        📧 Email
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/gestion/generate-documents', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ leadId: lead.id, method: 'whatsapp' }),
                            })
                            if (response.ok) {
                              alert('Documents envoyés !')
                              window.location.reload()
                            }
                          } catch (error) {
                            alert('Erreur')
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium hover:bg-green-500/30 transition"
                      >
                        💬 WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              )}
              {showWhatsAppGroup && (
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/gestion/open-whatsapp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leadId: lead.id }),
                      })
                      if (response.ok) {
                        const data = await response.json()
                        // Sur mobile, utiliser window.location.href pour ouvrir directement WhatsApp
                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                        if (isMobile) {
                          window.location.href = data.whatsappUrl
                        } else {
                          window.open(data.whatsappUrl, '_blank')
                          setTimeout(() => window.location.reload(), 1000)
                        }
                      }
                    } catch (error) {
                      alert('Erreur')
                    }
                  }}
                  className="w-full px-3 py-2 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium hover:bg-green-500/30 transition"
                >
                  💬 Ouvrir WhatsApp
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
    </>
  )
}
