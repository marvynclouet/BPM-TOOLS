import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'

export const dynamic = 'force-dynamic'

export default async function FormateurPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'formateur' && user.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()
  let query = adminClient
    .from('planning')
    .select('id, lead_id, start_date, end_date, specific_dates, trainer_id, payment_status, payment_amount')
    .order('start_date', { ascending: false })

  if (user.role === 'formateur') {
    query = query.eq('trainer_id', user.id)
  }

  let planningRes = await query
  if (planningRes.error && planningRes.error.message?.includes('does not exist')) {
    const fallbackQuery = adminClient.from('planning').select('id, lead_id, start_date, end_date, specific_dates').order('start_date', { ascending: false })
    planningRes = await fallbackQuery
  }
  if (planningRes.error) {
    console.error('formateur page:', planningRes.error)
  }

  const rows = planningRes.data || []
  const planningIds = rows.map((p: { id: string }) => p.id)
  let participantsByPlanning: Record<string, number> = {}
  if (planningIds.length > 0) {
    const { data: links } = await adminClient.from('planning_lead').select('planning_id').in('planning_id', planningIds)
    if (links && links.length > 0) {
      participantsByPlanning = (links || []).reduce((acc: Record<string, number>, l: { planning_id: string }) => {
        acc[l.planning_id] = (acc[l.planning_id] || 0) + 1
        return acc
      }, {})
    } else {
      rows.forEach((p: any) => {
        if (p.lead_id) participantsByPlanning[p.id] = (participantsByPlanning[p.id] || 0) + 1
      })
    }
  }

  const formatPeriod = (p: { start_date?: string; end_date?: string; specific_dates?: string[] | null }) => {
    if (p.specific_dates && p.specific_dates.length > 0) {
      const first = p.specific_dates[0]
      const last = p.specific_dates[p.specific_dates.length - 1]
      return `${format(new Date(first), 'dd MMM', { locale: fr })} – ${format(new Date(last), 'dd MMM yyyy', { locale: fr })}`
    }
    if (p.start_date && p.end_date) {
      return `Du ${format(new Date(p.start_date), 'dd MMM yyyy', { locale: fr })} au ${format(new Date(p.end_date), 'dd MMM yyyy', { locale: fr })}`
    }
    return 'Dates à définir'
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Espace Formateur</h1>
        <p className="text-white/50 text-sm sm:text-base lg:text-lg">
          {user.role === 'formateur' ? 'Vos sessions de formation' : 'Sessions et paiements formateurs'}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="apple-card rounded-2xl p-12 text-center">
          <p className="text-white/60 text-lg">
            {user.role === 'formateur'
              ? 'Aucune session ne vous est assignée. Un administrateur peut vous assigner depuis le détail d’une session (onglet Formateur).'
              : 'Aucune session pour le moment. Les sessions créées dans le Planning apparaissent ici ; assignez un formateur pour qu’il les voie dans son espace.'}
          </p>
        </div>
      ) : (
        <>
          <div className="apple-card rounded-2xl overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Période</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Participants</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Paiement</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-white/60 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-sm text-white">{formatPeriod(p)}</td>
                      <td className="px-4 py-3 text-sm text-white/80">{participantsByPlanning[p.id] ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${(p.payment_status || 'UNPAID') === 'PAID' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                          {(p.payment_status || 'UNPAID') === 'PAID' ? 'Payé' : 'À payer'} ({(p.payment_amount ?? 350).toFixed(0)} €)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/formateur/${p.id}`} className="text-sm font-medium text-white/80 hover:text-white">
                          Voir / Modifier
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid gap-3 sm:hidden">
            {rows.map((p: any) => (
              <Link key={p.id} href={`/dashboard/formateur/${p.id}`} className="apple-card rounded-2xl p-4 block hover:bg-white/5 transition">
                <p className="text-white font-medium">{formatPeriod(p)}</p>
                <p className="text-white/60 text-sm mt-1">{participantsByPlanning[p.id] ?? 0} participant(s)</p>
                <span className={`inline-flex mt-2 px-2 py-1 rounded-full text-xs font-medium ${(p.payment_status || 'UNPAID') === 'PAID' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {(p.payment_status || 'UNPAID') === 'PAID' ? 'Payé' : 'À payer'} – {(p.payment_amount ?? 350).toFixed(0)} €
                </span>
                <p className="text-white/50 text-xs mt-2">Voir / Modifier →</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
