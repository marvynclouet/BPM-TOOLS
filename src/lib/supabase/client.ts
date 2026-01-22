'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variables d\'environnement Supabase manquantes. Veuillez configurer NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans votre fichier .env.local'
    )
  }

  // Configuration standard de Supabase SSR - laisse Supabase gérer les cookies automatiquement
  // Pas besoin de configuration manuelle, Supabase le fait pour nous
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
