'use client'

import { useState, useEffect } from 'react'
import { Lead, UserRole } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import DatePicker from './DatePicker'

interface Comment {
  id: string
  comment: string
  created_at: string
  user_id: string
  users: {
    full_name: string | null
    email: string
  } | null
}

interface LeadDetailModalProps {
  lead: Lead & { users?: { full_name: string | null; email: string } | null }
  currentUser: {
    id: string
    role: UserRole
    full_name?: string | null
    email?: string
  } | null
  onClose: () => void
  isDemo?: boolean
}

export default function LeadDetailModal({ lead, currentUser, onClose, isDemo }: LeadDetailModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)
  const isAdmin = currentUser?.role === 'admin'
  
  const [editValues, setEditValues] = useState({
    first_name: lead.first_name,
    last_name: lead.last_name,
    phone: lead.phone,
    email: lead.email || '',
    formation: lead.formation,
    status: lead.status,
    price_fixed: lead.price_fixed,
    price_deposit: lead.price_deposit,
    formation_format: lead.formation_format,
    formation_day: lead.formation_day,
    formation_start_date: lead.formation_start_date,
    interest_level: lead.interest_level,
    source: lead.source || 'direct',
  })

  useEffect(() => {
    loadComments()
  }, [lead.id])

  const loadComments = async () => {
    setLoadingComments(true)
    if (isDemo) {
      setComments([])
      setLoadingComments(false)
      return
    }
    const { data } = await supabase
      .from('lead_comments')
      .select('*, users:user_id(full_name, email)')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })

    if (data) {
      setComments(data as Comment[])
    }
    setLoadingComments(false)
  }

  const handleFieldChange = (field: string, value: any) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    if (!currentUser?.id) return
    if (isDemo) {
      alert('Mode démo – les modifications ne sont pas enregistrées.')
      return
    }
    setSaving(true)
    try {
      // Vérifier si on change le statut vers acompte_regle ou clos
      const statusChanged = editValues.status !== lead.status
      const newStatus = editValues.status
      
      if (statusChanged && (newStatus === 'acompte_regle' || newStatus === 'clos')) {
        // Vérifications préalables
        if (!editValues.price_fixed) {
          alert('Le prix fixé doit être défini pour créer un paiement')
          setSaving(false)
          return
        }

        if (newStatus === 'acompte_regle' && !editValues.price_deposit) {
          alert('Le prix acompte doit être défini pour marquer l\'acompte comme réglé')
          setSaving(false)
          return
        }

        // Vérifier si un paiement existe déjà
        const { data: existingPayments } = await supabase
          .from('lead_payments')
          .select('amount, payment_type')
          .eq('lead_id', lead.id)

        const totalPaid = existingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

        // Déterminer le type de paiement
        let paymentType = 'complet'
        if (newStatus === 'acompte_regle' && editValues.price_deposit) {
          if (totalPaid > 0) {
            alert('Un paiement a déjà été effectué pour ce lead')
            setSaving(false)
            return
          }
          paymentType = 'acompte'
        } else if (newStatus === 'clos') {
          if (lead.status === 'acompte_regle') {
            const remaining = (editValues.price_fixed || 0) - totalPaid
            if (remaining <= 0) {
              alert('Le solde est déjà réglé')
              setSaving(false)
              return
            }
            paymentType = 'complet'
          } else {
            if (totalPaid > 0) {
              alert('Un paiement a déjà été effectué pour ce lead')
              setSaving(false)
              return
            }
            paymentType = 'complet'
          }
        }

        // Appeler l'API pour créer le paiement et l'entrée comptable
        const response = await fetch('/api/leads/mark-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead.id,
            paymentType: paymentType,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Erreur lors de la création du paiement')
        }
      }

      // Mettre à jour les autres champs
      const updateData: any = {
        first_name: editValues.first_name.trim(),
        last_name: editValues.last_name.trim(),
        phone: editValues.phone.trim(),
        email: editValues.email.trim() || null,
        formation: editValues.formation,
        status: editValues.status,
        source: editValues.source || 'direct',
        price_fixed: editValues.price_fixed ? parseFloat(String(editValues.price_fixed)) : null,
        price_deposit: editValues.price_deposit ? parseFloat(String(editValues.price_deposit)) : null,
        formation_format: editValues.formation_format,
        formation_day: editValues.formation_day,
        formation_start_date: editValues.formation_start_date,
        interest_level: editValues.interest_level,
        closer_id: currentUser.id,
        last_action_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id)

      if (!error) {
        await fetch('/api/revalidate-dashboard').catch(() => {})
        router.refresh()
        onClose()
      } else {
        alert('Erreur lors de la sauvegarde: ' + error.message)
      }
    } catch (error: any) {
      alert('Erreur: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLead = async () => {
    if (!isAdmin || deleting) return
    if (isDemo) {
      alert('Mode démo – les modifications ne sont pas enregistrées.')
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur lors de la suppression')
      }
      setShowDeleteConfirm(false)
      onClose()
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser?.id) {
      alert('Veuillez saisir un commentaire')
      return
    }
    if (isDemo) {
      alert('Mode démo – les modifications ne sont pas enregistrées.')
      return
    }
    setLoading(true)
    const { error } = await supabase
      .from('lead_comments')
      .insert({
        lead_id: lead.id,
        user_id: currentUser.id,
        comment: newComment.trim(),
      })

    if (!error) {
      setNewComment('')
      await loadComments()
      router.refresh()
    } else {
      alert('Erreur lors de l\'ajout du commentaire: ' + error.message)
    }
    setLoading(false)
  }

  const formationLabels: Record<string, string> = {
    inge_son: 'Ingénieur du son',
    beatmaking: 'Beatmaking',
    autre: 'Autre',
  }

  const statusLabels: Record<string, string> = {
    nouveau: '👶 Nouveau',
    chinois: '🇨🇳 Chinois',
    rats: '🐀 Rats',
    nrp: '📞 NRP',
    en_cours_de_closing: '👍 En cours de closing',
    acompte_en_cours: '💰 Acompte en cours',
    appele: '📞 Appelé',
    acompte_regle: '💰 Acompte réglé',
    clos: '✅ Closé',
    ko: '❌ KO',
  }

  const interestLevelLabels: Record<string, string> = {
    chaud: '🔥 Chaud',
    moyen: '🟡 Moyen',
    froid: '🔵 Froid',
  }

  const sourceLabels: Record<string, string> = {
    manuel: 'Manuel',
    direct: 'Direct / Bouche à oreille',
    instagram: '📷 Instagram',
    tiktok: '🎵 TikTok',
    facebook: '📘 Facebook',
    google: '🔍 Google',
    youtube: '📺 YouTube',
    autre: 'Autre',
  }

  const getUserName = (comment: Comment) => {
    return comment.users?.full_name || comment.users?.email || 'Utilisateur inconnu'
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4" onClick={onClose}>
      <div 
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-white/10 flex-shrink-0">
          <h2 className="text-lg sm:text-2xl font-bold text-white truncate pr-2">
            Fiche client : {editValues.first_name} {editValues.last_name}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl sm:text-3xl flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Informations principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Prénom *</label>
              <input
                type="text"
                value={editValues.first_name}
                onChange={(e) => handleFieldChange('first_name', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
                placeholder="Prénom"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-2 block">Nom *</label>
              <input
                type="text"
                value={editValues.last_name}
                onChange={(e) => handleFieldChange('last_name', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
                placeholder="Nom"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-2 block">Téléphone *</label>
              <input
                type="tel"
                value={editValues.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
                placeholder="06 12 34 56 78"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-2 block">Email *</label>
              <input
                type="email"
                value={editValues.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Formation et statut */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Formation *</label>
              <select
                value={editValues.formation}
                onChange={(e) => handleFieldChange('formation', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
              >
                <option value="inge_son">Ingénieur du son</option>
                <option value="beatmaking">Beatmaking</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-white/60 mb-2 block">Statut</label>
              <select
                value={editValues.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Source</label>
            <select
              value={editValues.source}
              onChange={(e) => handleFieldChange('source', e.target.value)}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
            >
              <option value="manuel">Manuel</option>
              <option value="direct">Direct / Bouche à oreille</option>
              <option value="instagram">📷 Instagram</option>
              <option value="tiktok">🎵 TikTok</option>
              <option value="facebook">📘 Facebook</option>
              <option value="google">🔍 Google</option>
              <option value="youtube">📺 YouTube</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          {/* Niveau d'intérêt */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Niveau d&apos;intérêt</label>
            <select
              value={editValues.interest_level || ''}
              onChange={(e) => handleFieldChange('interest_level', e.target.value || null)}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
            >
              <option value="">Non défini</option>
              <option value="froid">🔵 Froid</option>
              <option value="moyen">🟡 Moyen</option>
              <option value="chaud">🔥 Chaud</option>
            </select>
          </div>

          {/* Prix */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Prix fixé (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editValues.price_fixed ?? ''}
                onChange={(e) => handleFieldChange('price_fixed', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-2 block">Prix acompte (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editValues.price_deposit ?? ''}
                onChange={(e) => handleFieldChange('price_deposit', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Format de formation */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Format de formation</label>
            <select
              value={editValues.formation_format || ''}
              onChange={(e) => handleFieldChange('formation_format', e.target.value || null)}
              className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
            >
              <option value="">Non défini</option>
              <option value="semaine">Semaine (Lundi-Vendredi)</option>
              <option value="mensuelle">Mensuelle (4 Samedis/Dimanches)</option>
              <option value="bpm_fast">⚡ BPM Fast (2 jours)</option>
            </select>
          </div>

          {/* Jour et date de début */}
          {editValues.formation_format && (
            <>
              <div>
                <label className="text-sm text-white/60 mb-2 block">
                  {editValues.formation_format === 'semaine' 
                    ? 'Jour de référence (pour la date)'
                    : 'Jour de formation'}
                </label>
                <select
                  value={editValues.formation_day || ''}
                  onChange={(e) => handleFieldChange('formation_day', e.target.value || null)}
                  className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition"
                >
                  <option value="">Sélectionner un jour</option>
                  {editValues.formation_format === 'semaine' ? (
                    <>
                      <option value="lundi">Lundi</option>
                      <option value="mardi">Mardi</option>
                      <option value="mercredi">Mercredi</option>
                      <option value="jeudi">Jeudi</option>
                      <option value="vendredi">Vendredi</option>
                    </>
                  ) : editValues.formation_format === 'mensuelle' ? (
                    <>
                      <option value="samedi">Samedi</option>
                      <option value="dimanche">Dimanche</option>
                    </>
                  ) : editValues.formation_format === 'bpm_fast' ? (
                    <>
                      <option value="lundi">Lundi</option>
                      <option value="mardi">Mardi</option>
                      <option value="mercredi">Mercredi</option>
                      <option value="jeudi">Jeudi</option>
                      <option value="vendredi">Vendredi</option>
                      <option value="samedi">Samedi</option>
                      <option value="dimanche">Dimanche</option>
                    </>
                  ) : null}
                </select>
              </div>
              {editValues.formation_day && (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Date de début</label>
                  <DatePicker
                    value={editValues.formation_start_date}
                    onChange={(date) => handleFieldChange('formation_start_date', date)}
                    formationFormat={editValues.formation_format}
                    formationDay={editValues.formation_day}
                    placeholder="Sélectionner une date"
                  />
                </div>
              )}
            </>
          )}

          {/* Closer assigné (lecture seule) */}
          {lead.users?.full_name && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">Closer assigné</label>
              <div className="text-white bg-white/5 rounded-lg p-3">
                {lead.users.full_name}
              </div>
            </div>
          )}

          {/* Dates (lecture seule) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Date d&apos;ajout</label>
              <div className="text-white text-sm bg-white/5 rounded-lg p-3">
                {format(new Date(lead.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </div>
            </div>
            {lead.last_action_at && (
              <div>
                <label className="text-sm text-white/60 mb-2 block">Dernière action</label>
                <div className="text-white text-sm bg-white/5 rounded-lg p-3">
                  {format(new Date(lead.last_action_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </div>
              </div>
            )}
          </div>

          {/* Section Commentaires */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">💬 Commentaires</h3>
            
            {/* Liste des commentaires */}
            <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
              {loadingComments ? (
                <div className="text-center text-white/50 py-4">Chargement...</div>
              ) : comments.length === 0 ? (
                <div className="text-center text-white/50 py-4">Aucun commentaire pour le moment</div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {getUserName(comment)}
                        </span>
                        <span className="text-xs text-white/50">•</span>
                        <span className="text-xs text-white/50">
                          {format(new Date(comment.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </span>
                      </div>
                    </div>
                    <p className="text-white/80 whitespace-pre-wrap break-words text-sm">
                      {comment.comment}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Formulaire nouveau commentaire */}
            <div>
              <label className="text-sm text-white/60 mb-2 block">Ajouter un commentaire</label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleAddComment()
                  }
                }}
                className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition resize-none"
                placeholder={`Ajoutez un commentaire... (${currentUser?.full_name || currentUser?.email || 'Vous'})`}
                rows={3}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-white/50">
                  Appuyez sur Cmd/Ctrl + Entrée pour ajouter
                </span>
                <button
                  onClick={handleAddComment}
                  disabled={loading || !newComment.trim()}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-3 p-4 sm:p-6 border-t border-white/10 flex-shrink-0">
          <div className="flex order-2 sm:order-1">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
                className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition disabled:opacity-50 text-sm"
              >
                🗑️ Supprimer le lead (toute trace)
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 sm:px-6 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white hover:bg-white/10 transition disabled:opacity-50 text-sm sm:text-base"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 sm:px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition disabled:opacity-50 shadow-lg text-sm sm:text-base"
            >
              {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div
            className="bg-[#1a1a1a] rounded-2xl p-6 max-w-md w-full border border-white/20 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">Supprimer ce lead ?</h3>
            <p className="text-white/70 text-sm mb-6">
              Le lead <strong>{lead.first_name} {lead.last_name}</strong> et toutes les données associées seront supprimés définitivement : ventes, paiements, commentaires, documents, planning. Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !deleting && setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition disabled:opacity-50 text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteLead}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition disabled:opacity-50 text-sm"
              >
                {deleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
