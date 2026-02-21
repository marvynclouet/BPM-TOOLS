import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import FormateurSessionDetail from '@/components/formateur/FormateurSessionDetail'

export const dynamic = 'force-dynamic'

export default async function FormateurSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'formateur' && user.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()
  const { data: session, error } = await adminClient
    .from('planning')
    .select('id, start_date, end_date, specific_dates, trainer_id, payment_status, payment_amount')
    .eq('id', id)
    .single()

  if (error || !session) notFound()
  if (user.role === 'formateur' && session.trainer_id !== user.id) redirect('/dashboard/formateur')

  const { data: links } = await adminClient.from('planning_lead').select('lead_id').eq('planning_id', id)
  const leadIds = (links || []).map((l: { lead_id: string }) => l.lead_id)
  let participants: { id: string; first_name: string; last_name: string }[] = []
  if (leadIds.length > 0) {
    const { data: leadsData } = await adminClient.from('leads').select('id, first_name, last_name').in('id', leadIds)
    participants = leadsData || []
  }

  const { data: attendances } = await adminClient.from('trainer_attendances').select('*').eq('planning_id', id)
  const { data: reports } = await adminClient.from('trainer_session_reports').select('*').eq('planning_id', id)
  const { data: evaluations } = await adminClient.from('trainer_evaluations').select('*').eq('planning_id', id)

  const initialData = {
    ...session,
    payment_status: session.payment_status || 'UNPAID',
    payment_amount: Number(session.payment_amount ?? 350),
    participants,
    attendances: attendances || [],
    reports: reports || [],
    evaluations: evaluations || [],
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 sm:pb-12">
      <FormateurSessionDetail sessionId={id} initialData={initialData} isAdmin={user.role === 'admin'} />
    </div>
  )
}
