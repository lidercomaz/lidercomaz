import 'server-only'
import { ApiError, FinishReason, GoogleGenAI, Type } from '@google/genai'
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

export class TranslateError extends Error {}

export const canTranslate = () => Boolean(process.env.GEMINI_API_KEY)

let client: GoogleGenAI | undefined

export function gemini() {
  if (!canTranslate()) throw new TranslateError('Avtomatik tərcümə üçün GEMINI_API_KEY təyin edilməyib')
  return (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }))
}

export const geminiModel = () => process.env.GEMINI_MODEL || 'gemini-flash-latest'

/** Maps SDK errors to messages the editor can act on. */
export function geminiError(err: unknown): never {
  if (err instanceof ApiError) {
    if (err.status === 429) throw new TranslateError('Gemini limiti dolub, bir az sonra yenidən cəhd edin')
    if (err.status === 400 || err.status === 401 || err.status === 403) throw new TranslateError(`GEMINI_API_KEY və ya model yanlışdır: ${err.message}`)
    throw new TranslateError(`Gemini xətası: ${err.message}`)
  }
  if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) throw new TranslateError('Gemini çox uzun çəkdi, yenidən cəhd edin')
  throw err
}

/** Translates one news story between Azerbaijani and Russian with Gemini, keeping the HTML markup intact. */
export async function translatePost(from: Lang, to: Lang, src: TranslatableFields): Promise<TranslatableFields> {
  let response
  try {
    response = await gemini().models.generateContent({
      model: geminiModel(),
      contents: JSON.stringify(src),
      config: {
        systemInstruction:
          `You are a professional news translator for Lider.com.az, an independent Azerbaijani news portal. ` +
          `Translate the story from ${NAMES[from]} into ${NAMES[to]} in the neutral, factual register of a news agency. ` +
          'Keep every HTML tag and attribute exactly as it is; translate only the human-readable text (including img alt text). ' +
          'Keep names of people, places and organisations in the standard spelling used by media in the target language. ' +
          'Do not add, drop or summarise anything. `title_extra` is a short suffix shown after the title; translate it, or return null when the input is null. ' +
          'The attribution phrase has fixed forms: Azerbaijani "Lider.com.az X-a istinadən bildirir ki, …" ⇄ Russian "Как сообщает Lider.com.az со ссылкой на X, …" (X is the source name, unchanged; use the correct Azerbaijani dative suffix -a/-ə/-ya/-yə).',
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        temperature: 0.2,
        abortSignal: AbortSignal.timeout(55_000),
      },
    })
  } catch (err) {
    geminiError(err)
  }

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
