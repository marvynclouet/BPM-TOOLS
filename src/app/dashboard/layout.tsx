import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { getDemoUser, isDemoMode } from '@/lib/demo-data'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default async function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Toujours vérifier Supabase en premier : si l'utilisateur est connecté en prod, on l'utilise (pas la démo)
  let authUser = null
  let attempts = 0
  const maxAttempts = 5

  while (!authUser && attempts < maxAttempts) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      authUser = user
      break
    }
    if (attempts < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    attempts++
  }

  // Pas de session Supabase : utiliser la démo uniquement si mode démo + cookie démo
  if (!authUser) {
    const cookieStore = await cookies()
    const demoSession = cookieStore.get('demo_session')?.value === '1'
    if (isDemoMode() && demoSession) {
      const demoUser = getDemoUser()
      return (
        <DashboardLayout
          isDemo
          user={{
            id: demoUser.id,
            email: demoUser.email,
            role: demoUser.role,
            full_name: demoUser.full_name,
          }}
        >
          {children}
        </DashboardLayout>
      )
    }
    redirect('/login')
  }

  try {

    const user = await getCurrentUser()

    return (
      <DashboardLayout
        user={{
          id: user?.id ?? authUser.id,
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
