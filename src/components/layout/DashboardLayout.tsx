'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

interface DashboardLayoutProps {
  children: React.ReactNode
  user: {
    email: string
    role: string
    full_name: string | null
  }
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const allNavItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/crm', label: 'CRM' },
    { href: '/dashboard/comptabilite', label: 'Comptabilité', adminOnly: true },
    { href: '/dashboard/planning', label: 'Planning' },
    { href: '/dashboard/gestion', label: 'Gestion' },
    { href: '/dashboard/mon-espace', label: 'Mon Espace' },
  ]

  // Filtrer les items selon le rôle (seuls les admins voient Comptabilité)
  const navItems = allNavItems.filter(item => {
    if (item.adminOnly && user.role !== 'admin') {
      return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <nav className="border-b border-white/5 backdrop-blur-xl bg-[#1a1a1a]/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex justify-between items-center h-28">
            {/* Logo à gauche */}
            <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
              <Image
                src="/logo-bpm-tools.png"
                alt="BPM Tools"
                width={280}
                height={93}
                className="h-24 w-auto"
                priority
              />
            </Link>
            
            {/* Navigation et infos utilisateur à droite */}
            <div className="flex items-center gap-4">
              {/* Navigation compacte */}
              <div className="flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      pathname === item.href
                        ? 'bg-white/10 text-white'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              
              {/* Séparateur */}
              <div className="h-8 w-px bg-white/10" />
              
              {/* Infos utilisateur compactes */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 truncate max-w-[140px] font-medium">
                  {user.full_name || user.email}
                </span>
                <span className="text-xs px-2.5 py-1 bg-white/10 rounded-full font-medium">{user.role}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-white/50 hover:text-white transition-colors px-3 py-1.5 hover:bg-white/5 rounded-xl font-medium"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-4">{children}</main>
    </div>
  )
}
