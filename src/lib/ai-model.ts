import { createOpenAI } from '@ai-sdk/openai'
import { xai } from '@ai-sdk/xai'
import { groq } from '@ai-sdk/groq'
import { google } from '@ai-sdk/google'
import { generateText as aiGenerateText, streamText as aiStreamText, type LanguageModel } from 'ai'

/**
 * OpenRouter comme provider principal (compatible OpenAI).
 * Cascade avec fallback automatique : OpenRouter → xAI → Groq → Google
 */
function getOpenRouterModel(modelId: string) {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return null
  const provider = createOpenAI({
    apiKey: key,
    baseURL: 'https://openrouter.ai/api/v1',
  })
  return provider.chat(modelId)
}

/** Retourne la liste ordonnée de modèles pour les rapports */
function getReportModels(): LanguageModel[] {
  const models: LanguageModel[] = []
  const or = getOpenRouterModel('mistralai/mistral-small-2603')
  if (or) models.push(or)
  if (process.env.XAI_API_KEY) models.push(xai('grok-3-mini'))
  if (process.env.GROQ_API_KEY) models.push(groq('llama-3.1-8b-instant'))
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) models.push(google('gemini-2.0-flash'))
  return models
}

/** Retourne la liste ordonnée de modèles pour le chat */
function getChatModels(): LanguageModel[] {
  const models: LanguageModel[] = []
  const or = getOpenRouterModel('mistralai/mistral-small-2603')
  if (or) models.push(or)
  if (process.env.XAI_API_KEY) models.push(xai('grok-3-mini'))
  if (process.env.GROQ_API_KEY) models.push(groq('llama-3.3-70b-versatile'))
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) models.push(google('gemini-2.0-flash'))
  return models
}

/**
 * Retourne le premier modèle disponible pour les rapports.
 * Utilisé par les routes qui appellent directement generateText().
 * Pour un vrai fallback automatique, utiliser generateTextWithFallback().
 */
export function getReportModel(): LanguageModel | null {
  const models = getReportModels()
  return models[0] || null
}

/**
 * Retourne le premier modèle disponible pour le chat.
 */
export function getChatModel(): LanguageModel | null {
  const models = getChatModels()
  return models[0] || null
}

/**
 * generateText avec fallback automatique entre providers.
 * Si le premier échoue (402, 429, 5xx), on essaie le suivant.
 */
export async function generateTextWithFallback(
  options: { type?: 'report' | 'chat' } & Record<string, any>
) {
  const { type = 'report', ...rest } = options
  const models = type === 'chat' ? getChatModels() : getReportModels()

  if (models.length === 0) {
    throw new Error('Aucune clé API IA configurée (OPENROUTER_API_KEY, XAI_API_KEY, GROQ_API_KEY ou GOOGLE_GENERATIVE_AI_API_KEY)')
  }

  let lastError: unknown
  for (const model of models) {
    try {
      return await aiGenerateText({ ...rest, model } as any)
    } catch (err: any) {
      lastError = err
      const status = err?.statusCode || err?.status || err?.data?.error?.code
      const msg = err?.message || ''
      const isRetryable = status === 402 || status === 429 || status >= 500 ||
        msg.includes('Insufficient credits') || msg.includes('rate limit') || msg.includes('Rate limit')
      if (!isRetryable) throw err
      console.warn(`AI fallback: ${(model as any).modelId || 'unknown'} failed (${status || msg}), trying next provider...`)
    }
  }
  throw lastError
}

/**
 * streamText avec fallback automatique entre providers.
 */
export async function streamTextWithFallback(
  options: { type?: 'report' | 'chat' } & Record<string, any>
) {
  const { type = 'chat', ...rest } = options
  const models = type === 'chat' ? getChatModels() : getReportModels()

  if (models.length === 0) {
    throw new Error('Aucune clé API IA configurée')
  }

  let lastError: unknown
  for (const model of models) {
    try {
      return aiStreamText({ ...rest, model } as any)
    } catch (err: any) {
      lastError = err
      console.warn(`AI stream fallback: ${(model as any).modelId || 'unknown'} failed, trying next provider...`)
    }
  }
  throw lastError
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
      msg.includes('quota') ||
      msg.includes('Insufficient credits')
    )
  }
  if (check(err)) return true
  const anyErr = err as { cause?: unknown; errors?: unknown[] }
  if (anyErr?.cause && check(anyErr.cause)) return true
  if (Array.isArray(anyErr?.errors) && anyErr.errors.some(check)) return true
  return false
}
