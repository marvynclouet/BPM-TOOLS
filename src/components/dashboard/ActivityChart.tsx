'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { format, subDays, eachDayOfInterval, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

interface ActivityChartProps {
  leads: {
    created_at: string
  }[]
  title?: string
}

export default function ActivityChart({ leads, title = "Activité des leads" }: ActivityChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; count: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Calculer les données pour les 30 derniers jours
  const chartData = useMemo(() => {
    const today = new Date()
    const thirtyDaysAgo = subDays(today, 30)
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today })

    // Grouper les leads par jour
    const leadsByDay = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const count = leads.filter(lead => {
        const leadDate = new Date(lead.created_at)
        return isSameDay(leadDate, day)
      }).length

      return {
        date: day,
        dateStr: dayStr,
        count,
        label: format(day, 'dd MMM', { locale: fr }),
      }
    })

    return leadsByDay
  }, [leads])

  const maxCount = Math.max(...chartData.map(d => d.count), 1)
  const chartHeight = 100

  const handlePointHover = (e: React.MouseEvent<SVGCircleElement>, data: typeof chartData[0]) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect()
      setTooltip({
        x: e.clientX - rect.left + 10,
        y: e.clientY - rect.top - 40,
        date: data.label,
        count: data.count,
      })
    }
  }

  const handlePointLeave = () => {
    setTooltip(null)
  }

  return (
    <div className="apple-card rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-4 text-white tracking-tight">{title}</h3>
      
      {chartData.length === 0 ? (
        <p className="text-white/40 text-center py-6 text-xs font-light">Aucune donnée</p>
      ) : (
        <div className="relative">
          {/* SVG Graphique */}
          <svg 
            ref={svgRef}
            width="100%" 
            height={chartHeight} 
            className="overflow-visible"
            viewBox={`0 0 1000 ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
              </linearGradient>
            </defs>

            {/* Grille horizontale */}
            {[0, 1, 2, 3, 4].map((i) => {
              const y = (chartHeight / 4) * i
              return (
                <line
                  key={i}
                  x1="0"
                  y1={y}
                  x2="1000"
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                />
              )
            })}

            {/* Zone remplie sous la courbe */}
            <path
              d={`
                M 0 ${chartHeight}
                ${chartData.map((d, i) => {
                  const x = (i / (chartData.length - 1)) * 1000
                  const y = chartHeight - (d.count / maxCount) * chartHeight
                  return `L ${x} ${y}`
                }).join(' ')}
                L 1000 ${chartHeight}
                Z
              `}
              fill="url(#lineGradient)"
            />

            {/* Ligne de la courbe */}
            <polyline
              points={chartData.map((d, i) => {
                const x = (i / (chartData.length - 1)) * 1000
                const y = chartHeight - (d.count / maxCount) * chartHeight
                return `${x},${y}`
              }).join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points interactifs */}
            {chartData.map((d, i) => {
              const x = (i / (chartData.length - 1)) * 1000
              const y = chartHeight - (d.count / maxCount) * chartHeight
              
              return (
                <g key={i}>
                  {/* Zone invisible pour le hover */}
                  <circle
                    cx={x}
                    cy={y}
                    r="12"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={(e) => handlePointHover(e, d)}
                    onMouseLeave={handlePointLeave}
                  />
                  {/* Point visible */}
                  <circle
                    cx={x}
                    cy={y}
                    r="3"
                    fill="#3b82f6"
                    className="pointer-events-none"
                  />
                </g>
              )
            })}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-xs pointer-events-none z-10 shadow-lg"
              style={{
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
              }}
            >
              <div className="text-white font-semibold">{tooltip.date}</div>
              <div className="text-blue-400">{tooltip.count} lead{tooltip.count !== 1 ? 's' : ''}</div>
            </div>
          )}

          {/* Labels des jours (tous les 5 jours) */}
          <div className="flex justify-between mt-2 text-[10px] text-white/40">
            {chartData.filter((_, i) => i % 5 === 0 || i === chartData.length - 1).map((d, i) => (
              <span key={i} className="truncate">{d.label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
