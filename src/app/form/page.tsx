import LeadForm from '@/components/form/LeadForm'
import Image from 'next/image'

export default function FormPage({
  searchParams,
}: {
  searchParams: { source?: string }
}) {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo-bpm-tools.png"
            alt="BPM Tools"
            width={240}
            height={80}
            className="h-auto w-auto max-w-[240px]"
            priority
          />
        </div>
        <h1 className="text-3xl font-semibold mb-2 text-center tracking-tight">Inscription Formation</h1>
        <p className="text-center text-white/50 mb-8 text-lg">
          Remplissez le formulaire et nous vous contacterons rapidement
        </p>
        <LeadForm source={searchParams.source || 'direct'} />
      </div>
    </div>
  )
}
