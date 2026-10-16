import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
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

const NAMES: Record<Lang, string> = { az: 'Azerbaijani', ru: 'Russian' }

export class TranslateError extends Error {}

export const canTranslate = () => Boolean(process.env.ANTHROPIC_API_KEY)

let client: Anthropic | undefined

/** Translates one news story between Azerbaijani and Russian, keeping the HTML markup intact. */
export async function translatePost(from: Lang, to: Lang, src: TranslatableFields): Promise<TranslatableFields> {
  if (!canTranslate()) throw new TranslateError('Avtomatik tərcümə üçün ANTHROPIC_API_KEY təyin edilməyib')
  client ??= new Anthropic()

  let response
  try {
    response = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: betaZodOutputFormat(Output) },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system:
        `You are a professional news translator for Lider.com.az, an independent Azerbaijani news portal. ` +
        `Translate the story from ${NAMES[from]} into ${NAMES[to]} in the neutral, factual register of a news agency. ` +
        'Keep every HTML tag and attribute exactly as it is; translate only the human-readable text (including img alt text). ' +
        'Keep names of people, places and organisations in the standard spelling used by media in the target language. ' +
        'Do not add, drop or summarise anything. `title_extra` is a short suffix shown after the title; translate it, or return null when the input is null.',
      messages: [{ role: 'user', content: JSON.stringify(src) }],
    })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new TranslateError('Tərcümə xidməti hazırda məşğuldur, bir az sonra yenidən cəhd edin')
    if (err instanceof Anthropic.AuthenticationError) throw new TranslateError('ANTHROPIC_API_KEY yanlışdır')
    if (err instanceof Anthropic.APIError) throw new TranslateError(`Tərcümə alınmadı: ${err.message}`)
    throw err
  }

  if (response.stop_reason === 'refusal') throw new TranslateError('Tərcümə xidməti bu mətni tərcümə etməkdən imtina etdi')
  if (response.stop_reason === 'max_tokens') throw new TranslateError('Mətn tərcümə üçün çox uzundur')
  const out = response.parsed_output
  if (!out) throw new TranslateError('Tərcümə cavabı oxunmadı')
  return { title: out.title.trim(), title_extra: out.title_extra?.trim() || null, body: out.body }
}
