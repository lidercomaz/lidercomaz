import 'server-only'
import { ApiError, FinishReason, type GenerateContentParameters, type GenerateContentResponse, GoogleGenAI, Type } from '@google/genai'
import { z } from 'zod'
import type { Lang } from '../types'

export interface TranslatableFields {
  title: string
  title_extra: string | null
  body: string
}

const Output = z.object({
  title: z.string(),
  title_extra: z.string().nullable(),
  body: z.string(),
})

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    title_extra: { type: Type.STRING, nullable: true },
    body: { type: Type.STRING },
  },
  required: ['title', 'title_extra', 'body'],
  propertyOrdering: ['title', 'title_extra', 'body'],
}

const NAMES: Record<Lang, string> = { az: 'Azerbaijani', ru: 'Russian' }

export class TranslateError extends Error {
  /** true for temporary failures (overload, rate limit, timeout): worth trying again later. */
  constructor(message: string, public retryable = false) {
    super(message)
  }
}

export const canTranslate = () => Boolean(process.env.GEMINI_API_KEY)

let client: GoogleGenAI | undefined

function gemini() {
  if (!canTranslate()) throw new TranslateError('Avtomatik tərcümə üçün GEMINI_API_KEY təyin edilməyib')
  return (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }))
}

/** Tried in order: when one model is overloaded or unavailable, the next one takes the request. */
function models() {
  return [...new Set([process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'].filter(Boolean) as string[])]
}

const TEMPORARY = new Set([429, 500, 502, 503, 504])
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Request = Omit<GenerateContentParameters, 'model'>

/**
 * generateContent with retries (temporary 5xx/429 errors, timeouts) and model fallback, so a busy
 * Gemini model does not fail the request. Throws TranslateError with a readable message.
 */
export async function generate(request: Request, timeoutMs = 60_000): Promise<GenerateContentResponse> {
  let last: TranslateError | null = null
  for (const model of models()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await gemini().models.generateContent({
          ...request,
          model,
          config: { ...request.config, abortSignal: AbortSignal.timeout(timeoutMs) },
        })
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401 || err.status === 403) throw new TranslateError('GEMINI_API_KEY yanlışdır və ya bu açarın Gemini API-yə icazəsi yoxdur')
          if (err.status === 400 && !/model/i.test(err.message)) throw new TranslateError(`Gemini sorğunu qəbul etmədi: ${err.message.slice(0, 300)}`)
          if (err.status === 404 || err.status === 400) {
            last = new TranslateError(`Model tapılmadı: ${model}`)
            break // next model
          }
          last = new TranslateError(
            err.status === 429 ? 'Gemini limiti dolub, bir az sonra avtomatik yenidən cəhd ediləcək' : 'Gemini serverləri hazırda məşğuldur, bir az sonra avtomatik yenidən cəhd ediləcək',
            true,
          )
          if (!TEMPORARY.has(err.status)) throw new TranslateError(`Gemini xətası (${err.status}): ${err.message.slice(0, 300)}`)
        } else if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
          last = new TranslateError('Gemini cavab vermədi (vaxt bitdi), yenidən cəhd ediləcək', true)
        } else {
          throw err
        }
        if (attempt === 0) await sleep(1500 + Math.random() * 1500)
      }
    }
  }
  throw last ?? new TranslateError('Gemini cavab vermədi', true)
}

/** Translates one news story between Azerbaijani and Russian with Gemini, keeping the HTML markup intact. */
export async function translatePost(from: Lang, to: Lang, src: TranslatableFields): Promise<TranslatableFields> {
  const response = await generate({
      contents: JSON.stringify(src),
      config: {
        systemInstruction:
          `You are a professional news translator for Lider.com.az, an independent Azerbaijani news portal. ` +
          `Translate the story from ${NAMES[from]} into ${NAMES[to]} in the neutral, factual register of a news agency. ` +
          'Keep every HTML tag and attribute exactly as it is; translate only the human-readable text (including img alt text). ' +
          'Keep names of people, places and organisations in the standard spelling used by media in the target language. ' +
          'Do not add, drop or summarise anything. `title_extra` is a short suffix shown after the title; translate it, or return null when the input is null. ' +
          'The attribution phrase has fixed forms: Azerbaijani "Lider.com.az istinadən bildirir ki, …" ⇄ Russian "Как сообщает Lider.com.az, …". ' +
          'Never add the name of another news site or agency.',
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        temperature: 0.2,
      },
    }, 50_000)

  const reason = response.candidates?.[0]?.finishReason
  if (reason === FinishReason.MAX_TOKENS) throw new TranslateError('Mətn tərcümə üçün çox uzundur')
  if (reason && reason !== FinishReason.STOP) throw new TranslateError(`Gemini bu mətni tərcümə etmədi (${reason})`)
  let parsed
  try {
    parsed = Output.safeParse(JSON.parse(response.text ?? ''))
  } catch {
    parsed = null
  }
  if (!parsed?.success) throw new TranslateError('Tərcümə cavabı oxunmadı')
  const out = parsed.data
  return { title: out.title.trim(), title_extra: out.title_extra?.trim() || null, body: out.body }
}
