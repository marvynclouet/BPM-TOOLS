// Client Supabase avec secret key pour bypasser RLS
// À utiliser uniquement côté serveur pour les opérations admin

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Support des nouvelles clés (sb_secret_...) et anciennes (eyJ...)
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY manquant. URL: ${supabaseUrl ? 'OK' : 'MANQUANT'}, Key: ${secretKey ? 'OK' : 'MANQUANT'}`
    )
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
