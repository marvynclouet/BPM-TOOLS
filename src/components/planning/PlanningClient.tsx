'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PlanningView from './PlanningView'
import JpoEventManager from '@/components/jpo/JpoEventManager'
import JpoPlanning from '@/components/jpo/JpoPlanning'

interface LeadOption {
  id: string
  first_name: string
  last_name: string
}

interface PlanningEntry {
  id: string
  lead_id?: string
  lead_ids?: string[]
  start_date: string
  end_date: string
  specific_dates: string[] | null
  gcal_event_id?: string | null
  leads: Array<{
    first_name: string
    last_name: string
    phone?: string
    formation: string
    formation_format: string | null
    formation_day: string | null
  }>
}

interface JpoEvent {
  id: string
  title: string
  event_date: string
  status: string
  max_per_slot: number
  notes: string | null
}

interface PlanningClientProps {
  entries: PlanningEntry[]
  leads: LeadOption[]
  isAdmin?: boolean
}

export default function PlanningClient({ entries, leads, isAdmin = false }: PlanningClientProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'planning' | 'jpo'>('planning')
  const [selectedJpo, setSelectedJpo] = useState<JpoEvent | null>(null)

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 max-w-xs">
        <button
          onClick={() => setTab('planning')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'planning' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Planning
        </button>
        <button
          onClick={() => setTab('jpo')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'jpo' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          JPO
        </button>
      </div>

      {tab === 'planning' ? (
        <PlanningView
          entries={entries}
          leads={leads}
          onRefresh={() => router.refresh()}
          isAdmin={isAdmin}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <JpoEventManager
              onSelectEvent={setSelectedJpo}
              selectedEventId={selectedJpo?.id || null}
            />
            {selectedJpo?.status === 'active' && (
              <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3">
                <p className="text-xs text-white/40 mb-2">Lien d'inscription public</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-indigo-300 bg-white/5 px-2 py-1 rounded flex-1 truncate">/jpo</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/jpo`)}
                    className="text-xs text-white/40 hover:text-white/60 shrink-0"
                  >
                    Copier
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-3">
            {selectedJpo ? (
              <JpoPlanning jpoId={selectedJpo.id} maxPerSlot={selectedJpo.max_per_slot} />
            ) : (
              <div className="text-center py-16 text-white/30">
                <p className="text-sm">Sélectionne ou crée un événement JPO</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
