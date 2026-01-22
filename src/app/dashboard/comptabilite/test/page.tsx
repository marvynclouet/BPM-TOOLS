import { createAdminClient } from '@/lib/supabase/admin'

export default async function TestComptabilitePage() {
  const adminClient = createAdminClient()

  let results: any = {
    tablesExist: {},
    entriesCount: 0,
    entries: [],
    error: null,
  }

  try {
    // Vérifier si les tables existent
    const { data: entriesData, error: entriesError } = await adminClient
      .from('accounting_entries')
      .select('*')
      .limit(5)

    results.tablesExist.accounting_entries = !entriesError
    results.entriesCount = entriesData?.length || 0
    results.entries = entriesData || []
    results.error = entriesError

    // Vérifier leads avec statut
    const { data: leadsData, error: leadsError } = await adminClient
      .from('leads')
      .select('id, first_name, last_name, price_fixed, price_deposit, status')
      .limit(5)

    results.tablesExist.leads = !leadsError
    results.leads = leadsData || []
    
    // Vérifier le lead spécifique "Abde"
    const { data: abdeLead, error: abdeError } = await adminClient
      .from('leads')
      .select('*')
      .eq('id', '2c5f58c7-92fe-4c4d-9eb5-440ea20a1651')
      .single()
    
    results.abdeLead = abdeLead
    results.abdeError = abdeError?.message
    
    // Vérifier s'il y a déjà des paiements pour ce lead
    const { data: abdePayments, error: abdePaymentsError } = await adminClient
      .from('lead_payments')
      .select('*')
      .eq('lead_id', '2c5f58c7-92fe-4c4d-9eb5-440ea20a1651')
    
    results.abdePayments = abdePayments || []
    results.abdePaymentsError = abdePaymentsError?.message

    // Vérifier payments
    const { data: paymentsData, error: paymentsError } = await adminClient
      .from('lead_payments')
      .select('*')
      .limit(5)

    results.tablesExist.lead_payments = !paymentsError
    results.payments = paymentsData || []

  } catch (err: any) {
    results.error = err.message
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Test Comptabilité</h1>
      
      <div className="space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Tables existantes</h2>
          <pre className="text-sm text-white/70">
            {JSON.stringify(results.tablesExist, null, 2)}
          </pre>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Erreur</h2>
          <pre className="text-sm text-red-300">
            {results.error ? JSON.stringify(results.error, null, 2) : 'Aucune erreur'}
          </pre>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Comptage</h2>
          <p className="text-white/70">
            Entrées comptables: <strong className="text-white">{results.entriesCount}</strong>
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Entrées comptables (5 premières)</h2>
          <pre className="text-sm text-white/70 overflow-auto">
            {JSON.stringify(results.entries, null, 2)}
          </pre>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Leads (5 premiers)</h2>
          <pre className="text-sm text-white/70 overflow-auto">
            {JSON.stringify(results.leads, null, 2)}
          </pre>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Paiements (5 premiers)</h2>
          <pre className="text-sm text-white/70 overflow-auto">
            {JSON.stringify(results.payments, null, 2)}
          </pre>
        </div>

        {results.abdeLead && (
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-2">Lead Abde CLouet (pour test)</h2>
            <pre className="text-sm text-white/70 overflow-auto">
              {JSON.stringify(results.abdeLead, null, 2)}
            </pre>
            {results.abdeError && (
              <p className="text-red-300 text-sm mt-2">Erreur: {results.abdeError}</p>
            )}
            <div className="mt-4">
              <p className="text-white/70 text-sm mb-2">
                Statut: <strong className="text-white">{results.abdeLead.status}</strong>
              </p>
              <p className="text-white/70 text-sm mb-2">
                Prix fixé: <strong className="text-white">{results.abdeLead.price_fixed}€</strong>
              </p>
              <p className="text-white/70 text-sm mb-2">
                Prix acompte: <strong className="text-white">{results.abdeLead.price_deposit}€</strong>
              </p>
              <p className="text-white/70 text-sm mb-2">
                Bouton &quot;Acompte réglé&quot; visible: <strong className="text-white">
                  {results.abdeLead.status === 'appele' && results.abdeLead.price_deposit ? 'OUI ✅' : 'NON ❌'}
                </strong>
              </p>
              {results.abdeLead.status !== 'appele' && (
                <p className="text-yellow-300 text-xs mt-2">
                  ⚠️ Le statut doit être &quot;appele&quot; pour voir le bouton &quot;Acompte réglé&quot;
                </p>
              )}
            </div>
          </div>
        )}

        {results.abdePayments && results.abdePayments.length > 0 && (
          <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-2">Paiements pour Abde CLouet</h2>
            <pre className="text-sm text-white/70 overflow-auto">
              {JSON.stringify(results.abdePayments, null, 2)}
            </pre>
            {results.abdePaymentsError && (
              <p className="text-red-300 text-sm mt-2">Erreur: {results.abdePaymentsError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
