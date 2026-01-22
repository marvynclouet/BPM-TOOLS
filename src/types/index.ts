export type { Database, UserRole } from './database'

export type LeadStatus =
  | 'nouveau'
  | 'chinois'
  | 'rats'
  | 'nrp'
  | 'en_cours_de_closing'
  | 'acompte_en_cours'
  | 'appele'
  | 'acompte_regle'
  | 'clos'
  | 'ko'

export type Formation = 'inge_son' | 'beatmaking' | 'autre' | 'je_ne_sais_pas_encore'

export type DocumentType = 'facture' | 'convocation' | 'attestation'

export type FormationFormat = 'mensuelle' | 'semaine' | 'bpm_fast'
export type FormationDay = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche'
export type InterestLevel = 'froid' | 'moyen' | 'chaud'

export interface Lead {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  formation: Formation
  source: string | null
  status: LeadStatus
  closer_id: string | null
  comment: string | null
  price_fixed: number | null
  price_deposit: number | null
  formation_format: FormationFormat | null
  formation_day: FormationDay | null
  formation_start_date: string | null
  interest_level: InterestLevel | null
  documents_sent_at: string | null
  whatsapp_conversation_started_at: string | null
  whatsapp_relance_1_at: string | null
  whatsapp_relance_2_at: string | null
  whatsapp_relance_3_at: string | null
  created_at: string
  updated_at: string
  last_action_at: string | null
}

export interface Deal {
  id: string
  lead_id: string
  stripe_session_id: string | null
  stripe_payment_link_id: string | null
  status: 'pending' | 'paid' | 'failed'
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  deal_id: string
  amount: number
  currency: string
  stripe_payment_intent_id: string
  stripe_customer_id: string | null
  paid_at: string
  created_at: string
}

export interface SalesLedgerEntry {
  id: string
  payment_id: string
  lead_id: string
  amount: number
  commission_closer: number
  commission_formateur: number
  exported: boolean
  export_date: string | null
  created_at: string
}

export interface Document {
  id: string
  lead_id: string
  type: DocumentType
  url: string
  created_at: string
}

export interface PlanningEntry {
  id: string
  lead_id: string
  start_date: string
  end_date: string
  gcal_event_id: string | null
  created_at: string
  updated_at: string
}
