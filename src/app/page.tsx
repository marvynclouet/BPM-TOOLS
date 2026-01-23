import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function Home() {
  // Vérifier que les variables d'environnement sont configurées
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect('/setup')
  }

  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/login')
    }

    redirect('/dashboard')
  } catch (error) {
    // En cas d'erreur, rediriger vers login (les variables sont configurées)
    redirect('/login')
  }
}
