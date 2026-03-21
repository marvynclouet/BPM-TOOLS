import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo-data'
import ProspectsTable from '@/components/prospects-reseaux/ProspectsTable'

export const dynamic = 'force-dynamic'

export default async function ProspectsReseauxPage() {
  const cookieStore = await cookies()
  const demoSession = cookieStore.get('demo_session')?.value === '1'

  if (!(isDemoMode() && demoSession)) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">Prospects Réseaux</h1>
        <p className="text-white/50 text-sm sm:text-base lg:text-lg">TikTok & Instagram</p>
      </div>
      <ProspectsTable />
    </div>
  )
}
