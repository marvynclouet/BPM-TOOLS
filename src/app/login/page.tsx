import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from '@/components/auth/LoginForm'
import Image from 'next/image'

export default async function LoginPage() {
  // Version simplifiée : vérifier seulement Supabase Auth
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (authUser) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
      <div className="w-full max-w-md p-10">
        <div className="space-y-6 mb-10 text-center">
          <div className="flex justify-center">
            <Image
              src="/logo-bpm-tools.png"
              alt="BPM Tools"
              width={500}
              height={167}
              className="h-auto w-auto max-w-[450px] sm:max-w-[500px]"
              priority
            />
          </div>
          <p className="text-white/50 text-lg font-light">Connectez-vous pour continuer</p>
          {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
            <div className="rounded-xl bg-amber-500/15 border border-amber-400/30 p-4 text-left text-sm text-amber-200/90">
              <p className="font-semibold mb-1">Compte démo</p>
              <p className="text-white/80">Email : demo@bpm-tools-demo.fr</p>
              <p className="text-white/80">Mot de passe : Demo123!</p>
            </div>
          )}
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
