import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PlanningView from '@/components/planning/PlanningView'

export default async function PlanningPage() {
  const supabase = await createClient()
  
  // Vérifier si connecté
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Utiliser le client admin pour bypasser RLS
  const adminClient = createAdminClient()
  
  const { data: planning, error } = await adminClient
    .from('planning')
    .select(
      `
      *,
      leads:lead_id(first_name, last_name, phone, formation, formation_format, formation_day)
    `
    )
    .order('start_date', { ascending: true })

  if (error) {
    console.error('Error fetching planning:', error)
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Planning</h1>
        <p className="text-white/50 text-sm sm:text-base lg:text-lg">Gestion du planning des formations</p>
      </div>

      <PlanningView entries={planning || []} />
    </div>
  )
}
