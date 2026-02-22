/** Cache client pour quick-summary - évite les appels en boucle */

const TTL_MS = 2 * 60 * 1000 // 2 min

let cache: { data: unknown; ts: number } | null = null

export function getCachedQuickSummary() {
  if (typeof window === 'undefined') return null
  if (!cache || Date.now() - cache.ts > TTL_MS) return null
  return cache.data
}

export function setCachedQuickSummary(data: unknown) {
  if (typeof window === 'undefined') return
  cache = { data, ts: Date.now() }
}
