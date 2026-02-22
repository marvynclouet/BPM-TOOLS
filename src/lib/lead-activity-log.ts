import { createAdminClient } from '@/lib/supabase/admin'

export type ActivityAction =
  | 'status_changed'
  | 'closer_assigned'
  | 'field_updated'
  | 'comment_added'
  | 'payment_marked'

/**
 * Enregistre une action dans l'historique du lead.
 */
export async function logLeadActivity(params: {
  leadId: string
  userId?: string | null
  actionType: ActivityAction
  fieldName?: string
  oldValue?: string | number | null
  newValue?: string | number | null
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('lead_activity_log').insert({
      lead_id: params.leadId,
      user_id: params.userId || null,
      action_type: params.actionType,
      field_name: params.fieldName || null,
      old_value: params.oldValue != null ? String(params.oldValue) : null,
      new_value: params.newValue != null ? String(params.newValue) : null,
      details: params.details || null,
    })
  } catch (err) {
    console.error('logLeadActivity:', err)
  }
}
