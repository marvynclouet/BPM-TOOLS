'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useState } from 'react'

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex justify-between items-center h-28 sm:h-36 lg:h-52">
            {/* Logo à gauche */}
            <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0">
              <Image
                src="/logo-bpm-tools.png"
                alt="BPM Tools"
                width={280}
                height={93}
                className="h-20 sm:h-24 lg:h-40 xl:h-48 w-auto"
                priority
              />
            </Link>
            
            {/* Navigation desktop - cachée sur mobile */}
            <div className="hidden lg:flex items-center gap-4">
              {/* Navigation compacte */}
              <div className="flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 xl:px-4 py-2 rounded-xl text-xs xl:text-sm font-medium transition-all ${
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
                <span className="text-xs xl:text-sm text-white/70 truncate max-w-[140px] font-medium">
                  {user.full_name || user.email}
                </span>
                <span className="text-xs px-2.5 py-1 bg-white/10 rounded-full font-medium">{user.role}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs xl:text-sm text-white/50 hover:text-white transition-colors px-3 py-1.5 hover:bg-white/5 rounded-xl font-medium"
                >
                  Déconnexion
                </button>
              </div>
            </div>

            {/* Bouton menu mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Menu mobile - affiché quand ouvert */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-white/5 py-4 space-y-2">
              {/* Navigation mobile */}
              <div className="space-y-1 px-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
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
              <div className="h-px bg-white/10 my-3" />
              
              {/* Infos utilisateur mobile */}
              <div className="px-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70 font-medium truncate">
                    {user.full_name || user.email}
                  </span>
                  <span className="text-xs px-2.5 py-1 bg-white/10 rounded-full font-medium">{user.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-sm text-white/50 hover:text-white transition-colors px-4 py-2 hover:bg-white/5 rounded-xl font-medium text-left"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-6">{children}</main>
    </div>
  )
}
