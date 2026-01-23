'use client'

import { Lead, UserRole } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import CommentModal from './CommentModal'
import DatePicker from './DatePicker'

interface LeadRowProps {
  lead: Lead & { users?: { full_name: string | null; email: string } | null }
  currentUser: {
    id: string
    role: UserRole
    full_name?: string | null
    email?: string
  } | null
}

export default function LeadRow({ lead, currentUser }: LeadRowProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [commentsCount, setCommentsCount] = useState(0)
  const [editValues, setEditValues] = useState({
    first_name: lead.first_name,
    last_name: lead.last_name,
    phone: lead.phone,
    email: lead.email || '',
    formation: lead.formation,
    status: lead.status,
    price_fixed: lead.price_fixed,
    price_deposit: lead.price_deposit,
    formation_format: lead.formation_format,
    formation_day: lead.formation_day,
    formation_start_date: lead.formation_start_date,
    interest_level: lead.interest_level,
    source: lead.source || 'direct',
  })

  useEffect(() => {
    loadCommentsCount()
  }, [lead.id])

  const loadCommentsCount = async () => {
    const { count } = await supabase
      .from('lead_comments')
      .select('*', { count: 'exact', head: true })
      .eq('lead_id', lead.id)
    
    setCommentsCount(count || 0)
  }

  const statusLabels: Record<string, string> = {
    nouveau: '👶 Nouveau',
    chinois: '🇨🇳 Chinois',
    rats: '🐀 Rats',
    nrp: '📞 NRP',
    en_cours_de_closing: '👍 En cours de closing',
    acompte_en_cours: '💰 Acompte en cours',
    appele: '📞 Appelé',
    acompte_regle: '💰 Acompte réglé',
    clos: '✅ Closé',
    ko: '❌ KO',
  }

  const formationLabels: Record<string, string> = {
    inge_son: 'Ingé son',
    beatmaking: 'Beatmaking',
    autre: 'Autre',
  }

  const sourceLabels: Record<string, string> = {
    manuel: 'Manuel',
    direct: 'Direct',
    instagram: '📷 Instagram',
    tiktok: '🎵 TikTok',
    facebook: '📘 Facebook',
    google: '🔍 Google',
    youtube: '📺 YouTube',
    autre: 'Autre',
  }

  const statusColors: Record<string, string> = {
    nouveau: 'bg-blue-500/20 text-blue-300',
    chinois: 'bg-yellow-500/20 text-yellow-300',
    rats: 'bg-gray-500/20 text-gray-300',
    nrp: 'bg-orange-500/20 text-orange-300',
    en_cours_de_closing: 'bg-green-500/20 text-green-300',
    acompte_en_cours: 'bg-amber-500/20 text-amber-300',
    appele: 'bg-purple-500/20 text-purple-300',
    acompte_regle: 'bg-orange-500/20 text-orange-300',
    clos: 'bg-green-600/20 text-green-400',
    ko: 'bg-red-500/20 text-red-300',
  }

  // Couleurs de fond pour les lignes selon le statut
  const rowBgColors: Record<string, string> = {
    nouveau: 'bg-blue-500/5 hover:bg-blue-500/10',
    chinois: 'bg-yellow-500/5 hover:bg-yellow-500/10',
    rats: 'bg-gray-500/5 hover:bg-gray-500/10',
    nrp: 'bg-orange-500/5 hover:bg-orange-500/10',
    en_cours_de_closing: 'bg-green-500/5 hover:bg-green-500/10',
    acompte_en_cours: 'bg-amber-500/5 hover:bg-amber-500/10',
    appele: 'bg-purple-500/5 hover:bg-purple-500/10',
    acompte_regle: 'bg-orange-500/5 hover:bg-orange-500/10',
    clos: 'bg-green-500/10 hover:bg-green-500/15',
    ko: 'bg-red-500/5 hover:bg-red-500/10',
  }

  const handleFieldSave = async (field: string, value: any) => {
    if (!currentUser?.id) return
    
    setLoading(true)
    
    // Convertir les prix en nombre ou null
    let processedValue = value
    if (field === 'price_fixed' || field === 'price_deposit') {
      if (value === '' || value === null || value === undefined) {
        processedValue = null
      } else {
        const numValue = parseFloat(value)
        processedValue = isNaN(numValue) ? null : numValue
      }
    }
    
    // Si on change le statut vers acompte_regle ou clos, créer l'entrée comptable
    if (field === 'status' && (value === 'acompte_regle' || value === 'clos')) {
      try {
        // Vérifications préalables
        if (!lead.price_fixed) {
          alert('Le prix fixé doit être défini pour créer un paiement')
          setLoading(false)
          return
        }

        if (value === 'acompte_regle' && !lead.price_deposit) {
          alert('Le prix acompte doit être défini pour marquer l\'acompte comme réglé')
          setLoading(false)
          return
        }

        // Vérifier si un paiement existe déjà
        const { data: existingPayments } = await supabase
          .from('lead_payments')
          .select('amount, payment_type')
          .eq('lead_id', lead.id)

        const totalPaid = existingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

        // Déterminer le type de paiement
        let paymentType = 'complet'
        let paymentAmount = lead.price_fixed || 0
        let entryType = 'complet'
        let remainingAmount: number | null = null

        if (value === 'acompte_regle' && lead.price_deposit) {
          if (totalPaid > 0) {
            alert('Un paiement a déjà été effectué pour ce lead')
            setLoading(false)
            return
          }
          paymentType = 'acompte'
          paymentAmount = lead.price_deposit
          entryType = 'acompte'
          remainingAmount = (lead.price_fixed || 0) - lead.price_deposit
        } else if (value === 'clos') {
          if (lead.status === 'acompte_regle') {
            // C'est le solde après un acompte
            const remaining = (lead.price_fixed || 0) - totalPaid
            if (remaining <= 0) {
              alert('Le solde est déjà réglé')
              setLoading(false)
              return
            }
            paymentType = 'complet'
            paymentAmount = remaining
            entryType = 'solde'
            remainingAmount = 0
          } else {
            // Paiement complet d'un coup
            if (totalPaid > 0) {
              alert('Un paiement a déjà été effectué pour ce lead')
              setLoading(false)
              return
            }
            paymentAmount = lead.price_fixed || 0
            entryType = 'complet'
            remainingAmount = null
          }
        }

        if (paymentAmount > 0) {
          // Appeler l'API pour créer le paiement et l'entrée comptable
          const response = await fetch('/api/leads/mark-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadId: lead.id,
              paymentType: paymentType,
            }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Erreur lors de la création du paiement')
          }

          // Le statut sera mis à jour par l'API, donc on refresh
          router.refresh()
          setEditingField(null)
          setLoading(false)
          return
        }
      } catch (error: any) {
        alert('Erreur lors de la création du paiement: ' + error.message)
        setLoading(false)
        return
      }
    }
    
    // Pour les autres champs, mise à jour normale
    const updateData: any = {
      [field]: processedValue,
      closer_id: currentUser.id,
      last_action_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', lead.id)

    if (!error) {
      setEditingField(null)
      router.refresh()
    } else {
      alert('Erreur: ' + error.message)
    }
    setLoading(false)
  }

  const handleMarkAsAppele = async () => {
    if (!currentUser?.id) return
    
    setLoading(true)
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'appele',
        closer_id: currentUser.id,
        last_action_at: new Date().toISOString(),
      })
      .eq('id', lead.id)

    if (!error) {
      router.refresh()
    }
    setLoading(false)
  }

  const handleMarkAcompteRegle = async () => {
    if (!currentUser?.id || !lead.price_deposit) {
      alert('Prix acompte non défini')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/leads/mark-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          paymentType: 'acompte',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'enregistrement de l\'acompte')
      }

      router.refresh()
    } catch (error: any) {
      alert('Erreur: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkComplet = async () => {
    if (!currentUser?.id || !lead.price_fixed) {
      alert('Prix fixé non défini')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/leads/mark-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          paymentType: 'complet',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'enregistrement du paiement complet')
      }

      router.refresh()
    } catch (error: any) {
      alert('Erreur: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsKO = async () => {
    if (!currentUser?.id) return
    
    setLoading(true)
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'ko',
        closer_id: currentUser.id,
        last_action_at: new Date().toISOString(),
      })
      .eq('id', lead.id)

    if (!error) {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      {showCommentModal && (
        <CommentModal
          leadId={lead.id}
          currentComment={lead.comment}
          onClose={() => {
            setShowCommentModal(false)
            loadCommentsCount()
          }}
          onSave={() => {
            router.refresh()
            loadCommentsCount()
          }}
          currentUserId={currentUser?.id || null}
          currentUserName={currentUser?.full_name || currentUser?.email || null}
        />
      )}
      <tr data-lead-id={lead.id} className={`transition-colors ${rowBgColors[lead.status] || 'hover:bg-white/5'}`}>
        <td className="px-2 sm:px-3 py-2 sm:py-3">
          <div className="space-y-0.5">
            {editingField === 'first_name' ? (
              <input
                type="text"
                value={editValues.first_name}
                onChange={(e) => setEditValues({ ...editValues, first_name: e.target.value })}
                onBlur={() => handleFieldSave('first_name', editValues.first_name.trim())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFieldSave('first_name', editValues.first_name.trim())
                  } else if (e.key === 'Escape') {
                    setEditValues({ ...editValues, first_name: lead.first_name })
                    setEditingField(null)
                  }
                }}
                autoFocus
                className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                placeholder="Prénom"
              />
            ) : (
              <div
                className="text-xs font-medium text-white cursor-pointer hover:text-blue-300 transition truncate"
                onClick={() => setEditingField('first_name')}
                title={lead.first_name}
              >
                {lead.first_name}
              </div>
            )}
            {editingField === 'last_name' ? (
              <input
                type="text"
                value={editValues.last_name}
                onChange={(e) => setEditValues({ ...editValues, last_name: e.target.value })}
                onBlur={() => handleFieldSave('last_name', editValues.last_name.trim())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFieldSave('last_name', editValues.last_name.trim())
                  } else if (e.key === 'Escape') {
                    setEditValues({ ...editValues, last_name: lead.last_name })
                    setEditingField(null)
                  }
                }}
                autoFocus
                className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                placeholder="Nom"
              />
            ) : (
              <div
                className="text-xs text-white/60 cursor-pointer hover:text-blue-300 transition truncate"
                onClick={() => setEditingField('last_name')}
                title={lead.last_name}
              >
                {lead.last_name}
              </div>
            )}
          </div>
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {editingField === 'phone' ? (
            <input
              type="tel"
              value={editValues.phone}
              onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
              onBlur={() => handleFieldSave('phone', editValues.phone.trim())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFieldSave('phone', editValues.phone.trim())
                } else if (e.key === 'Escape') {
                  setEditValues({ ...editValues, phone: lead.phone })
                  setEditingField(null)
                }
              }}
              autoFocus
              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
            />
          ) : (
            <div
              className="text-xs text-white/70 cursor-pointer hover:text-blue-300 transition truncate"
              onClick={() => setEditingField('phone')}
              title={lead.phone}
            >
              {lead.phone}
            </div>
          )}
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {editingField === 'email' ? (
            <input
              type="email"
              value={editValues.email}
              onChange={(e) => setEditValues({ ...editValues, email: e.target.value })}
              onBlur={() => handleFieldSave('email', editValues.email.trim())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFieldSave('email', editValues.email.trim())
                } else if (e.key === 'Escape') {
                  setEditValues({ ...editValues, email: lead.email || '' })
                  setEditingField(null)
                }
              }}
              autoFocus
              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
            />
          ) : (
            <div
              className="text-xs text-white/70 cursor-pointer hover:text-blue-300 transition truncate"
              onClick={() => setEditingField('email')}
              title={lead.email || ''}
            >
              {lead.email || '-'}
            </div>
          )}
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {editingField === 'formation' ? (
            <select
              value={editValues.formation}
              onChange={(e) => {
                const newValue = e.target.value as any
                setEditValues({ ...editValues, formation: newValue })
                handleFieldSave('formation', newValue)
                setEditingField(null)
              }}
              autoFocus
              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
            >
              <option value="inge_son">Ingé son</option>
              <option value="beatmaking">Beatmaking</option>
              <option value="autre">Autre</option>
            </select>
          ) : (
            <div
              className="text-xs text-white/70 cursor-pointer hover:text-blue-300 transition"
              onClick={() => setEditingField('formation')}
            >
              {formationLabels[lead.formation]}
            </div>
          )}
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {editingField === 'source' ? (
            <select
              value={editValues.source}
              onChange={(e) => {
                const newValue = e.target.value
                setEditValues({ ...editValues, source: newValue })
                handleFieldSave('source', newValue)
                setEditingField(null)
              }}
              autoFocus
              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
            >
              <option value="manuel">Manuel</option>
              <option value="direct">Direct</option>
              <option value="instagram">📷 Instagram</option>
              <option value="tiktok">🎵 TikTok</option>
              <option value="facebook">📘 Facebook</option>
              <option value="google">🔍 Google</option>
              <option value="youtube">📺 YouTube</option>
              <option value="autre">Autre</option>
            </select>
          ) : (
            <div
              className="text-xs text-white/70 cursor-pointer hover:text-blue-300 transition truncate"
              onClick={() => setEditingField('source')}
              title={sourceLabels[lead.source || 'direct'] || lead.source || 'Direct'}
            >
              {sourceLabels[lead.source || 'direct'] || lead.source || 'Direct'}
            </div>
          )}
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {editingField === 'formation_format' ? (
            <select
              value={editValues.formation_format || ''}
              onChange={(e) => {
                const newValue = e.target.value as any || null
                setEditValues({ ...editValues, formation_format: newValue, formation_day: newValue ? editValues.formation_day : null })
                handleFieldSave('formation_format', newValue)
                if (!newValue) {
                  handleFieldSave('formation_day', null)
                }
                setEditingField(null)
              }}
              autoFocus
              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
            >
              <option value="">-</option>
              <option value="semaine">Semaine</option>
              <option value="mensuelle">Mensuelle</option>
            </select>
          ) : (
            <div
              className="text-xs text-white/70 cursor-pointer hover:text-blue-300 transition"
              onClick={() => setEditingField('formation_format')}
            >
              {lead.formation_format ? (
                lead.formation_format === 'semaine' ? 'Semaine' : 
                lead.formation_format === 'mensuelle' ? 'Mensuelle' : 
                lead.formation_format === 'bpm_fast' ? '⚡ BPM Fast' : 
                lead.formation_format
              ) : '-'}
            </div>
          )}
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {editingField === 'formation_day' ? (
            <select
              value={editValues.formation_day || ''}
              onChange={(e) => {
                const newValue = e.target.value as any || null
                setEditValues({ ...editValues, formation_day: newValue })
                handleFieldSave('formation_day', newValue)
                setEditingField(null)
              }}
              autoFocus
              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
            >
              <option value="">-</option>
              {editValues.formation_format === 'semaine' ? (
                <>
                  <option value="lundi">Lundi</option>
                  <option value="mardi">Mardi</option>
                  <option value="mercredi">Mercredi</option>
                  <option value="jeudi">Jeudi</option>
                  <option value="vendredi">Vendredi</option>
                </>
              ) : editValues.formation_format === 'mensuelle' ? (
                <>
                  <option value="samedi">Samedi</option>
                  <option value="dimanche">Dimanche</option>
                </>
              ) : (
                <>
                  <option value="lundi">Lundi</option>
                  <option value="mardi">Mardi</option>
                  <option value="mercredi">Mercredi</option>
                  <option value="jeudi">Jeudi</option>
                  <option value="vendredi">Vendredi</option>
                  <option value="samedi">Samedi</option>
                  <option value="dimanche">Dimanche</option>
                </>
              )}
            </select>
          ) : (
            <div
              className="text-xs text-white/70 cursor-pointer hover:text-blue-300 transition"
              onClick={() => {
                if (lead.formation_format) {
                  setEditingField('formation_day')
                } else {
                  alert('Définissez d\'abord le format de formation')
                }
              }}
            >
              {lead.formation_day ? lead.formation_day.charAt(0).toUpperCase() + lead.formation_day.slice(1) : '-'}
            </div>
          )}
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {editingField === 'formation_start_date' ? (
            <div className="min-w-[200px]">
              <DatePicker
                value={editValues.formation_start_date}
                onChange={(date) => {
                  setEditValues({ ...editValues, formation_start_date: date })
                  if (date) {
                    handleFieldSave('formation_start_date', date)
                    setEditingField(null)
                  }
                }}
                formationFormat={editValues.formation_format}
                formationDay={editValues.formation_day}
              />
            </div>
          ) : (
            <div
              className="text-xs text-white/70 cursor-pointer hover:text-blue-300 transition"
              onClick={() => {
                if (lead.formation_format && lead.formation_day) {
                  setEditingField('formation_start_date')
                } else {
                  alert('Définissez d\'abord le format et le jour de formation')
                }
              }}
            >
              {lead.formation_start_date ? format(new Date(lead.formation_start_date), 'dd MMM yyyy', { locale: fr }) : '-'}
            </div>
          )}
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {editingField === 'status' ? (
            <select
              value={editValues.status}
              onChange={(e) => {
                const newValue = e.target.value as any
                setEditValues({ ...editValues, status: newValue })
                handleFieldSave('status', newValue)
                setEditingField(null)
              }}
              autoFocus
              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition ${
                statusColors[lead.status] || 'bg-gray-500/20 text-gray-300'
              }`}
              onClick={() => setEditingField('status')}
            >
              {statusLabels[lead.status]}
            </span>
          )}
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          <div className="text-xs text-white/70 truncate" title={lead.users?.full_name || lead.users?.email || 'Non assigné'}>
            {lead.users?.full_name || lead.users?.email || 'Non assigné'}
          </div>
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          <div className="text-xs text-white/70" title={format(new Date(lead.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}>
            {format(new Date(lead.created_at), 'dd MMM yyyy', { locale: fr })}
          </div>
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {editingField === 'price_fixed' ? (
            <input
              type="number"
              step="0.01"
              min="0"
              value={editValues.price_fixed ?? ''}
              onChange={(e) => setEditValues({ ...editValues, price_fixed: e.target.value ? parseFloat(e.target.value) : null })}
              onBlur={() => handleFieldSave('price_fixed', editValues.price_fixed)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFieldSave('price_fixed', editValues.price_fixed)
                } else if (e.key === 'Escape') {
                  setEditValues({ ...editValues, price_fixed: lead.price_fixed })
                  setEditingField(null)
                }
              }}
              autoFocus
              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
              placeholder="0.00"
            />
          ) : (
            <div
              className="text-xs text-white/70 cursor-pointer hover:text-blue-300 transition"
              onClick={() => setEditingField('price_fixed')}
            >
              {lead.price_fixed ? `${lead.price_fixed.toFixed(2)} €` : '-'}
            </div>
          )}
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {editingField === 'price_deposit' ? (
            <input
              type="number"
              step="0.01"
              min="0"
              value={editValues.price_deposit ?? ''}
              onChange={(e) => setEditValues({ ...editValues, price_deposit: e.target.value ? parseFloat(e.target.value) : null })}
              onBlur={() => handleFieldSave('price_deposit', editValues.price_deposit)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFieldSave('price_deposit', editValues.price_deposit)
                } else if (e.key === 'Escape') {
                  setEditValues({ ...editValues, price_deposit: lead.price_deposit })
                  setEditingField(null)
                }
              }}
              autoFocus
              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
              placeholder="0.00"
            />
          ) : (
            <div
              className="text-xs text-white/70 cursor-pointer hover:text-blue-300 transition"
              onClick={() => setEditingField('price_deposit')}
            >
              {lead.price_deposit ? `${lead.price_deposit.toFixed(2)} €` : '-'}
            </div>
          )}
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {editingField === 'interest_level' ? (
            <select
              value={editValues.interest_level || ''}
              onChange={(e) => {
                const newValue = e.target.value as any || null
                setEditValues({ ...editValues, interest_level: newValue })
                handleFieldSave('interest_level', newValue)
                setEditingField(null)
              }}
              autoFocus
              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
            >
              <option value="">-</option>
              <option value="froid">Froid</option>
              <option value="moyen">Moyen</option>
              <option value="chaud">Chaud</option>
            </select>
          ) : (
            <div
              className="text-xs text-white/70 cursor-pointer hover:text-blue-300 transition"
              onClick={() => setEditingField('interest_level')}
            >
              {lead.interest_level ? (
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  lead.interest_level === 'chaud' 
                    ? 'bg-red-500/20 text-red-300'
                    : lead.interest_level === 'moyen'
                    ? 'bg-orange-500/20 text-orange-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {lead.interest_level.charAt(0).toUpperCase() + lead.interest_level.slice(1)}
                </span>
              ) : (
                '-'
              )}
            </div>
          )}
        </td>
        <td className="px-3 py-3 whitespace-nowrap text-xs">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setShowCommentModal(true)}
              className={`px-2 py-1 rounded transition ${
                commentsCount > 0
                  ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                  : 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
              }`}
              title="Commentaires"
            >
              💬 {commentsCount > 0 && <span className="ml-0.5 text-xs">({commentsCount})</span>}
            </button>
            {lead.status === 'nouveau' ? (
              <button
                onClick={handleMarkAsAppele}
                disabled={loading}
                className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/30 transition disabled:opacity-50 text-xs"
              >
                Appelé
              </button>
            ) : null}
            {lead.status === 'appele' && lead.price_deposit ? (
              <button
                onClick={handleMarkAcompteRegle}
                disabled={loading}
                className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded hover:bg-orange-500/30 transition disabled:opacity-50 text-xs"
              >
                Acompte
              </button>
            ) : null}
            {lead.status === 'appele' && lead.price_fixed && !lead.price_deposit ? (
              <button
                onClick={handleMarkComplet}
                disabled={loading}
                className="px-2 py-1 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 transition disabled:opacity-50 text-xs"
              >
                Complet
              </button>
            ) : null}
            {lead.status === 'acompte_regle' && lead.price_fixed ? (
              <button
                onClick={handleMarkComplet}
                disabled={loading}
                className="px-2 py-1 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 transition disabled:opacity-50 text-xs"
              >
                Solde
              </button>
            ) : null}
            {lead.status !== 'ko' && lead.status !== 'clos' ? (
              <button
                onClick={handleMarkAsKO}
                disabled={loading}
                className="px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition disabled:opacity-50 text-xs"
              >
                KO
              </button>
            ) : null}
          </div>
        </td>
      </tr>
      {/* Commentaires cachés - accessible uniquement via le bouton 💬 */}
    </>
  )
}
