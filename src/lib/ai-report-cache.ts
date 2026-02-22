import { createAdminClient } from '@/lib/supabase/admin'

/** TTL du cache (ms) - 1h */
const CACHE_TTL_MS = 60 * 60 * 1000

export async function getCachedReport(
  reportType: string,
  reportKey = ''
): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('ai_report_cache')
    .select('content, created_at')
    .eq('report_type', reportType)
    .eq('report_key', reportKey)
    .maybeSingle()

  if (error || !data) return null
  const age = Date.now() - new Date(data.created_at).getTime()
  if (age > CACHE_TTL_MS) return null
  return data.content
}

export async function setCachedReport(
  reportType: string,
  content: string,
  reportKey = '',
  meta?: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient()
  await admin.from('ai_report_cache').upsert(
    { report_type: reportType, report_key: reportKey, content, meta, created_at: new Date().toISOString() },
    { onConflict: 'report_type,report_key' }
  )
}

export async function getCachedReportJson<T>(
  reportType: string,
  reportKey = ''
): Promise<T | null> {
  const raw = await getCachedReport(reportType, reportKey)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function setCachedReportJson(
  reportType: string,
  data: unknown,
  reportKey = ''
): Promise<void> {
  await setCachedReport(reportType, JSON.stringify(data), reportKey)
}
