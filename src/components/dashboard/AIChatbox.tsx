'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { getCachedQuickSummary, setCachedQuickSummary } from '@/lib/quick-summary-cache'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIChatboxProps {
  user?: { full_name: string | null; email: string }
}

export default function AIChatbox({ user }: AIChatboxProps) {
  const [open, setOpen] = useState(false)
  const [quickAlerts, setQuickAlerts] = useState<string[]>([])
  const [priorite, setPriorite] = useState('')
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [typedLength, setTypedLength] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const streamingBufferRef = useRef('')

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg && messages.length === 0) return

    const userContent = msg || 'Synthèse'
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userContent }])
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])
    setLoading(true)
    setError(null)
    setTypedLength(0)
    streamingBufferRef.current = ''

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userContent }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Erreur API')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          streamingBufferRef.current += chunk
        }
      }
      const finalText = streamingBufferRef.current
      if (finalText === '') {
        setMessages((prev) => prev.slice(0, -1))
      } else {
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: finalText }
          return next
        })
      }
    } catch (err: any) {
      setError(err.message || 'Erreur')
      setMessages(prev => {
        const next = prev.slice(0, -1)
        return [...next, { role: 'assistant', content: `Erreur : ${err.message}` }]
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSynthesis = () => {
    if (loading) return
    sendMessage('Synthèse')
  }

  // À l'ouverture : message de bienvenue au lieu de charger la synthèse directement
  useEffect(() => {
    if (open && messages.length === 0 && !initialLoaded) {
      const prenom = user?.full_name?.split(' ')[0] || ''
      const welcome = prenom
        ? `Bonjour ${prenom} ! Comment puis-je t'aider ?`
        : 'Bonjour ! Comment puis-je t\'aider ?'
      setMessages([{ role: 'assistant', content: welcome }])
      setInitialLoaded(true)
    }
  }, [open, user?.full_name])

  // Fetch quick alerts + priorité du jour (avec cache pour éviter la boucle)
  useEffect(() => {
    const cached = getCachedQuickSummary() as { alerts?: string[]; priorite?: string } | null
    if (cached?.alerts || cached?.priorite !== undefined) {
      setQuickAlerts(cached.alerts || [])
      setPriorite(cached.priorite || '')
      return
    }
    let cancelled = false
    fetch('/api/ai/quick-summary')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setCachedQuickSummary(d)
        setQuickAlerts(d.alerts || [])
        setPriorite(d.priorite || '')
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Rotate alerts every 4s
  useEffect(() => {
    if (quickAlerts.length <= 1) return
    const t = setInterval(() => setCurrentAlertIndex((i) => (i + 1) % quickAlerts.length), 4000)
    return () => clearInterval(t)
  }, [quickAlerts.length])

  // Effet machine à écrire : affiche le message caractère par caractère
  useEffect(() => {
    if (!loading) return
    const t = setInterval(() => {
      const full = streamingBufferRef.current
      setTypedLength((prev) => {
        if (prev >= full.length) return prev
        const step = full.length - prev < 3 ? 1 : 2
        return Math.min(prev + step, full.length)
      })
    }, 35)
    return () => clearInterval(t)
  }, [loading])

  useEffect(() => {
    if (loading && streamingBufferRef.current) {
      const displayed = streamingBufferRef.current.slice(0, typedLength)
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: displayed }
        return next
      })
    }
  }, [typedLength, loading])

  const quickQuestions = [
    { label: '📊 Synthèse', msg: 'Synthèse du jour' },
    { label: '🔔 Relances ?', msg: 'Quels leads à relancer ? Détails et priorités' },
    { label: '✉️ Message relance', msg: 'Génère un message WhatsApp de relance pour un lead à relancer (utilise les noms du contexte)' },
    { label: '💰 CA du mois ?', msg: 'CA du mois et évolution' },
    { label: '📤 Facture ?', msg: 'Comment envoyer une facture ? Étapes avec /dashboard/gestion' },
    { label: '📋 Export compta ?', msg: 'Comment exporter la comptabilité ? /dashboard/comptabilite' },
  ]

  const renderContentWithLinks = (text: string) => {
    const parts: (string | JSX.Element)[] = []
    let lastIndex = 0
    const linkRegex = /(\/dashboard(?:\/[a-z-]+)?)/g
    let match
    while ((match = linkRegex.exec(text)) !== null) {
      parts.push(text.slice(lastIndex, match.index))
      const path = match[1]
      const label = path === '/dashboard' ? 'Dashboard' : path.split('/').pop()?.replace(/-/g, ' ') || path
      parts.push(
        <Link key={match.index} href={path} className="text-violet-300 underline hover:text-violet-200" onClick={() => setOpen(false)}>
          {label}
        </Link>
      )
      lastIndex = match.index + path.length
    }
    parts.push(text.slice(lastIndex))
    return parts
  }

  const prenom = user?.full_name?.split(' ')[0] || ''
  const greeting = prenom ? `Bonjour ${prenom} !` : 'Bonjour !'
  const currentAlert = priorite || quickAlerts[currentAlertIndex] || quickAlerts[0] || 'Clique pour la synthèse'
  const hasContent = greeting || quickAlerts.length > 0

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Messages visibles sans ouvrir le popup */}
      {hasContent && (
        <button
          onClick={() => setOpen(true)}
          className="group flex max-w-[280px] flex-col items-end rounded-xl border border-white/10 bg-[#1e1e1e]/95 px-4 py-2.5 text-right shadow-lg backdrop-blur-sm transition hover:border-violet-500/30 hover:bg-[#252525]"
        >
          {greeting && <span className="text-sm font-medium text-white">{greeting}</span>}
          <span className="mt-0.5 text-xs text-white/70 group-hover:text-violet-300">
            {currentAlert}
            {quickAlerts.length > 1 && (
              <span className="ml-1 text-white/40">({currentAlertIndex + 1}/{quickAlerts.length})</span>
            )}
          </span>
        </button>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-500/30 transition hover:scale-105 hover:shadow-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
        aria-label="Assistant IA"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e1e] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <h3 className="font-semibold text-white">Assistant BPM</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Fermer"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div
            ref={scrollRef}
            className="max-h-[360px] overflow-y-auto p-4 space-y-4"
          >
            {messages.map((m, i) => {
              const isLastAssistant = i === messages.length - 1 && m.role === 'assistant'
              const showCursor = loading && isLastAssistant && typedLength < streamingBufferRef.current.length
              const canCopy = m.role === 'assistant' && m.content && !loading
              return (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} group/item`}
                >
                  <div className={`max-w-[90%] flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-xl px-4 py-2.5 text-sm ${
                        m.role === 'user'
                          ? 'bg-violet-600/80 text-white'
                          : 'bg-white/10 text-white/90 whitespace-pre-wrap'
                      }`}
                    >
                      {m.role === 'assistant' ? renderContentWithLinks(m.content) : m.content}
                      {showCursor && <span className="animate-pulse">▌</span>}
                    </div>
                    {canCopy && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(m.content)}
                        className="mt-1 text-[10px] text-white/40 hover:text-violet-400 opacity-0 group-hover/item:opacity-100 transition"
                      >
                        📋 Copier
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white/70">
                  Réflexion...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3">
            <p className="text-[10px] text-white/40 mb-2">Questions rapides</p>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {quickQuestions.map((q) => (
                <button
                  key={q.msg}
                  type="button"
                  onClick={() => sendMessage(q.msg)}
                  disabled={loading}
                  className="rounded-lg bg-white/5 py-2 px-2 text-xs font-medium text-white/80 hover:bg-violet-600/20 hover:text-violet-300 disabled:opacity-50 text-left truncate"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage()
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Poser une question..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                Envoyer
              </button>
            </form>
            {error && (
              <p className="mt-2 text-xs text-amber-400">
                {error.includes('Aucune clé API')
                  ? 'Configure GROQ_API_KEY (gratuit, console.groq.com) ou une autre clé dans .env'
                  : error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
