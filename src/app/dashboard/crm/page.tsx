import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { getDemoLeads, getDemoClosers, getDemoUser, isDemoMode } from '@/lib/demo-data'
import type { Lead } from '@/types'
import CRMTable from '@/components/crm/CRMTable'

export default async function CRMPage() {
  const cookieStore = await cookies()
  const demoSession = cookieStore.get('demo_session')?.value === '1'

  if (isDemoMode() && demoSession) {
    const leads = getDemoLeads()
    const closers = getDemoClosers()
    const demoUser = getDemoUser()
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">CRM</h1>
          <p className="text-white/50 text-sm sm:text-base lg:text-lg">Gestion des leads</p>
        </div>
        <CRMTable
          isDemo
          leads={leads as (Lead & { users?: { full_name: string | null; email: string } | null })[]}
          closers={closers}
          favoriteLeadIds={new Set()}
          currentUser={{ id: demoUser.id, role: demoUser.role, full_name: demoUser.full_name, email: demoUser.email }}
        />
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const user = await getCurrentUser()
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*, users:closer_id(full_name, email)')
    .order('created_at', { ascending: false })

  const { data: closers } = await supabase
    .from('users')
    .select('id, full_name, email')
    .in('role', ['closer', 'admin'])
    .order('full_name')

  let favoriteLeadIds = new Set<string>()
  const { data: favorites, error: favError } = await supabase
    .from('lead_favorites')
    .select('lead_id')
    .eq('user_id', authUser.id)
  if (!favError) {
    favoriteLeadIds = new Set((favorites || []).map((f: { lead_id: string }) => f.lead_id))
  }

  const { data: closersWithLeads } = await supabase
    .from('leads')
    .select('closer_id, users:closer_id(id, full_name, email)')
    .not('closer_id', 'is', null)
    .returns<Array<{ closer_id: string; users: { id: string; full_name: string | null; email: string } | null }>>()

  const closersMap = new Map<string, { id: string; full_name: string | null; email: string }>()
  closers?.forEach(closer => closersMap.set(closer.id, closer))
  closersWithLeads?.forEach(lead => {
    if (lead.closer_id && lead.users && !Array.isArray(lead.users)) {
      closersMap.set(lead.closer_id, { id: lead.users.id, full_name: lead.users.full_name, email: lead.users.email })
    }
  })
  const currentUserId = user?.id || authUser.id
  if (!closersMap.has(currentUserId)) {
    closersMap.set(currentUserId, {
      id: currentUserId,
      full_name: user?.full_name || null,
      email: user?.email || authUser.email || '',
    })
  }
  const finalClosers = Array.from(closersMap.values()).sort((a, b) =>
    (a.full_name || a.email).localeCompare(b.full_name || b.email)
  )

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">CRM</h1>
        <p className="text-white/50 text-sm sm:text-base lg:text-lg">Gestion des leads</p>
      </div>
      <CRMTable
        leads={leads || []}
        closers={finalClosers}
        favoriteLeadIds={favoriteLeadIds}
        currentUser={
          user
            ? { id: user.id, role: user.role, full_name: user.full_name, email: user.email }
            : { id: authUser.id, role: 'admin', email: authUser.email || undefined }
        }
      />
    </div>
  )
}
