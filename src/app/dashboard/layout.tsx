import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default async function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const supabase = await createClient()
    
    // Vérifier l'auth - avec plusieurs tentatives pour laisser le temps aux cookies de se synchroniser
    let authUser = null
    let attempts = 0
    const maxAttempts = 5 // Plus de tentatives
    
    while (!authUser && attempts < maxAttempts) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (user) {
        authUser = user
        console.log(`✅ Dashboard Layout - Utilisateur trouvé après ${attempts + 1} tentative(s)`)
        break
      }

      if (authError) {
        console.log(`⚠️ Dashboard Layout - Tentative ${attempts + 1}/${maxAttempts}: ${authError.message}`)
      }

      // Si erreur ou pas d'utilisateur, attendre un peu et réessayer
      if (attempts < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      attempts++
    }

    // Si toujours pas d'utilisateur après les tentatives, rediriger
    if (!authUser) {
      console.log(`❌ Dashboard Layout - Pas d'utilisateur après ${maxAttempts} tentatives`)
      redirect('/login')
    }

    // Récupérer les infos complètes de l'utilisateur (nom, rôle)
    const user = await getCurrentUser()

    return (
      <DashboardLayout
        user={{
          email: authUser.email || 'unknown@email.com',
          role: user?.role || 'admin',
          full_name: user?.full_name || null,
        }}
      >
        {children}
      </DashboardLayout>
    )
  } catch (error: any) {
    console.error('❌ Dashboard Layout - Unexpected error:', error.message)
    redirect('/login')
  }
}
