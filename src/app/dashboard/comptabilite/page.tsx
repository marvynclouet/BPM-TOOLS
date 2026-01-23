import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import AccountingTable from '@/components/comptabilite/AccountingTable'

export default async function ComptabilitePage() {
  const supabase = await createClient()
  
  // Vérifier si connecté
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Vérifier que l'utilisateur est admin
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    redirect('/dashboard')
  }

  // Utiliser le client admin pour bypasser RLS
  let entries: any[] = []
  let error: any = null

  try {
    const adminClient = createAdminClient()

    // Récupérer les entrées comptables
    const { data, error: fetchError } = await adminClient
      .from('accounting_entries')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      error = fetchError
    } else if (data && data.length > 0) {
      const leadIds = [...new Set(data.map(e => e.lead_id))]
      const paymentIds = [...new Set(data.map(e => e.payment_id).filter(Boolean))]

      const { data: leadsData } = await adminClient
        .from('leads')
        .select('id, first_name, last_name, phone, formation, price_fixed, price_deposit, documents_sent_at, email')
        .in('id', leadIds)

      const { data: paymentsData } = paymentIds.length > 0
        ? await adminClient
            .from('lead_payments')
            .select('id, paid_at, created_at')
            .in('id', paymentIds)
        : { data: [] }

      // Combiner les données
      entries = (data || []).map(entry => ({
        ...entry,
        leads: leadsData?.find(l => l.id === entry.lead_id) || null,
        payments: paymentsData?.find(p => p.id === entry.payment_id) || null,
      }))
    }
  } catch (err: any) {
    error = err
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Comptabilité</h1>
          <p className="text-white/50 text-sm sm:text-base lg:text-lg">Gestion des ventes et commissions</p>
        </div>
        <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 apple-card rounded-xl text-sm sm:text-base font-semibold hover:bg-white/10 transition-all">
          Exporter CSV
        </button>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <p className="text-red-400 font-semibold mb-2">Erreur lors du chargement des données</p>
          <p className="text-red-300 text-sm mb-3">{error.message || JSON.stringify(error)}</p>
          <p className="text-red-300 text-xs mb-2">
            Vérifiez que la migration 005_update_status_and_add_payment_tracking.sql a été exécutée.
          </p>
          <p className="text-red-300 text-xs">
            <a href="/dashboard/comptabilite/test" className="underline hover:text-red-200">
              Aller à la page de test
            </a>
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="apple-card rounded-2xl p-12">
          <div className="text-center">
            <p className="text-white/70 text-xl mb-3 font-semibold">Aucune entrée comptable</p>
            <p className="text-white/50 text-base mb-6 font-light">
              Les entrées apparaîtront ici lorsque vous marquerez des acomptes ou paiements complets dans le CRM
            </p>
            <div className="apple-card rounded-xl p-6 text-left max-w-md mx-auto">
              <p className="text-white/70 text-sm font-semibold mb-3">Pour tester :</p>
              <ol className="text-white/50 text-sm space-y-2 list-decimal list-inside font-light">
                <li>Allez dans le CRM</li>
                <li>Sélectionnez un lead avec un prix fixé et un prix acompte</li>
                <li>Cliquez sur &quot;Acompte réglé&quot; ou &quot;Paiement complet&quot;</li>
                <li>L&apos;entrée apparaîtra ici automatiquement</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <AccountingTable entries={entries} />
      )}
    </div>
  )
}
