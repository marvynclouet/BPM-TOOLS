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
  price_fixed: number | null
  price_deposit: number | null
  formation_format: string | null
  formation_day: string | null
  formation_start_date: string | null
  created_at: string
  planning: PlanningEntry[]
  closer: {
    full_name: string | null
    email: string
  } | null
}

interface GestionTableProps {
  leads: ClosedLead[]
  showWhatsAppGroup?: boolean
  showDocuments?: boolean
}

export default function GestionTable({ leads, showWhatsAppGroup = false, showDocuments = true }: GestionTableProps) {
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

  if (leads.length === 0) {
    return (
      <div className="apple-card rounded-2xl p-12">
        <div className="text-center">
          <p className="text-white/50 text-lg font-light">
            {showWhatsAppGroup 
              ? 'Aucun lead chaud attribué à vous pour le moment' 
              : 'Aucun lead closé pour le moment'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="apple-card rounded-2xl overflow-hidden">
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
              {showDocuments && (
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
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
