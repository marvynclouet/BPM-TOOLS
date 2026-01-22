'use client'

import { useState, useEffect } from 'react'
import { trackMetaEvent } from '@/components/tracking/MetaPixel'

export default function TestMetaPixelPage() {
  const [pixelId, setPixelId] = useState<string>('')
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [testResult, setTestResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const checkPixelConnection = async (pixelIdToCheck: string) => {
    setIsLoading(true)
    setTestResult('')
    setIsConnected(null)

    try {
      // Vérifier si fbq est disponible
      if (typeof window === 'undefined' || !window.fbq) {
        setIsConnected(false)
        setTestResult('❌ Le pixel Meta n\'est pas initialisé (fbq n\'existe pas)')
        setIsLoading(false)
        return
      }

      // Vérifier la connexion en testant un appel
      const testEvent = 'TestEvent_' + Date.now()
      
      // Déclencher un événement de test
      window.fbq('track', 'PageView')
      
      // Vérifier si le pixel est bien chargé
      const pixelLoaded = window.fbq.loaded === true
      
      if (pixelLoaded) {
        setIsConnected(true)
        setTestResult(`✅ Pixel Meta connecté avec succès!\n\nPixel ID: ${pixelIdToCheck}\nStatus: Initialisé et prêt\nfbq.loaded: ${window.fbq.loaded}`)
      } else {
        setIsConnected(false)
        setTestResult('⚠️ Pixel Meta détecté mais pas complètement initialisé')
      }

      // Test d'envoi d'événement personnalisé
      trackMetaEvent('TestConnection', {
        test: true,
        timestamp: new Date().toISOString(),
      })

      setTestResult(prev => prev + '\n\n✅ Événement de test envoyé: TestConnection')
    } catch (error: any) {
      setIsConnected(false)
      setTestResult(`❌ Erreur lors de la vérification: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Récupérer le Pixel ID depuis les variables d'environnement
    const envPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
    if (envPixelId) {
      setPixelId(envPixelId)
      // Attendre un peu pour que le pixel se charge
      setTimeout(() => {
        checkPixelConnection(envPixelId)
      }, 1000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleManualTest = () => {
    if (!pixelId) {
      setTestResult('❌ Veuillez entrer un Pixel ID')
      return
    }
    checkPixelConnection(pixelId)
  }

  const handleTestEvent = () => {
    if (typeof window !== 'undefined' && window.fbq) {
      trackMetaEvent('ManualTest', {
        source: 'test_page',
        timestamp: new Date().toISOString(),
      })
      setTestResult(prev => prev + '\n\n✅ Événement manuel envoyé: ManualTest')
    } else {
      setTestResult('❌ Le pixel Meta n\'est pas initialisé')
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-semibold mb-2">Test Pixel Meta</h1>
        <p className="text-white/50 mb-8 text-lg">
          Vérifiez si votre pixel Meta est correctement connecté
        </p>

        <div className="space-y-6">
          {/* Configuration */}
          <div className="apple-card rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white/70">
                  Pixel ID (depuis .env.local)
                </label>
                <input
                  type="text"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  placeholder="Ex: 123456789012345"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                />
                <p className="text-xs text-white/40 mt-2">
                  Variable d'environnement: NEXT_PUBLIC_META_PIXEL_ID
                </p>
              </div>
              <button
                onClick={handleManualTest}
                disabled={isLoading || !pixelId}
                className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Vérification...' : '🔍 Vérifier la connexion'}
              </button>
            </div>
          </div>

          {/* Résultat */}
          {testResult && (
            <div className={`apple-card rounded-2xl p-6 ${
              isConnected === true ? 'border-green-500/50' : 
              isConnected === false ? 'border-red-500/50' : 
              'border-white/10'
            }`}>
              <h2 className="text-2xl font-semibold mb-4">Résultat du test</h2>
              <div className="bg-black/20 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                {testResult}
              </div>
            </div>
          )}

          {/* Status */}
          {isConnected !== null && (
            <div className={`apple-card rounded-2xl p-6 ${
              isConnected ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{isConnected ? '✅' : '❌'}</span>
                <div>
                  <h3 className="text-xl font-semibold">
                    {isConnected ? 'Pixel Meta connecté' : 'Pixel Meta non connecté'}
                  </h3>
                  <p className="text-white/60 text-sm">
                    {isConnected 
                      ? 'Votre pixel est correctement initialisé et prêt à tracker les événements'
                      : 'Vérifiez votre configuration et redémarrez l&apos;application'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions de test */}
          <div className="apple-card rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Actions de test</h2>
            <div className="space-y-3">
              <button
                onClick={handleTestEvent}
                className="w-full px-6 py-3 bg-blue-500/20 text-blue-300 rounded-lg font-medium hover:bg-blue-500/30 transition border border-blue-500/30"
              >
                📤 Envoyer un événement de test
              </button>
              <p className="text-xs text-white/40">
                Envoie un événement &quot;ManualTest&quot; pour vérifier que les événements sont bien trackés dans Meta Events Manager
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="apple-card rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Instructions</h2>
            <ol className="space-y-2 text-white/70 list-decimal list-inside">
              <li>Ajoutez votre Pixel ID dans <code className="bg-white/10 px-2 py-1 rounded">.env.local</code> : <code className="bg-white/10 px-2 py-1 rounded">NEXT_PUBLIC_META_PIXEL_ID=votre_pixel_id</code></li>
              <li>Redémarrez l&apos;application : <code className="bg-white/10 px-2 py-1 rounded">npm run dev</code></li>
              <li>Visitez cette page et cliquez sur &quot;Vérifier la connexion&quot;</li>
              <li>Vérifiez dans Meta Events Manager que les événements apparaissent</li>
              <li>Testez le formulaire d&apos;inscription pour voir les conversions</li>
            </ol>
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>💡 Astuce:</strong> Utilisez l&apos;extension Chrome &quot;Facebook Pixel Helper&quot; pour vérifier le pixel en temps réel sur n&apos;importe quelle page.
              </p>
            </div>
          </div>

          {/* Informations techniques */}
          <div className="apple-card rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Informations techniques</h2>
            <div className="space-y-2 text-sm font-mono text-white/60">
              <div>
                <span className="text-white/40">window.fbq existe:</span>{' '}
                <span className={typeof window !== 'undefined' && window.fbq ? 'text-green-400' : 'text-red-400'}>
                  {typeof window !== 'undefined' && window.fbq ? 'Oui' : 'Non'}
                </span>
              </div>
              <div>
                <span className="text-white/40">window.fbq.loaded:</span>{' '}
                <span className={typeof window !== 'undefined' && window.fbq?.loaded ? 'text-green-400' : 'text-red-400'}>
                  {typeof window !== 'undefined' && window.fbq?.loaded ? 'true' : 'false'}
                </span>
              </div>
              <div>
                <span className="text-white/40">Pixel ID configuré:</span>{' '}
                <span className={pixelId ? 'text-green-400' : 'text-red-400'}>
                  {pixelId || 'Non configuré'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
