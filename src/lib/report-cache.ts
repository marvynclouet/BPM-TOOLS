/** TTL du cache des rapports (ms) - 1h pour limiter la consommation de tokens */
const CACHE_TTL_MS = 60 * 60 * 1000

export function getCachedReport<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number }
    if (Date.now() - ts > CACHE_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

export function setCachedReport<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // sessionStorage plein ou indisponible
  }
}
