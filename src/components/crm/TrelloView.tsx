'use client'

import { useState, useRef, useEffect } from 'react'
import { Lead, UserRole, Financement } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import LeadDetailModal from './LeadDetailModal'
import { FINANCEMENT_OPTIONS, getFinancementOption } from '@/lib/financement'

const SCROLL_ZONE = 100
const SCROLL_SPEED = 12

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
  isDemo?: boolean
  favoriteLeadIds?: Set<string>
  onToggleFavorite?: (leadId: string, isFavorite: boolean) => void
}

export default function TrelloView({ leads, closers, currentUser, isDemo, favoriteLeadIds = new Set(), onToggleFavorite }: TrelloViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [draggedLead, setDraggedLead] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [mobileMoveLead, setMobileMoveLead] = useState<Lead | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [mobileDropPending, setMobileDropPending] = useState(false)
  // Lead déposé dans la colonne Financement, en attente du choix de l'étiquette
  const [financementPickLead, setFinancementPickLead] = useState<Lead | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const dragPositionRef = useRef({ x: 0, y: 0 })
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-scroll horizontal quand on tire une carte vers les bords
  useEffect(() => {
    if (!draggedLead || !scrollContainerRef.current) return

    const el = scrollContainerRef.current
    const tick = () => {
      const { x } = dragPositionRef.current
      const rect = el.getBoundingClientRect()
      const leftEdge = rect.left + SCROLL_ZONE
      const rightEdge = rect.right - SCROLL_ZONE
      if (x < leftEdge) {
        el.scrollBy({ left: -SCROLL_SPEED, behavior: 'auto' })
      } else if (x > rightEdge) {
        el.scrollBy({ left: SCROLL_SPEED, behavior: 'auto' })
      }
    }
    scrollIntervalRef.current = setInterval(tick, 16)
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current)
        scrollIntervalRef.current = null
      }
    }
  }, [draggedLead])

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

  // Obtenir les leads pour une colonne (closer ou nouveau/ko/clos), favoris en tête
  const getLeadsForColumn = (closerId: string | 'nouveau' | 'financement' | 'ko' | 'clos') => {
    let list: typeof leads
    const isActive = (lead: Lead) => lead.status !== 'ko' && lead.status !== 'clos'
    if (closerId === 'nouveau') {
      list = leads.filter(lead => !lead.closer_id && !lead.financement && isActive(lead))
    } else if (closerId === 'financement') {
      list = leads.filter(lead => !!lead.financement && isActive(lead))
    } else if (closerId === 'ko') {
      list = leads.filter(lead => lead.status === 'ko')
    } else if (closerId === 'clos') {
      list = leads.filter(lead => lead.status === 'clos')
    } else {
      list = leads.filter(lead => lead.closer_id === closerId && !lead.financement && isActive(lead))
    }
    return [...list].sort((a, b) => {
      const aFav = favoriteLeadIds.has(a.id)
      const bFav = favoriteLeadIds.has(b.id)
      if (aFav && !bFav) return -1
      if (!aFav && bFav) return 1
      return 0
    })
  }

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', leadId)
  }

  const handleScrollContainerDragOver = (e: React.DragEvent) => {
    dragPositionRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumnId(columnId)
  }

  const handleColumnDragLeave = () => {
    setDragOverColumnId(null)
  }

  const handleDragEnd = () => {
    setDraggedLead(null)
    setDragOverColumnId(null)
  }

  const handleDrop = async (
    targetCloserId: string | 'nouveau' | 'financement' | 'ko' | 'clos',
    leadId?: string,
    financement?: Financement
  ) => {
    const leadIdToMove = leadId || draggedLead
    if (!leadIdToMove || !currentUser?.id) return
    if (isDemo) {
      alert('Mode démo – les modifications ne sont pas enregistrées.')
      setDraggedLead(null)
      setDragOverColumnId(null)
      setMobileMoveLead(null)
      return
    }
    if (leadId && mobileDropPending) return
    if (leadId) setMobileDropPending(true)

    const currentLead = leads.find(l => l.id === leadIdToMove)
    if (!currentLead) {
      if (leadId) setMobileDropPending(false)
      return
    }

    // Dépôt dans Financement sans étiquette choisie : ouvrir le sélecteur
    if (targetCloserId === 'financement' && !financement) {
      setFinancementPickLead(currentLead)
      setMobileMoveLead(null)
      setMobileDropPending(false)
      setDraggedLead(null)
      setDragOverColumnId(null)
      return
    }

    try {
      let updateData: any = {
        last_action_at: new Date().toISOString(),
      }

      if (targetCloserId === 'nouveau') {
        // Mettre dans nouveau = enlever le closer
        updateData.closer_id = null
        updateData.financement = null
        if (currentLead.status === 'ko') {
          updateData.status = 'nouveau'
        }
      } else if (targetCloserId === 'financement') {
        updateData.financement = financement
        updateData.closer_id = currentLead.closer_id || currentUser.id
        if (currentLead.status === 'ko' || currentLead.status === 'clos') {
          updateData.status = 'en_cours_de_closing'
        }
      } else if (targetCloserId === 'ko') {
        const { count } = await supabase
          .from('lead_comments')
          .select('*', { count: 'exact', head: true })
          .eq('lead_id', leadIdToMove)
        if ((count || 0) === 0) {
          const ok = window.confirm(
            '⚠️ Ce lead n\'a aucun commentaire. Il est recommandé d\'ajouter un commentaire pour documenter le motif du KO.\n\nMarquer KO quand même ?'
          )
          if (!ok) {
            if (leadId) setMobileDropPending(false)
            setDraggedLead(null)
            setDragOverColumnId(null)
            return
          }
        }
        updateData.status = 'ko'
        updateData.closer_id = currentLead.closer_id || currentUser.id
      } else if (targetCloserId === 'clos') {
        // Mettre dans Clos
        updateData.status = 'clos'
        // Garder le closer actuel ou assigner au current user
        updateData.closer_id = currentLead.closer_id || currentUser.id
      } else {
        // Assigner à un closer (sort le lead de la colonne Financement)
        updateData.closer_id = targetCloserId
        updateData.financement = null
        // Si le lead était en KO, le remettre en nouveau
        if (currentLead.status === 'ko') {
          updateData.status = 'nouveau'
        }
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadIdToMove)

      if (!error) {
        setMobileMoveLead(null)
        setFinancementPickLead(null)
        await fetch('/api/revalidate-dashboard').catch(() => {})
        router.refresh()
      } else {
        alert('Erreur lors du déplacement: ' + error.message)
      }
    } catch (error: any) {
      alert('Erreur: ' + error.message)
    } finally {
      setDraggedLead(null)
      setDragOverColumnId(null)
      setMobileDropPending(false)
    }
  }

  return (
    <>
      <div
        ref={scrollContainerRef}
        onDragOver={handleScrollContainerDragOver}
        className="hidden lg:flex gap-4 overflow-x-auto overflow-y-hidden pb-4 scroll-smooth scrollbar-thin"
        style={{ scrollBehavior: 'auto' }}
      >
        {/* Colonne Nouveau (non assignés) */}
        <div
          className={`flex-shrink-0 w-80 rounded-xl p-4 border-2 transition-all duration-150 min-h-[280px] ${
            dragOverColumnId === 'nouveau'
              ? 'bg-blue-500/25 border-blue-400/60 ring-2 ring-blue-400/40'
              : 'bg-blue-500/10 border-white/10'
          }`}
          onDragOver={(e) => handleColumnDragOver(e, 'nouveau')}
          onDragLeave={handleColumnDragLeave}
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
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedLead(lead)}
                isFavorite={favoriteLeadIds.has(lead.id)}
                onToggleFavorite={onToggleFavorite}
                isDemo={isDemo}
              />
            ))}
            {getLeadsForColumn('nouveau').length === 0 && (
              <div className="text-center text-white/30 text-sm py-8 min-h-[120px] flex items-center justify-center">Aucun lead</div>
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
                className={`flex-shrink-0 w-80 rounded-xl p-4 border-2 transition-all duration-150 min-h-[280px] ${
                  dragOverColumnId === closer.id
                    ? 'bg-white/15 border-white/40 ring-2 ring-white/30'
                    : 'bg-white/5 border-white/10'
                }`}
                onDragOver={(e) => handleColumnDragOver(e, closer.id)}
                onDragLeave={handleColumnDragLeave}
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
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedLead(lead)}
                      isFavorite={favoriteLeadIds.has(lead.id)}
                      onToggleFavorite={onToggleFavorite}
                      isDemo={isDemo}
                    />
                  ))}
                  {columnLeads.length === 0 && (
                    <div className="text-center text-white/30 text-sm py-8 min-h-[120px] flex items-center justify-center">Aucun lead</div>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          // Si aucun closer n'est trouvé mais que l'utilisateur connecté est un closer, afficher sa colonne
          currentUser && currentUser.role === 'closer' && (
            <div
              className={`flex-shrink-0 w-80 rounded-xl p-4 border-2 transition-all duration-150 min-h-[280px] ${
                dragOverColumnId === currentUser.id ? 'bg-white/15 border-white/40 ring-2 ring-white/30' : 'bg-white/5 border-white/10'
              }`}
              onDragOver={(e) => handleColumnDragOver(e, currentUser.id)}
              onDragLeave={handleColumnDragLeave}
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
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedLead(lead)}
                    isFavorite={favoriteLeadIds.has(lead.id)}
                    onToggleFavorite={onToggleFavorite}
                    isDemo={isDemo}
                  />
                ))}
                {getLeadsForColumn(currentUser.id).length === 0 && (
                  <div className="text-center text-white/30 text-sm py-8">Aucun lead</div>
                )}
              </div>
            </div>
          )
        )}

        {/* Colonne Financement (CPF, Pôle Emploi, AFDAS...) */}
        <div
          className={`flex-shrink-0 w-80 rounded-xl p-4 border-2 transition-all duration-150 min-h-[280px] ${
            dragOverColumnId === 'financement' ? 'bg-purple-500/25 border-purple-400/60 ring-2 ring-purple-400/40' : 'bg-purple-500/10 border-white/10'
          }`}
          onDragOver={(e) => handleColumnDragOver(e, 'financement')}
          onDragLeave={handleColumnDragLeave}
          onDrop={() => handleDrop('financement')}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💶</span>
            <h3 className="font-semibold text-white">Financement</h3>
            <span className="ml-auto px-2 py-1 bg-white/10 rounded-full text-xs text-white/70">
              {getLeadsForColumn('financement').length}
            </span>
          </div>
          <p className="text-xs text-white/40 -mt-2 mb-4">CPF · Pôle Emploi · AFDAS · OPCO</p>
          <div className="space-y-3 min-h-[200px]">
            {getLeadsForColumn('financement').map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                formationLabels={formationLabels}
                interestLevelEmojis={interestLevelEmojis}
                getCardColor={getCardColor}
                getStatusEmoji={getStatusEmoji}
                draggedLead={draggedLead}
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedLead(lead)}
                isFavorite={favoriteLeadIds.has(lead.id)}
                onToggleFavorite={onToggleFavorite}
                isDemo={isDemo}
                showCloser
              />
            ))}
            {getLeadsForColumn('financement').length === 0 && (
              <div className="text-center text-white/30 text-sm py-8 min-h-[120px] flex items-center justify-center">Aucun lead</div>
            )}
          </div>
        </div>

        {/* Colonne Clos */}
        <div
          className={`flex-shrink-0 w-80 rounded-xl p-4 border-2 transition-all duration-150 min-h-[280px] ${
            dragOverColumnId === 'clos' ? 'bg-green-500/25 border-green-400/60 ring-2 ring-green-400/40' : 'bg-green-500/10 border-white/10'
          }`}
          onDragOver={(e) => handleColumnDragOver(e, 'clos')}
          onDragLeave={handleColumnDragLeave}
          onDrop={() => handleDrop('clos')}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">✅</span>
            <h3 className="font-semibold text-white">Closer</h3>
            <span className="ml-auto px-2 py-1 bg-white/10 rounded-full text-xs text-white/70">
              {getLeadsForColumn('clos').length}
            </span>
          </div>
          <div className="space-y-3 min-h-[200px]">
            {getLeadsForColumn('clos').map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                formationLabels={formationLabels}
                interestLevelEmojis={interestLevelEmojis}
                getCardColor={getCardColor}
                getStatusEmoji={getStatusEmoji}
                draggedLead={draggedLead}
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedLead(lead)}
                isFavorite={favoriteLeadIds.has(lead.id)}
                onToggleFavorite={onToggleFavorite}
                isDemo={isDemo}
              />
            ))}
            {getLeadsForColumn('clos').length === 0 && (
              <div className="text-center text-white/30 text-sm py-8 min-h-[120px] flex items-center justify-center">Aucun lead</div>
            )}
          </div>
        </div>

        {/* Colonne KO */}
        <div
          className={`flex-shrink-0 w-80 rounded-xl p-4 border-2 transition-all duration-150 min-h-[280px] ${
            dragOverColumnId === 'ko' ? 'bg-red-500/25 border-red-400/60 ring-2 ring-red-400/40' : 'bg-red-500/10 border-white/10'
          }`}
          onDragOver={(e) => handleColumnDragOver(e, 'ko')}
          onDragLeave={handleColumnDragLeave}
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
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onDragEnd={handleDragEnd}
                onClick={() => setSelectedLead(lead)}
                isFavorite={favoriteLeadIds.has(lead.id)}
                onToggleFavorite={onToggleFavorite}
                isDemo={isDemo}
              />
            ))}
            {getLeadsForColumn('ko').length === 0 && (
              <div className="text-center text-white/30 text-sm py-8 min-h-[120px] flex items-center justify-center">Aucun lead</div>
            )}
          </div>
        </div>
      </div>

      {/* Vue mobile - Liste simplifiée (même logique que desktop : un lead = une seule colonne) */}
      <div className="lg:hidden space-y-4">
        {closers.map((closer) => {
          const closerLeads = getLeadsForColumn(closer.id)
          if (closerLeads.length === 0) return null

          return (
            <div key={closer.id} className="apple-card rounded-xl p-4">
              <h3 className="text-base font-semibold text-white mb-3">
                {closer.full_name || closer.email}
              </h3>
              <div className="space-y-2">
                {closerLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`p-3 rounded-lg border transition ${getCardColor(lead.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        onClick={() => setSelectedLead(lead)}
                        className="flex-1 cursor-pointer"
                      >
                        <span className="font-semibold text-white text-sm">
                          {lead.first_name} {lead.last_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getStatusEmoji(lead.status)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMobileMoveLead(lead)
                          }}
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white/70 transition"
                        >
                          📤
                        </button>
                      </div>
                    </div>
                    <div
                      onClick={() => setSelectedLead(lead)}
                      className="cursor-pointer"
                    >
                      <div className="text-xs text-white/60">
                        {formationLabels[lead.formation] || lead.formation}
                      </div>
                      {lead.interest_level && (
                        <div className="text-xs text-white/50 mt-1">
                          {interestLevelEmojis[lead.interest_level]} {lead.interest_level}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {/* Colonne Nouveau */}
        {getLeadsForColumn('nouveau').length > 0 && (
          <div className="apple-card rounded-xl p-4">
            <h3 className="text-base font-semibold text-white mb-3">Nouveau</h3>
            <div className="space-y-2">
              {getLeadsForColumn('nouveau').map((lead) => (
                <div
                  key={lead.id}
                  className={`p-3 rounded-lg border transition ${getCardColor(lead.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      onClick={() => setSelectedLead(lead)}
                      className="flex-1 cursor-pointer"
                    >
                      <span className="font-semibold text-white text-sm">
                        {lead.first_name} {lead.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusEmoji(lead.status)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMobileMoveLead(lead)
                        }}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white/70 transition"
                      >
                        📤
                      </button>
                    </div>
                  </div>
                  <div
                    onClick={() => setSelectedLead(lead)}
                    className="cursor-pointer"
                  >
                    <div className="text-xs text-white/60">
                      {formationLabels[lead.formation] || lead.formation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Colonne Financement */}
        {getLeadsForColumn('financement').length > 0 && (
          <div className="apple-card rounded-xl p-4">
            <h3 className="text-base font-semibold text-white mb-3">💶 Financement</h3>
            <div className="space-y-2">
              {getLeadsForColumn('financement').map((lead) => (
                <div
                  key={lead.id}
                  className={`p-3 rounded-lg border transition ${getCardColor(lead.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      onClick={() => setSelectedLead(lead)}
                      className="flex-1 cursor-pointer"
                    >
                      <span className="font-semibold text-white text-sm">
                        {lead.first_name} {lead.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusEmoji(lead.status)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMobileMoveLead(lead)
                        }}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white/70 transition"
                      >
                        📤
                      </button>
                    </div>
                  </div>
                  <div
                    onClick={() => setSelectedLead(lead)}
                    className="cursor-pointer"
                  >
                    <div className="text-xs text-white/60">
                      {formationLabels[lead.formation] || lead.formation}
                    </div>
                    <FinancementBadge financement={lead.financement} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Colonne Clos */}
        {getLeadsForColumn('clos').length > 0 && (
          <div className="apple-card rounded-xl p-4">
            <h3 className="text-base font-semibold text-white mb-3">✅ Clos</h3>
            <div className="space-y-2">
              {getLeadsForColumn('clos').map((lead) => (
                <div
                  key={lead.id}
                  className={`p-3 rounded-lg border transition ${getCardColor(lead.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      onClick={() => setSelectedLead(lead)}
                      className="flex-1 cursor-pointer"
                    >
                      <span className="font-semibold text-white text-sm">
                        {lead.first_name} {lead.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusEmoji(lead.status)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMobileMoveLead(lead)
                        }}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white/70 transition"
                      >
                        📤
                      </button>
                    </div>
                  </div>
                  <div
                    onClick={() => setSelectedLead(lead)}
                    className="cursor-pointer"
                  >
                    <div className="text-xs text-white/60">
                      {formationLabels[lead.formation] || lead.formation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Colonne KO */}
        {getLeadsForColumn('ko').length > 0 && (
          <div className="apple-card rounded-xl p-4">
            <h3 className="text-base font-semibold text-white mb-3">❌ K.O</h3>
            <div className="space-y-2">
              {getLeadsForColumn('ko').map((lead) => (
                <div
                  key={lead.id}
                  className={`p-3 rounded-lg border transition ${getCardColor(lead.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      onClick={() => setSelectedLead(lead)}
                      className="flex-1 cursor-pointer"
                    >
                      <span className="font-semibold text-white text-sm">
                        {lead.first_name} {lead.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusEmoji(lead.status)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMobileMoveLead(lead)
                        }}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white/70 transition"
                      >
                        📤
                      </button>
                    </div>
                  </div>
                  <div
                    onClick={() => setSelectedLead(lead)}
                    className="cursor-pointer"
                  >
                    <div className="text-xs text-white/60">
                      {formationLabels[lead.formation] || lead.formation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal détail client */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          currentUser={currentUser}
          onClose={() => setSelectedLead(null)}
          isDemo={isDemo}
        />
      )}

      {/* Modal de déplacement mobile */}
      {mobileMoveLead && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">
              Déplacer {mobileMoveLead.first_name} {mobileMoveLead.last_name}
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => handleDrop('nouveau', mobileMoveLead.id)}
                disabled={mobileDropPending}
                className="w-full px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-xl text-white text-sm font-medium transition text-left disabled:opacity-50 disabled:pointer-events-none"
              >
                🆕 Nouveau
              </button>
              {closers.map((closer) => (
                <button
                  key={closer.id}
                  onClick={() => handleDrop(closer.id, mobileMoveLead.id)}
                  disabled={mobileDropPending}
                  className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition text-left disabled:opacity-50 disabled:pointer-events-none"
                >
                  👤 {closer.full_name || closer.email}
                </button>
              ))}
              <button
                onClick={() => handleDrop('financement', mobileMoveLead.id)}
                disabled={mobileDropPending}
                className="w-full px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 rounded-xl text-white text-sm font-medium transition text-left disabled:opacity-50 disabled:pointer-events-none"
              >
                💶 Financement (CPF, Pôle Emploi, AFDAS…)
              </button>
              <button
                onClick={() => handleDrop('clos', mobileMoveLead.id)}
                disabled={mobileDropPending}
                className="w-full px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded-xl text-white text-sm font-medium transition text-left disabled:opacity-50 disabled:pointer-events-none"
              >
                ✅ Clos
              </button>
              <button
                onClick={() => handleDrop('ko', mobileMoveLead.id)}
                disabled={mobileDropPending}
                className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-xl text-white text-sm font-medium transition text-left disabled:opacity-50 disabled:pointer-events-none"
              >
                ❌ K.O
              </button>
            </div>
            <button
              onClick={() => !mobileDropPending && setMobileMoveLead(null)}
              disabled={mobileDropPending}
              className="w-full mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm transition disabled:opacity-50 disabled:pointer-events-none"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Choix du type de financement */}
      {financementPickLead && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-1">Type de financement</h3>
            <p className="text-sm text-white/50 mb-4">
              {financementPickLead.first_name} {financementPickLead.last_name}
            </p>
            <div className="space-y-2">
              {FINANCEMENT_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleDrop('financement', financementPickLead.id, option.value)}
                  disabled={mobileDropPending}
                  className={`w-full px-4 py-3 border rounded-xl text-sm font-medium transition text-left hover:brightness-125 disabled:opacity-50 disabled:pointer-events-none ${option.badge}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => !mobileDropPending && setFinancementPickLead(null)}
              disabled={mobileDropPending}
              className="w-full mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm transition disabled:opacity-50 disabled:pointer-events-none"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function FinancementBadge({ financement }: { financement: Lead['financement'] }) {
  const option = getFinancementOption(financement)
  if (!option) return null
  return (
    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${option.badge}`}>
      💶 {option.label}
    </span>
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
  onDragEnd,
  onClick,
  isFavorite = false,
  onToggleFavorite,
  isDemo = false,
  showCloser = false,
}: {
  lead: Lead & { users?: { full_name: string | null; email: string } | null }
  formationLabels: Record<string, string>
  interestLevelEmojis: Record<string, string>
  getCardColor: (status: Lead['status']) => string
  getStatusEmoji: (status: Lead['status']) => string
  draggedLead: string | null
  onDragStart: (e: React.DragEvent, leadId: string) => void
  onDragEnd: () => void
  onClick: () => void
  isFavorite?: boolean
  onToggleFavorite?: (leadId: string, isFavorite: boolean) => void
  isDemo?: boolean
  showCloser?: boolean
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`rounded-lg p-4 cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-all border ${getCardColor(lead.status)} ${
        draggedLead === lead.id ? 'opacity-50 scale-95' : ''
      }`}
    >
      {/* Favori + Statut */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
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
        {!isDemo && onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              fetch(`/api/leads/${lead.id}/favorite`, { method: 'POST' })
                .then((r) => r.json())
                .then((d) => onToggleFavorite(lead.id, d.isFavorite))
                .catch(() => {})
            }}
            className={`text-base transition shrink-0 ${isFavorite ? 'text-amber-400' : 'text-white/30 hover:text-amber-400/70'}`}
            title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            {isFavorite ? '⭐' : '☆'}
          </button>
        )}
      </div>

      {/* Nom du client */}
      <div className="font-semibold text-white mb-2">
        {lead.first_name} {lead.last_name}
      </div>

      {/* Formation */}
      <div className="text-sm text-white/70 mb-2">
        {formationLabels[lead.formation] || lead.formation}
      </div>

      {/* Étiquette financement */}
      {lead.financement && (
        <div className="mb-2">
          <FinancementBadge financement={lead.financement} />
        </div>
      )}

      {/* Closer (utile dans la colonne Financement qui mélange les closers) */}
      {showCloser && lead.users && (
        <div className="text-xs text-white/50 mb-2">
          👤 {lead.users.full_name || lead.users.email}
        </div>
      )}

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
