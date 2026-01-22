// Types générés depuis Supabase
// À remplacer par les types générés avec: npx supabase gen types typescript --project-id <project-id>

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'closer' | 'formateur'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: UserRole
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: UserRole
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: UserRole
          full_name?: string | null
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          first_name: string
          last_name: string
          phone: string
          formation: 'inge_son' | 'beatmaking' | 'autre'
          source: string | null
          status: 'nouveau' | 'a_appeler' | 'appele' | 'lien_envoye' | 'paye' | 'clos' | 'ko'
          closer_id: string | null
          created_at: string
          updated_at: string
          last_action_at: string | null
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          phone: string
          formation: 'inge_son' | 'beatmaking' | 'autre'
          source?: string | null
          status?: 'nouveau' | 'a_appeler' | 'appele' | 'lien_envoye' | 'paye' | 'clos' | 'ko'
          closer_id?: string | null
          created_at?: string
          updated_at?: string
          last_action_at?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          phone?: string
          formation?: 'inge_son' | 'beatmaking' | 'autre'
          source?: string | null
          status?: 'nouveau' | 'a_appeler' | 'appele' | 'lien_envoye' | 'paye' | 'clos' | 'ko'
          closer_id?: string | null
          updated_at?: string
          last_action_at?: string | null
        }
      }
      deals: {
        Row: {
          id: string
          lead_id: string
          stripe_session_id: string | null
          stripe_payment_link_id: string | null
          status: 'pending' | 'paid' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          stripe_session_id?: string | null
          stripe_payment_link_id?: string | null
          status?: 'pending' | 'paid' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          stripe_session_id?: string | null
          stripe_payment_link_id?: string | null
          status?: 'pending' | 'paid' | 'failed'
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          deal_id: string
          amount: number
          currency: string
          stripe_payment_intent_id: string
          stripe_customer_id: string | null
          paid_at: string
          created_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          amount: number
          currency?: string
          stripe_payment_intent_id: string
          stripe_customer_id?: string | null
          paid_at: string
          created_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          amount?: number
          currency?: string
          stripe_payment_intent_id?: string
          stripe_customer_id?: string | null
          paid_at?: string
        }
      }
      sales_ledger: {
        Row: {
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
        Insert: {
          id?: string
          payment_id: string
          lead_id: string
          amount: number
          commission_closer: number
          commission_formateur: number
          exported?: boolean
          export_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          lead_id?: string
          amount?: number
          commission_closer?: number
          commission_formateur?: number
          exported?: boolean
          export_date?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          lead_id: string
          type: 'facture' | 'convocation' | 'attestation'
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          type: 'facture' | 'convocation' | 'attestation'
          url: string
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          type?: 'facture' | 'convocation' | 'attestation'
          url?: string
        }
      }
      planning: {
        Row: {
          id: string
          lead_id: string
          start_date: string
          end_date: string
          gcal_event_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          start_date: string
          end_date: string
          gcal_event_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          start_date?: string
          end_date?: string
          gcal_event_id?: string | null
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          updated_at?: string
        }
      }
    }
  }
}
