'use client'

import { useRouter } from 'next/navigation'
import PlanningView from './PlanningView'

interface LeadOption {
  id: string
  first_name: string
  last_name: string
}

interface PlanningEntry {
  id: string
  lead_id?: string
  lead_ids?: string[]
  start_date: string
  end_date: string
  specific_dates: string[] | null
  gcal_event_id?: string | null
  leads: Array<{
    first_name: string
    last_name: string
    phone?: string
    formation: string
    formation_format: string | null
    formation_day: string | null
  }>
}

interface PlanningClientProps {
  entries: PlanningEntry[]
  leads: LeadOption[]
  isAdmin?: boolean
}

export default function PlanningClient({ entries, leads, isAdmin = false }: PlanningClientProps) {
  const router = useRouter()
  return (
    <PlanningView
      entries={entries}
      leads={leads}
      onRefresh={() => router.refresh()}
      isAdmin={isAdmin}
    />
  )
}
