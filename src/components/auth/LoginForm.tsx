'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_CREDENTIALS } from '@/lib/demo-data'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

  const handleDemoLogin = async () => {
    if (!isDemoMode) return
    setDemoLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: DEMO_CREDENTIALS.email, password: DEMO_CREDENTIALS.password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        window.location.href = '/dashboard'
        return
      }
      setError(data.error || 'Erreur démo')
    } catch (err: any) {
      setError(err.message || 'Erreur inattendue')
    } finally {
      setDemoLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isDemoMode && email.trim().toLowerCase() === 'demo@bpm-tools-demo.fr' && password === 'Demo123!') {
        const res = await fetch('/api/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.success) {
          window.location.href = '/dashboard'
          return
        }
        setError(data.error || 'Erreur démo')
        setLoading(false)
        return
      }

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        setError(loginError.message)
        setLoading(false)
        return
      }

      if (data?.user && data?.session) {
        console.log('✅ Connexion réussie, session créée')
        
        // Attendre que les cookies soient bien enregistrés
        // Supabase SSR a besoin d'un peu de temps pour synchroniser
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Vérifier que la session est bien là
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Erreur session:', sessionError)
          setError('Erreur de session: ' + sessionError.message)
          setLoading(false)
          return
        }
        
        if (session) {
          console.log('✅ Session vérifiée, redirection vers dashboard')
          // Supprimer le cookie démo pour ne pas être pris pour la démo en prod
          await fetch('/api/demo-logout', { method: 'POST' })
          window.location.href = '/dashboard'
        } else {
          console.error('❌ Pas de session après connexion')
          setError('Session non créée. Réessayez.')
          setLoading(false)
        }
      } else {
        setError('Erreur lors de la connexion - pas de session')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('❌ Erreur login:', err)
      setError(err.message || 'Erreur inattendue')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-5 py-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-5 py-4 apple-card rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-base"
          placeholder="votre@email.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-2">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-5 py-4 apple-card rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-base"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black py-4 rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-base"
      >
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>

      {isDemoMode && (
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/20" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#1a1a1a] px-3 text-white/50">ou</span>
          </div>
        </div>
      )}

      {isDemoMode && (
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={demoLoading || loading}
          className="w-full py-4 rounded-xl font-semibold transition-all border-2 border-amber-400/50 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/70 disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2"
        >
          {demoLoading ? (
            'Connexion...'
          ) : (
            <>
              <span aria-hidden>🎮</span>
              Essayer la démo
            </>
          )}
        </button>
      )}
    </form>
  )
}
