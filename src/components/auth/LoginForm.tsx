'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
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
          // Forcer un refresh complet pour synchroniser avec le serveur
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
    </form>
  )
}
