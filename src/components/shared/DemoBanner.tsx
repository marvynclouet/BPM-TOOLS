'use client'

export default function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null

  return (
    <div className="bg-amber-500/20 border-b border-amber-400/40 text-amber-200 text-center py-2 px-4 text-sm font-medium">
      🎭 Démo portfolio — données fictives. Navigation libre pour découvrir l’outil.
    </div>
  )
}
