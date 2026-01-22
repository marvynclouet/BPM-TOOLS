'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

interface CommentSummaryRowProps {
  leadId: string
  onViewAll: () => void
}

interface Comment {
  id: string
  comment: string
  created_at: string
  users: {
    full_name: string | null
    email: string
  } | null
}

export default function CommentSummaryRow({ leadId, onViewAll }: CommentSummaryRowProps) {
  const supabase = createClient()
  const [lastComment, setLastComment] = useState<Comment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLastComment()
  }, [leadId])

  const loadLastComment = async () => {
    const { data } = await supabase
      .from('lead_comments')
      .select('*, users:user_id(full_name, email)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setLastComment(data as Comment)
    }
    setLoading(false)
  }

  if (loading || !lastComment) return null

  const getUserName = (comment: Comment) => {
    return comment.users?.full_name || comment.users?.email || 'Utilisateur'
  }

  return (
    <tr className="bg-white/5 border-t border-white/10">
      <td colSpan={12} className="px-6 py-3">
        <div className="text-xs text-white/70 flex items-start gap-3">
          <span className="text-base">💬</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-white">
                {getUserName(lastComment)}
              </span>
              <span className="text-white/40 text-xs">
                {format(new Date(lastComment.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
              </span>
            </div>
            <p className="text-white/80 break-words">{lastComment.comment}</p>
          </div>
          <button
            onClick={onViewAll}
            className="text-blue-400 hover:text-blue-300 text-xs font-medium whitespace-nowrap flex-shrink-0"
          >
            Voir tout →
          </button>
        </div>
      </td>
    </tr>
  )
}
