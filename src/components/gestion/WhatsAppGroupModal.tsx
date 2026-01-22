'use client'

import { useState } from 'react'

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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 border border-white/20 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="flex justify-between items-center p-6 border-b border-white/10 flex-shrink-0">
          <h2 className="text-2xl font-semibold text-white">📱 Créer un groupe WhatsApp</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Contenu */}
        <div className="overflow-y-auto flex-1 p-6">
          {step === 'instructions' && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-blue-300 font-medium mb-2">Élève concerné :</p>
                <p className="text-white font-semibold">{lead.first_name} {lead.last_name}</p>
                <p className="text-white/60 text-sm">{lead.phone}</p>
              </div>

              <div className="space-y-3">
                <p className="text-white/70 text-sm">
                  Un groupe WhatsApp sera créé avec un message de résumé incluant :
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/60 text-sm ml-2">
                  <li>Les informations de la formation</li>
                  <li>Les dates de formation</li>
                  <li>Le prix et l'acompte</li>
                  <li>Un lien de paiement Stripe</li>
                </ul>
              </div>

            </div>
          )}

          {step === 'creating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-pulse-soft mb-4">
                <span className="text-6xl">📱</span>
              </div>
              <p className="text-white/70 text-center">Création du groupe WhatsApp...</p>
            </div>
          )}

          {step === 'success' && result && (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <span className="text-4xl mb-2 block">✅</span>
                <p className="text-green-300 font-semibold mb-1">
                  {result.method === 'api' 
                    ? 'Groupe créé avec succès !' 
                    : 'Instructions générées !'}
                </p>
              </div>

              {result.method === 'api' ? (
                <div className="space-y-3">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/50 mb-2">Lien d'invitation :</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={result.whatsappUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                      />
                      <button
                        onClick={copyInviteLink}
                        className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                  <p className="text-white/60 text-xs text-center">
                    Le message a été envoyé à l&apos;élève avec le lien d&apos;invitation.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-white/70 text-sm">
                    WhatsApp va s&apos;ouvrir avec les instructions. Suivez les étapes pour créer le groupe manuellement.
                  </p>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/50 mb-2">Lien WhatsApp :</p>
                    <button
                      onClick={() => window.open(result.whatsappUrl, '_blank')}
                      className="w-full px-4 py-3 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium hover:bg-green-500/30 transition"
                    >
                      Ouvrir WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="flex justify-end gap-3 p-6 border-t border-white/10 flex-shrink-0">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition disabled:opacity-50"
            >
              Annuler
            </button>
            {step === 'instructions' && (
              <button
                onClick={handleCreateGroup}
                disabled={loading}
                className="px-6 py-2 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition disabled:opacity-50"
              >
                Créer le groupe
              </button>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="flex justify-end gap-3 p-6 border-t border-white/10 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
