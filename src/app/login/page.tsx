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
              width={300}
              height={100}
              className="h-auto w-auto max-w-[300px]"
              priority
            />
          </div>
          <p className="text-white/50 text-lg font-light">Connectez-vous pour continuer</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
