'use client'

import { useEffect } from 'react'

/**
 * Composant qui vérifie et déclenche les relances automatiques
 * au chargement de la page Gestion
 */
export default function AutoRelanceChecker() {
  useEffect(() => {
    // Vérifier et déclencher les relances automatiques
    const checkAndSendRelances = async () => {
      try {
        const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET || 'auto-check'
        const response = await fetch('/api/gestion/auto-relance', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cronSecret}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.results && (data.results.relance1 > 0 || data.results.relance2 > 0 || data.results.relance3 > 0)) {
            console.log('Relances automatiques envoyées:', data.results)
            // Optionnel : afficher une notification
            // Vous pouvez utiliser une bibliothèque de notifications ici
          }
        }
      } catch (error) {
        // Erreur silencieuse - ne pas perturber l'utilisateur
        console.error('Erreur vérification relances automatiques:', error)
      }
    }

    // Vérifier une fois au chargement
    checkAndSendRelances()

    // Optionnel : vérifier toutes les heures
    const interval = setInterval(checkAndSendRelances, 60 * 60 * 1000) // 1 heure

    return () => clearInterval(interval)
  }, [])

  return null // Ce composant ne rend rien
}
