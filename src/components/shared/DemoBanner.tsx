'use client'

interface DemoBannerProps {
  /** Afficher uniquement quand la session est vraiment en mode démo (pas en compte prod) */
  isDemoSession?: boolean
}

export default function DemoBanner({ isDemoSession }: DemoBannerProps) {
  if (!isDemoSession) return null

  return (
    <div className="bg-amber-500/20 border-b border-amber-400/40 text-amber-200 text-center py-2 px-4 text-sm font-medium">
      🎭 Démo portfolio — données fictives. Navigation libre pour découvrir l’outil.
    </div>
  )
}
