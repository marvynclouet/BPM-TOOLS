'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

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

interface CommentModalProps {
  leadId: string
  currentComment: string | null // Ancien champ unique, pour compatibilité
  onClose: () => void
  onSave: () => void
  currentUserId: string | null
  currentUserName: string | null
}

export default function CommentModal({
  leadId,
  currentComment,
  onClose,
  onSave,
  currentUserId,
  currentUserName,
}: CommentModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)

  useEffect(() => {
    loadComments()
  }, [leadId])

  const loadComments = async () => {
    setLoadingComments(true)
    const { data, error } = await supabase
      .from('lead_comments')
      .select('*, users:user_id(full_name, email)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setComments(data as Comment[])
    }
    setLoadingComments(false)
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUserId) {
      alert('Veuillez saisir un commentaire')
      return
    }

    setLoading(true)
    const { error } = await supabase
      .from('lead_comments')
      .insert({
        lead_id: leadId,
        user_id: currentUserId,
        comment: newComment.trim(),
      })

    if (!error) {
      setNewComment('')
      await loadComments()
      onSave()
      router.refresh()
    } else {
      alert('Erreur lors de l\'ajout du commentaire: ' + error.message)
    }
    setLoading(false)
  }

  const getUserName = (comment: Comment) => {
    return comment.users?.full_name || comment.users?.email || 'Utilisateur inconnu'
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white/10 border border-white/20 rounded-lg p-4 sm:p-6 w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white pr-2">💬 Commentaires</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl sm:text-3xl flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Liste des commentaires */}
        <div className="flex-1 overflow-y-auto mb-3 sm:mb-4 space-y-3 sm:space-y-4 min-h-[200px] sm:min-h-[300px]">
          {loadingComments ? (
            <div className="text-center text-white/50 py-8">Chargement...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-white/50 py-8">Aucun commentaire pour le moment</div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-1 sm:gap-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="font-semibold text-white text-sm sm:text-base">
                      {getUserName(comment)}
                    </span>
                    <span className="text-xs text-white/50 hidden sm:inline">•</span>
                    <span className="text-xs text-white/50">
                      {format(new Date(comment.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                </div>
                <p className="text-white/80 whitespace-pre-wrap break-words text-sm sm:text-base">
                  {comment.comment}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Formulaire nouveau commentaire */}
        <div className="border-t border-white/10 pt-3 sm:pt-4">
          <div className="mb-2 sm:mb-3">
            <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 text-white/70">
              Nouveau commentaire
            </label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleAddComment()
                }
              }}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-white/50 resize-none"
              placeholder={`Ajoutez un commentaire... (${currentUserName || 'Vous'})`}
              rows={3}
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
            <span className="text-[10px] sm:text-xs text-white/50">
              Appuyez sur Cmd/Ctrl + Entrée pour enregistrer
            </span>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-white/10 border border-white/20 rounded text-xs sm:text-sm text-white hover:bg-white/20 transition disabled:opacity-50"
              >
                Fermer
              </button>
              <button
                onClick={handleAddComment}
                disabled={loading || !newComment.trim()}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-white text-black rounded text-xs sm:text-sm font-medium hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
