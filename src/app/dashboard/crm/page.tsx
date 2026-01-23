import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import CRMTable from '@/components/crm/CRMTable'

export default async function CRMPage() {
  const supabase = await createClient()
  
  // Vérifier si connecté
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Récupérer l'utilisateur complet (avec rôle)
  const user = await getCurrentUser()
  
  // Récupérer tous les leads avec les infos du closer
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*, users:closer_id(full_name, email)')
    .order('created_at', { ascending: false })

  // Récupérer tous les closers (avec rôle closer)
  const { data: closers } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('role', 'closer')
    .order('full_name')

  if (error) {
    console.error('Error fetching leads:', error)
  }

  // Récupérer tous les utilisateurs qui ont des leads assignés (même s'ils n'ont pas le rôle 'closer')
  const { data: closersWithLeads } = await supabase
    .from('leads')
    .select('closer_id, users:closer_id(id, full_name, email)')
    .not('closer_id', 'is', null)
    .returns<Array<{ closer_id: string; users: { id: string; full_name: string | null; email: string } | null }>>()

  // Créer un Set pour éviter les doublons
  const closersMap = new Map<string, { id: string; full_name: string | null; email: string }>()
  
  // Ajouter les closers avec rôle 'closer'
  closers?.forEach(closer => {
    closersMap.set(closer.id, closer)
  })
  
  // Ajouter tous les utilisateurs qui ont des leads assignés
  closersWithLeads?.forEach(lead => {
    if (lead.closer_id && lead.users && !Array.isArray(lead.users)) {
      closersMap.set(lead.closer_id, {
        id: lead.users.id,
        full_name: lead.users.full_name,
        email: lead.users.email,
      })
    }
  })

  // S'assurer que l'utilisateur connecté est toujours dans la liste
  const currentUserId = user?.id || authUser.id
  if (!closersMap.has(currentUserId)) {
    closersMap.set(currentUserId, {
      id: currentUserId,
      full_name: user?.full_name || null,
      email: user?.email || authUser.email || '',
    })
  }

  // Convertir le Map en array et trier
  const finalClosers = Array.from(closersMap.values()).sort((a, b) => {
    const nameA = a.full_name || a.email
    const nameB = b.full_name || b.email
    return nameA.localeCompare(nameB)
  })

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 sm:pb-12">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">CRM</h1>
        <p className="text-white/50 text-sm sm:text-base lg:text-lg">Gestion des leads</p>
      </div>

      <CRMTable 
        leads={leads || []}
        closers={finalClosers}
        currentUser={user ? { 
          id: user.id, 
          role: user.role,
          full_name: user.full_name,
          email: user.email
        } : { 
          id: authUser.id, 
          role: 'admin',
          email: authUser.email || undefined
        }}
      />
    </div>
  )
}
