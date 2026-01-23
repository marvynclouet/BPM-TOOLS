import LeadForm from '@/components/form/LeadForm'
import FormLogo from '@/components/form/FormLogo'

export default function FormPage({
  searchParams,
}: {
  searchParams: { source?: string }
}) {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Logo avec Instagram et site web */}
        <div className="mb-6 sm:mb-8">
          <FormLogo />
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-center tracking-tight">Inscription Formation</h1>
        <p className="text-center text-white/50 mb-6 sm:mb-8 text-base sm:text-lg">
          Remplissez le formulaire et nous vous contacterons rapidement
        </p>
        <LeadForm source={searchParams.source || 'direct'} />
      </div>
    </div>
  )
}
