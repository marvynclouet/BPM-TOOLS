import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'
import { UserRole } from '@/types'

export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    // Utiliser TOUJOURS le client admin pour bypasser RLS complètement
    const adminClient = createAdminClient()
    
    // Lire directement depuis la table avec le client admin (bypass RLS)
    const { data: userData, error } = await adminClient
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('❌ Erreur getCurrentUser:', error.message)
      // Si l'utilisateur n'existe pas dans public.users, retourner quand même un user de base
      return {
        id: user.id,
        email: user.email!,
        role: 'admin' as UserRole, // Fallback : admin par défaut
        full_name: null,
      }
    }

    return {
      id: user.id,
      email: user.email!,
      role: (userData?.role || 'admin') as UserRole,
      full_name: userData?.full_name || null,
    }
  } catch (error: any) {
    console.error('❌ Erreur inattendue getCurrentUser:', error.message)
    return null
  }
}

export async function requireAuth(requiredRole?: UserRole) {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    throw new Error('Forbidden')
  }

  return user
}

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  if (userRole === 'admin') return true
  return userRole === requiredRole
}
