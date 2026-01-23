'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface WhatsAppGroupModalProps {
  lead: {
    id: string
    first_name: string
    last_name: string
    phone: string
  }
  onClose: () => void
  onSuccess: (data: { whatsappUrl: string; method: string; groupId?: string }) => void
}

export default function WhatsAppGroupModal({ lead, onClose, onSuccess }: WhatsAppGroupModalProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'instructions' | 'creating' | 'success'>('instructions')
  const [result, setResult] = useState<{ whatsappUrl: string; method: string; groupId?: string } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handleCreateGroup = async () => {
    setLoading(true)
    setStep('creating')
    
    try {
      const response = await fetch('/api/gestion/create-whatsapp-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la création du groupe')
      }

      const data = await response.json()
      setResult(data)
      setStep('success')
      onSuccess(data)
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
      setStep('instructions')
    } finally {
      setLoading(false)
    }
  }

  const copyInviteLink = () => {
    if (result?.whatsappUrl) {
      navigator.clipboard.writeText(result.whatsappUrl)
      alert('Lien copié dans le presse-papier !')
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="w-full h-full bg-[#1a1a1a] flex flex-col">
        {/* En-tête */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-white/20 flex-shrink-0 bg-[#1a1a1a]">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white pr-2 sm:pr-4 truncate">💬 Conversation WhatsApp</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-white text-3xl sm:text-4xl flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full hover:bg-white/20 transition font-light"
          >
            ×
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 lg:p-8 min-h-0 bg-[#1a1a1a]">
          {step === 'instructions' && (
            <div className="space-y-3 sm:space-y-4 max-w-2xl mx-auto w-full">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-blue-300 font-medium mb-1.5 sm:mb-2">Élève concerné :</p>
                <p className="text-white text-sm sm:text-base font-semibold">{lead.first_name} {lead.last_name}</p>
                <p className="text-white/60 text-xs sm:text-sm">{lead.phone}</p>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <p className="text-white/70 text-xs sm:text-sm">
                  Une conversation WhatsApp sera ouverte avec un message de résumé incluant :
                </p>
                <p className="text-white/50 text-[10px] sm:text-xs mt-2">
                  💡 Le message sera pré-rempli dans WhatsApp, il suffit de cliquer sur &quot;Envoyer&quot;.
                </p>
                <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 text-white/60 text-xs sm:text-sm ml-2">
                  <li>Les informations de la formation</li>
                  <li>Les dates de formation</li>
                  <li>Le prix et l&apos;acompte</li>
                  <li>Un lien de paiement Stripe</li>
                </ul>
              </div>

            </div>
          )}

          {step === 'creating' && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20">
              <div className="animate-pulse-soft mb-4 sm:mb-6">
                <span className="text-6xl sm:text-8xl">💬</span>
              </div>
              <p className="text-white text-base sm:text-lg lg:text-xl font-medium text-center px-4">Préparation de la conversation WhatsApp...</p>
            </div>
          )}

          {step === 'success' && result && (
            <div className="space-y-6 max-w-2xl mx-auto w-full">
              <div className="bg-green-500/20 border-2 border-green-500/40 rounded-2xl p-6 text-center">
                <span className="text-6xl mb-4 block">✅</span>
                <p className="text-green-300 text-2xl font-bold mb-2">
                  Conversation WhatsApp prête !
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-white text-lg text-center font-medium">
                  Cliquez sur le bouton ci-dessous pour ouvrir une conversation WhatsApp avec {lead.first_name} {lead.last_name} et lui envoyer le message de résumé.
                </p>
                <div className="bg-white/5 rounded-2xl p-6 space-y-4 border border-white/10">
                  <p className="text-sm text-white/60 mb-2 font-medium">Lien de conversation WhatsApp :</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={result.whatsappUrl}
                      readOnly
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-base"
                    />
                    <button
                      onClick={copyInviteLink}
                      className="px-6 py-3 bg-blue-500/30 text-blue-200 rounded-xl text-base font-semibold hover:bg-blue-500/40 transition border border-blue-500/30"
                    >
                      Copier
                    </button>
                  </div>
                  <a
                    href={result.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-8 py-4 bg-green-500/30 text-green-200 rounded-xl text-center text-lg font-bold hover:bg-green-500/40 transition border-2 border-green-500/40 shadow-lg"
                  >
                    💬 Ouvrir la conversation WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 p-4 sm:p-6 lg:p-8 border-t-2 border-white/20 flex-shrink-0 bg-[#1a1a1a]">
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white text-sm sm:text-base font-semibold hover:bg-white/20 transition disabled:opacity-50"
            >
              Annuler
            </button>
            {step === 'instructions' && (
              <button
                onClick={handleCreateGroup}
                disabled={loading}
                className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-green-500 text-white rounded-xl text-sm sm:text-base font-bold hover:bg-green-600 transition disabled:opacity-50 shadow-lg"
              >
                Préparer la conversation
              </button>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="flex justify-end gap-3 sm:gap-4 p-4 sm:p-6 lg:p-8 border-t-2 border-white/20 flex-shrink-0 bg-[#1a1a1a]">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-black rounded-xl text-sm sm:text-base font-bold hover:bg-white/90 transition shadow-lg"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (!mounted) return null

  return createPortal(modalContent, document.body)
}
