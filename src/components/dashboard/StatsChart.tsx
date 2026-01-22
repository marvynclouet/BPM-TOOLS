'use client'

interface StatsChartProps {
  data: { label: string; value: number; color?: string }[]
  title: string
}

export default function StatsChart({ data, title }: StatsChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">{item.label}</span>
              <span className="text-white font-medium">{item.value}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.color || 'bg-gradient-to-r from-purple-500 to-blue-500'
                }`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
