'use client'

import { useState } from 'react'
import JpoEventManager from '@/components/jpo/JpoEventManager'
import JpoPlanning from '@/components/jpo/JpoPlanning'

interface JpoEvent {
  id: string
  title: string
  event_date: string
  status: string
  max_per_slot: number
  notes: string | null
}

export default function JpoDashboardPage() {
  const [selectedEvent, setSelectedEvent] = useState<JpoEvent | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Journées Portes Ouvertes</h1>
        <p className="text-sm text-white/50 mt-1">Gestion des inscriptions et suivi des JPO</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Events */}
        <div className="lg:col-span-1">
          <JpoEventManager
            onSelectEvent={setSelectedEvent}
            selectedEventId={selectedEvent?.id || null}
          />

          {/* Lien public */}
          {selectedEvent?.status === 'active' && (
            <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="text-xs text-white/40 mb-2">Lien d'inscription public</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-indigo-300 bg-white/5 px-2 py-1 rounded flex-1 truncate">
                  /jpo
                </code>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/jpo`
                    navigator.clipboard.writeText(url)
                  }}
                  className="text-xs text-white/40 hover:text-white/60 shrink-0"
                >
                  Copier
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main - Planning */}
        <div className="lg:col-span-3">
          {selectedEvent ? (
            <JpoPlanning jpoId={selectedEvent.id} maxPerSlot={selectedEvent.max_per_slot} />
          ) : (
            <div className="text-center py-16 text-white/30">
              <p className="text-sm">Sélectionne ou crée un événement JPO</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
