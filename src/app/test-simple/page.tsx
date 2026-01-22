'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function TestSimplePage() {
  const router = useRouter()
  const [status, setStatus] = useState('Chargement...')
  const [authUser, setAuthUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          setError(`Erreur Auth: ${authError.message}`)
          setStatus('❌ Erreur')
          return
        }

        if (!user) {
          setStatus('❌ Pas connecté')
          return
        }

        setAuthUser(user)
        setStatus('✅ Connecté')
      } catch (err: any) {
        setError(err.message)
        setStatus('❌ Erreur')
      }
    }
    check()
  }, [])

  const handleLogin = async () => {
    const supabase = createClient()
    const password = prompt('Mot de passe?') || ''
    
    if (!password) return
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'clouetmarvyn@gmail.com',
      password,
    })

    if (error) {
      setError(error.message)
    } else if (data.user) {
      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 300))
      window.location.reload()
    }
  }

  const handleRedirect = async () => {
    // Attendre un peu pour que les cookies se synchronisent
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Essayer router.push d'abord
    router.push('/dashboard')
    router.refresh()
    
    // Fallback après 2 secondes
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Test Ultra Simple</h1>
      
      <div className="space-y-4">
        <div>
          <strong>Statut:</strong> {status}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 p-4 rounded">
            <strong>Erreur:</strong> {error}
          </div>
        )}

        {authUser && (
          <div className="bg-green-500/20 border border-green-500 p-4 rounded">
            <strong>✅ Utilisateur connecté:</strong>
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify({ id: authUser.id, email: authUser.email }, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleLogin}
            className="px-4 py-2 bg-white text-black rounded hover:bg-white/90"
          >
            Se connecter
          </button>
          
          {authUser && (
            <button
              onClick={handleRedirect}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Aller au Dashboard (avec retry)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
