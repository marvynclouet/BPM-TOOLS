import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'

export default async function DebugPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let adminClientError = null
  let userData = null
  let getCurrentUserResult = null

  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('users')
      .select('*')
      .eq('id', authUser?.id || '')
      .single()
    
    if (error) {
      adminClientError = error.message
    } else {
      userData = data
    }
  } catch (error: any) {
    adminClientError = error.message
  }

  try {
    getCurrentUserResult = await getCurrentUser()
  } catch (error: any) {
    getCurrentUserResult = { error: error.message }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Debug - Diagnostic complet</h1>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">1. Variables d&apos;environnement</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>NEXT_PUBLIC_SUPABASE_URL:</strong>{' '}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Défini' : '❌ Manquant'}
            </div>
            <div>
              <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong>{' '}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Défini' : '❌ Manquant'}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && (
                <span className="text-white/50 ml-2">
                  (commence par: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...)
                </span>
              )}
            </div>
            <div>
              <strong>SUPABASE_SERVICE_ROLE_KEY:</strong>{' '}
              {process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Défini' : '❌ Manquant'}
              {process.env.SUPABASE_SERVICE_ROLE_KEY && (
                <span className="text-white/50 ml-2">
                  (commence par: {process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">2. Authentification Supabase Auth</h2>
          {authUser ? (
            <div className="space-y-2 text-sm">
              <div>✅ <strong>Connecté</strong></div>
              <div>Email: {authUser.email}</div>
              <div>ID: {authUser.id}</div>
            </div>
          ) : (
            <div className="text-red-400">❌ Pas connecté</div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">3. Client Admin (bypass RLS)</h2>
          {adminClientError ? (
            <div className="text-red-400">
              ❌ Erreur: {adminClientError}
            </div>
          ) : userData ? (
            <div className="space-y-2 text-sm">
              <div>✅ <strong>Données récupérées</strong></div>
              <div>Rôle: {userData.role}</div>
              <div>Nom: {userData.full_name || 'N/A'}</div>
            </div>
          ) : (
            <div className="text-yellow-400">⚠️ Aucune donnée</div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">4. getCurrentUser()</h2>
          {getCurrentUserResult ? (
            'error' in getCurrentUserResult ? (
              <div className="text-red-400">❌ Erreur: {getCurrentUserResult.error}</div>
            ) : (
              <div className="space-y-2 text-sm">
                <div>✅ <strong>Fonctionne</strong></div>
                <div>Email: {getCurrentUserResult.email}</div>
                <div>Rôle: {getCurrentUserResult.role}</div>
              </div>
            )
          ) : (
            <div className="text-red-400">❌ Retourne null</div>
          )}
        </div>

        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <p className="text-sm">
            <strong>Action :</strong> Regardez les erreurs ci-dessus et vérifiez les logs du serveur pour plus de détails.
          </p>
        </div>
      </div>
    </div>
  )
}
