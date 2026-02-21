'use client'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import Link from 'next/link'

export interface RecentComment {
  id: string
  comment: string
  created_at: string
  lead_id: string
  lead: {
    first_name: string
    last_name: string
  }
  user: {
    full_name: string | null
    email: string
  }
}

interface RecentCommentsProps {
  comments: RecentComment[]
}

export default function RecentComments({ comments }: RecentCommentsProps) {
  const getAuthorName = (c: RecentComment) =>
    c.user?.full_name || c.user?.email || 'Utilisateur'

  return (
    <div className="apple-card rounded-xl p-3 sm:p-4">
      <div className="flex justify-between items-center mb-2 sm:mb-3">
        <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">
          💬 Derniers commentaires
        </h3>
        <Link
          href="/dashboard/crm"
          className="text-[10px] sm:text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
        >
          Voir CRM →
        </Link>
      </div>
      <div className="space-y-2 sm:space-y-3 max-h-[220px] sm:max-h-[260px] overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-white/40 text-center py-4 text-xs font-light">
            Aucun commentaire récent
          </p>
        ) : (
          comments.map((c) => (
            <Link
              key={c.id}
              href="/dashboard/crm"
              className="block apple-card-hover rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="font-semibold text-white text-sm">
                  {c.lead?.first_name} {c.lead?.last_name}
                </span>
                <span className="text-[10px] text-white/50 flex-shrink-0">
                  {format(new Date(c.created_at), 'dd MMM à HH:mm', { locale: fr })}
                </span>
              </div>
              <p className="text-white/70 text-xs line-clamp-2 mb-2">
                {c.comment}
              </p>
              <span className="text-[10px] text-white/50">
                par {getAuthorName(c)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
