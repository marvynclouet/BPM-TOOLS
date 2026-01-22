'use client'

import { useState } from 'react'
import { Lead, UserRole } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import LeadDetailModal from './LeadDetailModal'

interface Closer {
  id: string
  full_name: string | null
  email: string
}

interface TrelloViewProps {
  leads: (Lead & { users?: { full_name: string | null; email: string } | null })[]
  closers: Closer[]
  currentUser: {
    id: string
    role: UserRole
    full_name?: string | null
    email?: string
  } | null
}

export default function TrelloView({ leads, closers, currentUser }: TrelloViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [draggedLead, setDraggedLead] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const formationLabels: Record<string, string> = {
    inge_son: 'Ingé son',
    beatmaking: 'Beatmaking',
    autre: 'Autre',
  }

  const interestLevelEmojis: Record<string, string> = {
    chaud: '🔥',
    moyen: '🟡',
    froid: '🔵',
  }

  // Couleurs de carte selon le statut
  const getCardColor = (status: Lead['status']) => {
    switch (status) {
      case 'nouveau':
        return 'bg-blue-500/20 border-blue-400/30'
      case 'chinois':
        return 'bg-yellow-500/20 border-yellow-400/30'
      case 'rats':
        return 'bg-gray-500/20 border-gray-400/30'
      case 'nrp':
        return 'bg-orange-500/20 border-orange-400/30'
      case 'en_cours_de_closing':
        return 'bg-green-500/20 border-green-400/30'
      case 'acompte_en_cours':
        return 'bg-amber-500/20 border-amber-400/30'
      case 'appele':
        return 'bg-purple-500/20 border-purple-400/30'
      case 'acompte_regle':
        return 'bg-orange-500/20 border-orange-400/30'
      case 'clos':
        return 'bg-green-500/20 border-green-400/30'
      case 'ko':
        return 'bg-red-500/20 border-red-400/30'
      default:
        return 'bg-white/5 border-white/10'
    }
  }

  // Emoji selon le statut
  const getStatusEmoji = (status: Lead['status']) => {
    switch (status) {
      case 'nouveau':
        return '👶'
      case 'chinois':
        return '🇨🇳'
      case 'rats':
        return '🐀'
      case 'nrp':
        return '📞'
      case 'en_cours_de_closing':
        return '👍'
      case 'acompte_en_cours':
        return '💰'
      case 'appele':
        return '📞'
      case 'acompte_regle':
        return '💰'
      case 'clos':
        return '✅'
      case 'ko':
        return '❌'
      default:
        return '🆕'
    }
  }

  // Obtenir les leads pour une colonne (closer ou nouveau/ko)
  const getLeadsForColumn = (closerId: string | 'nouveau' | 'ko') => {
    if (closerId === 'nouveau') {
      return leads.filter(lead => !lead.closer_id && lead.status !== 'ko')
    } else if (closerId === 'ko') {
      return leads.filter(lead => lead.status === 'ko')
    } else {
      return leads.filter(lead => lead.closer_id === closerId && lead.status !== 'ko')
    }
  }

  const handleDragStart = (leadId: string) => {
    setDraggedLead(leadId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetCloserId: string | 'nouveau' | 'ko') => {
    if (!draggedLead || !currentUser?.id) return

    const currentLead = leads.find(l => l.id === draggedLead)
    if (!currentLead) return

    try {
      let updateData: any = {
        last_action_at: new Date().toISOString(),
      }

      if (targetCloserId === 'nouveau') {
        // Mettre dans nouveau = enlever le closer
        updateData.closer_id = null
        if (currentLead.status === 'ko') {
          updateData.status = 'nouveau'
        }
      } else if (targetCloserId === 'ko') {
        // Mettre dans KO
        updateData.status = 'ko'
        // Garder le closer actuel ou assigner au current user
        updateData.closer_id = currentLead.closer_id || currentUser.id
      } else {
        // Assigner à un closer
        updateData.closer_id = targetCloserId
        // Si le lead était en KO, le remettre en nouveau
        if (currentLead.status === 'ko') {
          updateData.status = 'nouveau'
        }
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', draggedLead)

      if (!error) {
        router.refresh()
      } else {
        alert('Erreur lors du déplacement: ' + error.message)
      }
    } catch (error: any) {
      alert('Erreur: ' + error.message)
    } finally {
      setDraggedLead(null)
    }
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Colonne Nouveau (non assignés) */}
        <div
          className="flex-shrink-0 w-80 bg-blue-500/10 rounded-xl p-4 border border-white/10"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop('nouveau')}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🆕</span>
            <h3 className="font-semibold text-white">Nouveau</h3>
            <span className="ml-auto px-2 py-1 bg-white/10 rounded-full text-xs text-white/70">
              {getLeadsForColumn('nouveau').length}
            </span>
          </div>
          <div className="space-y-3 min-h-[200px]">
            {getLeadsForColumn('nouveau').map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                formationLabels={formationLabels}
                interestLevelEmojis={interestLevelEmojis}
                getCardColor={getCardColor}
                getStatusEmoji={getStatusEmoji}
                draggedLead={draggedLead}
                onDragStart={handleDragStart}
                onClick={() => setSelectedLead(lead)}
              />
            ))}
            {getLeadsForColumn('nouveau').length === 0 && (
              <div className="text-center text-white/30 text-sm py-8">Aucun lead</div>
            )}
          </div>
        </div>

        {/* Colonnes par closer */}
        {closers.length > 0 ? (
          closers.map(closer => {
            const columnLeads = getLeadsForColumn(closer.id)
            return (
              <div
                key={closer.id}
                className="flex-shrink-0 w-80 bg-white/5 rounded-xl p-4 border border-white/10"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(closer.id)}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">👤</span>
                  <h3 className="font-semibold text-white">
                    {closer.full_name || closer.email}
                  </h3>
                  <span className="ml-auto px-2 py-1 bg-white/10 rounded-full text-xs text-white/70">
                    {columnLeads.length}
                  </span>
                </div>
                <div className="space-y-3 min-h-[200px]">
                  {columnLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      formationLabels={formationLabels}
                      interestLevelEmojis={interestLevelEmojis}
                      getCardColor={getCardColor}
                      getStatusEmoji={getStatusEmoji}
                      draggedLead={draggedLead}
                      onDragStart={handleDragStart}
                      onClick={() => setSelectedLead(lead)}
                    />
                  ))}
                  {columnLeads.length === 0 && (
                    <div className="text-center text-white/30 text-sm py-8">Aucun lead</div>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          // Si aucun closer n'est trouvé mais que l'utilisateur connecté est un closer, afficher sa colonne
          currentUser && currentUser.role === 'closer' && (
            <div
              className="flex-shrink-0 w-80 bg-white/5 rounded-xl p-4 border border-white/10"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(currentUser.id)}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">👤</span>
                <h3 className="font-semibold text-white">
                  {currentUser.full_name || currentUser.email || 'Vous'}
                </h3>
                <span className="ml-auto px-2 py-1 bg-white/10 rounded-full text-xs text-white/70">
                  {getLeadsForColumn(currentUser.id).length}
                </span>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {getLeadsForColumn(currentUser.id).map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    formationLabels={formationLabels}
                    interestLevelEmojis={interestLevelEmojis}
                    getCardColor={getCardColor}
                    getStatusEmoji={getStatusEmoji}
                    draggedLead={draggedLead}
                    onDragStart={handleDragStart}
                    onClick={() => setSelectedLead(lead)}
                  />
                ))}
                {getLeadsForColumn(currentUser.id).length === 0 && (
                  <div className="text-center text-white/30 text-sm py-8">Aucun lead</div>
                )}
              </div>
            </div>
          )
        )}

        {/* Colonne KO */}
        <div
          className="flex-shrink-0 w-80 bg-red-500/10 rounded-xl p-4 border border-white/10"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop('ko')}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">❌</span>
            <h3 className="font-semibold text-white">K.O</h3>
            <span className="ml-auto px-2 py-1 bg-white/10 rounded-full text-xs text-white/70">
              {getLeadsForColumn('ko').length}
            </span>
          </div>
          <div className="space-y-3 min-h-[200px]">
            {getLeadsForColumn('ko').map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                formationLabels={formationLabels}
                interestLevelEmojis={interestLevelEmojis}
                getCardColor={getCardColor}
                getStatusEmoji={getStatusEmoji}
                draggedLead={draggedLead}
                onDragStart={handleDragStart}
                onClick={() => setSelectedLead(lead)}
              />
            ))}
            {getLeadsForColumn('ko').length === 0 && (
              <div className="text-center text-white/30 text-sm py-8">Aucun lead</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal détail client */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          currentUser={currentUser}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </>
  )
}

// Composant carte lead réutilisable
function LeadCard({
  lead,
  formationLabels,
  interestLevelEmojis,
  getCardColor,
  getStatusEmoji,
  draggedLead,
  onDragStart,
  onClick,
}: {
  lead: Lead & { users?: { full_name: string | null; email: string } | null }
  formationLabels: Record<string, string>
  interestLevelEmojis: Record<string, string>
  getCardColor: (status: Lead['status']) => string
  getStatusEmoji: (status: Lead['status']) => string
  draggedLead: string | null
  onDragStart: (leadId: string) => void
  onClick: () => void
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(lead.id)}
      onClick={onClick}
      className={`rounded-lg p-4 cursor-move hover:scale-[1.02] transition-all border ${getCardColor(lead.status)} ${
        draggedLead === lead.id ? 'opacity-50' : ''
      }`}
    >
      {/* Statut avec emoji */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getStatusEmoji(lead.status)}</span>
        <span className="text-xs text-white/60 font-medium">
          {lead.status === 'nouveau' ? '👶 Nouveau' :
           lead.status === 'chinois' ? '🇨🇳 Chinois' :
           lead.status === 'rats' ? '🐀 Rats' :
           lead.status === 'nrp' ? '📞 NRP' :
           lead.status === 'en_cours_de_closing' ? '👍 En cours de closing' :
           lead.status === 'acompte_en_cours' ? '💰 Acompte en cours' :
           lead.status === 'appele' ? '📞 Appelé' : 
           lead.status === 'acompte_regle' ? '💰 Acompte réglé' :
           lead.status === 'clos' ? '✅ Closé' : 
           lead.status === 'ko' ? '❌ KO' : '👶 Nouveau'}
        </span>
      </div>

      {/* Nom du client */}
      <div className="font-semibold text-white mb-2">
        {lead.first_name} {lead.last_name}
      </div>

      {/* Formation */}
      <div className="text-sm text-white/70 mb-2">
        {formationLabels[lead.formation] || lead.formation}
      </div>

      {/* Niveau d'intérêt */}
      {lead.interest_level && (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-lg">
            {interestLevelEmojis[lead.interest_level] || '⚪'}
          </span>
          <span className="text-xs text-white/60 capitalize">
            {lead.interest_level}
          </span>
        </div>
      )}

      {/* Prix si défini */}
      {lead.price_fixed && (
        <div className="text-xs text-white/60 mt-2">
          💵 {lead.price_fixed.toFixed(2)} €
        </div>
      )}

      {/* Date d'ajout */}
      <div className="text-xs text-white/40 mt-2">
        {format(new Date(lead.created_at), 'dd MMM yyyy', { locale: fr })}
      </div>
    </div>
  )
}
