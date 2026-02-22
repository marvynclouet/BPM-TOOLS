import { xai } from '@ai-sdk/xai'
import { groq } from '@ai-sdk/groq'
import { google } from '@ai-sdk/google'

/**
 * Modèle IA pour les rapports (moins de tokens, plus rapide).
 * Utilise llama-3.1-8b-instant sur Groq pour économiser le quota.
 */
export function getReportModel() {
  if (process.env.XAI_API_KEY) return xai('grok-3-mini')
  if (process.env.GROQ_API_KEY) return groq('llama-3.1-8b-instant')
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return google('gemini-2.0-flash')
  return null
}

/**
 * Modèle IA pour le chat (peut être plus puissant).
 */
export function getChatModel() {
  if (process.env.XAI_API_KEY) return xai('grok-3-mini')
  if (process.env.GROQ_API_KEY) return groq('llama-3.3-70b-versatile')
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return google('gemini-2.0-flash')
  return null
}

/** Message d'erreur friendly pour le quota dépassé */
export const RATE_LIMIT_MESSAGE =
  'Quota IA épuisé. Réessayez dans 15 minutes ou demain.'

/** Détecte si l'erreur est un rate limit (quota dépassé) */
export function isRateLimitError(err: unknown): boolean {
  const check = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e ?? '')
    return (
      msg.includes('Rate limit') ||
      msg.includes('rate limit') ||
      msg.includes('rate_limit') ||
      msg.includes('429') ||
      msg.includes('quota')
    )
  }
  if (check(err)) return true
  const anyErr = err as { cause?: unknown; errors?: unknown[] }
  if (anyErr?.cause && check(anyErr.cause)) return true
  if (Array.isArray(anyErr?.errors) && anyErr.errors.some(check)) return true
  return false
}
