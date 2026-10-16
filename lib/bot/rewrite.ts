import 'server-only'
import { FinishReason, Type } from '@google/genai'
import { z } from 'zod'
import { plainText } from '../admin/content'
import { TranslateError, gemini, geminiError, geminiModel } from '../admin/translate'
import type { Lang } from '../types'

const BACK = /[aıou]/
const VOWEL = /[aıoueəiöü]/

/** Azerbaijani dative after a name: "Milli.az" → "Milli.az-a", "APA" → "APA-ya", "Trend" → "Trend-ə". */
export function azDative(name: string) {
  const word = name.toLocaleLowerCase('az').replace(/[^a-zəıöüğşç]+$/i, '')
  const lastVowel = [...word].reverse().find((c) => VOWEL.test(c)) ?? 'a'
  const suffix = BACK.test(lastVowel) ? 'a' : 'ə'
  return `${name}-${VOWEL.test(word.at(-1) ?? '') ? 'y' : ''}${suffix}`
}

/** Fixed opening of every imported story. */
export function attribution(lang: Lang, source: string) {
  return lang === 'az' ? `Lider.com.az ${azDative(source)} istinadən bildirir ki,` : `Как сообщает Lider.com.az со ссылкой на ${source},`
}

const Output = z.object({
  skip: z.boolean(),
  skip_reason: z.string().nullable(),
  title: z.string(),
  paragraphs: z.array(z.string()),
  category: z.string().nullable(),
})

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    skip: { type: Type.BOOLEAN, description: 'true when the text is not a news story (advert, promo, horoscope, empty page) or is unusable' },
    skip_reason: { type: Type.STRING, nullable: true },
    title: { type: Type.STRING },
    paragraphs: { type: Type.ARRAY, items: { type: Type.STRING } },
    category: { type: Type.STRING, nullable: true },
  },
  required: ['skip', 'skip_reason', 'title', 'paragraphs', 'category'],
  propertyOrdering: ['skip', 'skip_reason', 'title', 'paragraphs', 'category'],
}

const LANG_NAME: Record<Lang, string> = { az: 'Azerbaijani', ru: 'Russian' }

export interface RewriteInput {
  lang: Lang
  source: string
  title: string
  paragraphs: string[]
  rewrite: boolean
  categories: { slug: string; name: string }[]
}

export interface Rewritten {
  title: string
  html: string
  category: string | null
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

/**
 * Turns a story taken from another site into a Lider.com.az story: rewritten in our own words (same facts),
 * opening with the attribution sentence, in the language of the target site. Returns null when it is not news.
 */
export async function rewriteStory(input: RewriteInput): Promise<Rewritten | null> {
  const opening = attribution(input.lang, input.source)
  const text = input.paragraphs.join('\n\n').slice(0, 30_000)
  if (text.length < 120) return null

  const task = input.rewrite
    ? 'Rewrite the story in your own words: rephrase every sentence, change sentence structure and word order, merge or split sentences where natural. ' +
      'Keep exactly the same meaning and every fact: names, positions, numbers, dates, places and direct quotes (quotes may be lightly re-punctuated but not changed in meaning). ' +
      'Do not add facts, opinions or conclusions that are not in the original, and do not drop important details. Write a new title with the same meaning.'
    : 'Keep the original text and title as they are (only fix obvious typos and spacing).'

  let response
  try {
    response = await gemini().models.generateContent({
      model: geminiModel(),
      contents: JSON.stringify({ source: input.source, title: input.title, text }),
      config: {
        systemInstruction:
          `You are a senior editor at Lider.com.az, an independent Azerbaijani news portal. You receive a news story published by "${input.source}". ` +
          `Output language: ${LANG_NAME[input.lang]} (literary, grammatically correct, news-agency register; translate if the input is in another language). ` +
          `${task} ` +
          `The first paragraph MUST begin with exactly: "${opening}" and continue that sentence with the main news (lowercase after the comma). ` +
          'Remove anything that is not part of the story: bylines, "read also" links, the source\'s own attribution lines, social-media prompts, ads, photo credits. ' +
          'Return the body as an array of paragraphs (plain text, no HTML, no markdown). ' +
          `Pick the best category slug from: ${input.categories.map((c) => `${c.slug} (${c.name})`).join(', ')}; null if none fits. ` +
          'Set skip=true (with skip_reason) for adverts, promotions, horoscopes, lottery results or pages with no real news content.',
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        temperature: input.rewrite ? 0.7 : 0.1,
        abortSignal: AbortSignal.timeout(90_000),
      },
    })
  } catch (err) {
    geminiError(err)
  }

  const reason = response.candidates?.[0]?.finishReason
  if (reason && reason !== FinishReason.STOP) throw new TranslateError(`Gemini xəbəri emal etmədi (${reason})`)
  let parsed
  try {
    parsed = Output.safeParse(JSON.parse(response.text ?? ''))
  } catch {
    parsed = null
  }
  if (!parsed?.success) throw new TranslateError('Gemini cavabı oxunmadı')
  const out = parsed.data
  if (out.skip) return null

  const paras = out.paragraphs.map((p) => plainText(p)).filter(Boolean)
  if (!paras.length || !out.title.trim()) return null
  // The attribution is required; repair the first paragraph if the model dropped or altered it.
  if (!paras[0].startsWith(opening)) {
    const first = paras[0].replace(/^Lider\.com\.az[^,]*,\s*/i, '').replace(/^Как сообщает[^,]*,\s*/i, '')
    paras[0] = `${opening} ${first}`
  }
  return {
    title: plainText(out.title).replace(/\s+/g, ' ').trim(),
    html: paras.map((p) => `<p>${escape(p)}</p>`).join(''),
    category: out.category,
  }
}
