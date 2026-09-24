import type { Financement } from '@/types'

export const FINANCEMENT_OPTIONS: { value: Financement; label: string; badge: string }[] = [
  { value: 'cpf', label: 'CPF', badge: 'bg-purple-500/20 text-purple-200 border-purple-400/40' },
  { value: 'pole_emploi', label: 'Pôle Emploi', badge: 'bg-sky-500/20 text-sky-200 border-sky-400/40' },
  { value: 'afdas', label: 'AFDAS', badge: 'bg-orange-500/20 text-orange-200 border-orange-400/40' },
  { value: 'opco', label: 'OPCO', badge: 'bg-teal-500/20 text-teal-200 border-teal-400/40' },
  { value: 'autre', label: 'Autre financement', badge: 'bg-white/10 text-white/70 border-white/20' },
]

export const getFinancementOption = (value: Financement | null | undefined) =>
  FINANCEMENT_OPTIONS.find(o => o.value === value) || null
