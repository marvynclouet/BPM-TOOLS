'use client'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

interface CloserStats {
  closer_id: string
  closer_name: string
  closer_email: string
  totalCA: number
  totalCommissions: number
  totalSales: number
  closedLeads: number
}

interface ClosersRankingProps {
  closersStats: CloserStats[]
  period: 'month' | 'all'
}

export default function ClosersRanking({ closersStats, period }: ClosersRankingProps) {
  // Trier par CA décroissant
  const sortedClosers = [...closersStats].sort((a, b) => b.totalCA - a.totalCA)

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return `#${rank}`
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/20 border-yellow-400/50'
      case 2:
        return 'bg-gray-400/20 border-gray-300/50'
      case 3:
        return 'bg-orange-500/20 border-orange-400/50'
      default:
        return 'bg-white/5 border-white/10'
    }
  }

  if (sortedClosers.length === 0) {
    return (
      <div className="apple-card rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">
          {period === 'month' ? '🏆 Classement du mois' : '🏆 Classement général'}
        </h2>
        <p className="text-white/50 text-sm">Aucune vente enregistrée pour le moment</p>
      </div>
    )
  }

  return (
    <div className="apple-card rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-semibold">
          {period === 'month' ? '🏆 Classement du mois' : '🏆 Classement général'}
        </h2>
        <span className="text-[10px] sm:text-xs text-white/40">
          {format(new Date(), 'MMMM yyyy', { locale: fr })}
        </span>
      </div>

      <div className="space-y-2">
        {sortedClosers.map((closer, index) => {
          const rank = index + 1
          return (
            <div
              key={closer.closer_id}
              className={`rounded-lg p-4 border transition-all hover:scale-[1.02] ${getRankColor(rank)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-2xl font-bold flex-shrink-0">
                    {getRankEmoji(rank)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">
                      {closer.closer_name || closer.closer_email || 'Closer inconnu'}
                    </div>
                    <div className="text-xs text-white/50 mt-0.5">
                      {closer.totalSales} vente{closer.totalSales > 1 ? 's' : ''} • {closer.closedLeads} closé{closer.closedLeads > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-lg font-bold text-white">
                    {closer.totalCA.toFixed(2)} €
                  </div>
                  <div className="text-xs text-green-400 font-medium">
                    {closer.totalCommissions.toFixed(2)} € commissions
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
