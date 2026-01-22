export default function SetupPage() {
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">BPM Tools - Configuration</h1>
          <p className="text-white/70">
            Configurez les variables d'environnement pour démarrer l'application
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-6">
          <h2 className="text-2xl font-semibold">Variables d'environnement</h2>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  hasSupabaseUrl ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <div>
                <div className="font-medium">NEXT_PUBLIC_SUPABASE_URL</div>
                <div className="text-sm text-white/50">
                  {hasSupabaseUrl
                    ? '✓ Configuré'
                    : '✗ Manquant - URL de votre projet Supabase'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  hasSupabaseKey ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <div>
                <div className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
                <div className="text-sm text-white/50">
                  {hasSupabaseKey
                    ? '✓ Configuré'
                    : '✗ Manquant - Clé anonyme de votre projet Supabase'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Instructions</h2>

          <div className="space-y-4 text-white/70">
            <div>
              <h3 className="font-semibold text-white mb-2">1. Créer le fichier .env.local</h3>
              <p className="text-sm">
                À la racine du projet, créez un fichier <code className="bg-white/10 px-2 py-1 rounded">.env.local</code>
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">2. Ajouter les variables</h3>
              <pre className="bg-black/50 p-4 rounded text-sm overflow-x-auto">
                {`# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (optionnel pour commencer)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google Calendar (optionnel)
GOOGLE_CALENDAR_CLIENT_ID=xxxxx
GOOGLE_CALENDAR_CLIENT_SECRET=xxxxx
GOOGLE_CALENDAR_REFRESH_TOKEN=xxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">3. Configurer Supabase</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm ml-4">
                <li>Créer un projet sur{' '}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    supabase.com
                  </a>
                </li>
                <li>Récupérer l'URL et la clé API dans Settings → API</li>
                <li>Exécuter la migration SQL depuis <code className="bg-white/10 px-1 rounded">supabase/migrations/001_initial_schema.sql</code></li>
                <li>Créer un bucket Storage nommé <code className="bg-white/10 px-1 rounded">documents</code></li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">4. Redémarrer le serveur</h3>
              <p className="text-sm">
                Après avoir créé/modifié le fichier <code className="bg-white/10 px-2 py-1 rounded">.env.local</code>, redémarrez le serveur de développement :
              </p>
              <pre className="bg-black/50 p-4 rounded text-sm mt-2">
                npm run dev
              </pre>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <p className="text-sm text-blue-300">
            💡 <strong>Astuce :</strong> Consultez le fichier <code className="bg-black/50 px-2 py-1 rounded">SETUP.md</code> pour un guide complet de configuration.
          </p>
        </div>
      </div>
    </div>
  )
}
