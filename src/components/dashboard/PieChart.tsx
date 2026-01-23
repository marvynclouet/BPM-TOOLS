'use client'

interface PieChartProps {
  data: { label: string; value: number; color?: string }[]
  title: string
}

export default function PieChart({ data, title }: PieChartProps) {
  // Filtrer les données avec valeur > 0
  const filteredData = data.filter(d => d.value > 0)
  
  if (filteredData.length === 0) {
    return (
      <div className="apple-card rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2 text-white tracking-tight">{title}</h3>
        <p className="text-white/40 text-center py-6 text-xs font-light">Aucune donnée</p>
      </div>
    )
  }

  const total = filteredData.reduce((sum, d) => sum + d.value, 0)
  
  // Calculer les angles pour le camembert
  let currentAngle = -90 // Commencer en haut (-90 degrés)
  const segments = filteredData.map((item, idx) => {
    const percentage = (item.value / total) * 100
    const angle = (item.value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    // Calculer les coordonnées pour le SVG path
    const radius = 80
    const centerX = 100
    const centerY = 100
    
    const startAngleRad = (startAngle * Math.PI) / 180
    const endAngleRad = (endAngle * Math.PI) / 180
    
    const x1 = centerX + radius * Math.cos(startAngleRad)
    const y1 = centerY + radius * Math.sin(startAngleRad)
    const x2 = centerX + radius * Math.cos(endAngleRad)
    const y2 = centerY + radius * Math.sin(endAngleRad)
    
    const largeArcFlag = angle > 180 ? 1 : 0
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ')

    return {
      ...item,
      pathData,
      percentage,
      startAngle,
      endAngle,
    }
  })

  const defaultColors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-green-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-pink-500',
  ]

  return (
    <div className="apple-card rounded-xl p-3 sm:p-4">
      <h3 className="text-xs sm:text-sm font-semibold mb-3 sm:mb-4 text-white tracking-tight">{title}</h3>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        {/* Camembert SVG */}
        <div className="flex-shrink-0">
          <svg width="100" height="100" viewBox="0 0 200 200" className="transform -rotate-90 sm:w-[120px] sm:h-[120px]">
            {segments.map((segment, idx) => {
              const color = segment.color || defaultColors[idx % defaultColors.length]
              const colorValue = color.replace('bg-', '').replace('-500', '')
              const fillColor = `var(--color-${colorValue})` || color
              
              // Convertir les classes Tailwind en couleurs réelles
              const colorMap: Record<string, string> = {
                'blue-500': '#3b82f6',
                'purple-500': '#a855f7',
                'orange-500': '#f97316',
                'green-500': '#22c55e',
                'red-500': '#ef4444',
                'yellow-500': '#eab308',
                'pink-500': '#ec4899',
              }
              
              const fill = colorMap[color.replace('bg-', '')] || '#3b82f6'
              
              return (
                <path
                  key={idx}
                  d={segment.pathData}
                  fill={fill}
                  className="transition-all duration-300 hover:opacity-80"
                  style={{ opacity: 0.8 }}
                />
              )
            })}
          </svg>
        </div>

        {/* Légende */}
        <div className="flex-1 space-y-2 sm:space-y-3 w-full sm:w-auto">
          {segments.map((segment, idx) => {
            const color = segment.color || defaultColors[idx % defaultColors.length]
            const colorMap: Record<string, string> = {
              'bg-blue-500': '#3b82f6',
              'bg-purple-500': '#a855f7',
              'bg-orange-500': '#f97316',
              'bg-green-500': '#22c55e',
              'bg-red-500': '#ef4444',
              'bg-yellow-500': '#eab308',
              'bg-pink-500': '#ec4899',
            }
            const fill = colorMap[color] || '#3b82f6'
            
            return (
              <div key={idx} className="flex items-center gap-2 py-1">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: fill, boxShadow: `0 0 6px ${fill}40` }}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/60 font-medium">{segment.label}</span>
                    <span className="text-xs font-semibold text-white">
                      {segment.value} <span className="text-white/40">({segment.percentage.toFixed(1)}%)</span>
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
