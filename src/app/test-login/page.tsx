'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestLoginPage() {
  const [status, setStatus] = useState<string>('Chargement...')
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      setStatus('❌ Pas connecté dans Supabase Auth')
      return
    }

    setStatus('✅ Connecté dans Supabase Auth')
    setUser(authUser)

    // Vérifier dans public.users
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error) {
      setStatus(`❌ Erreur: ${error.message}`)
      return
    }

    if (userData) {
      setStatus(`✅ OK - Utilisateur trouvé dans public.users avec rôle: ${userData.role}`)
    } else {
      setStatus('❌ Utilisateur non trouvé dans public.users')
    }
  }

  const handleLogin = async () => {
    const email = prompt('Email:')
    const password = prompt('Password:')
    
    if (!email || !password) return

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setStatus(`❌ Erreur login: ${error.message}`)
      return
    }

    if (data?.user) {
      setStatus('✅ Login réussi !')
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test de connexion</h1>
        
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <p className="text-lg mb-4">{status}</p>
          {user && (
            <div className="text-sm text-white/70">
              <p>Email: {user.email}</p>
              <p>ID: {user.id}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={checkAuth}
            className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
          >
            Vérifier l'auth
          </button>
          
          <button
            onClick={handleLogin}
            className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 block"
          >
            Se connecter (test)
          </button>

          <a
            href="/dashboard"
            className="px-4 py-2 bg-purple-500 rounded hover:bg-purple-600 inline-block"
          >
            Aller au dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
