'use client'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import Link from 'next/link'

interface RecentLead {
  id: string
  first_name: string
  last_name: string
  phone: string
  formation: string
  status: string
  created_at: string
}

interface RecentLeadsProps {
  leads: RecentLead[]
}

export default function RecentLeads({ leads }: RecentLeadsProps) {
  const formationLabels: Record<string, string> = {
    inge_son: '🎚️ Ingé son',
    beatmaking: '🎵 Beatmaking',
    autre: '📚 Autre',
  }

  const statusColors: Record<string, string> = {
    nouveau: 'bg-blue-500/20 text-blue-300',
    appele: 'bg-purple-500/20 text-purple-300',
    acompte_regle: 'bg-orange-500/20 text-orange-300',
    clos: 'bg-green-500/20 text-green-300',
    ko: 'bg-red-500/20 text-red-300',
  }

  const statusLabels: Record<string, string> = {
    nouveau: 'Nouveau',
    appele: 'Appelé',
    acompte_regle: 'Acompte réglé',
    clos: 'Closé',
    ko: 'KO',
  }

  return (
    <div className="apple-card rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-white tracking-tight">Nouveaux leads</h3>
        <Link
          href="/dashboard/crm"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
        >
          Voir tout →
        </Link>
      </div>
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {leads.length === 0 ? (
          <p className="text-white/40 text-center py-4 text-xs font-light">Aucun nouveau lead</p>
        ) : (
          leads.slice(0, 6).map((lead, idx) => (
            <div
              key={lead.id}
              className="apple-card-hover rounded-lg p-2 animate-slide-in"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm truncate">
                      {lead.first_name} {lead.last_name}
                    </span>
                    <span className="text-[10px] text-white/40 font-light">
                      {formationLabels[lead.formation] || lead.formation}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      statusColors[lead.status] || 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {statusLabels[lead.status] || lead.status}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-white/40 flex-shrink-0 ml-2 font-light">
                  {format(new Date(lead.created_at), 'dd MMM', { locale: fr })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
