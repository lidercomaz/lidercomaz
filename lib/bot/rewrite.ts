import 'server-only'
import { FinishReason, Type } from '@google/genai'
import { z } from 'zod'
import { plainText } from '../admin/content'
import { TranslateError, generate } from '../admin/translate'
import type { Lang } from '../types'

/** Fixed opening of every imported story; the source site is never named. */
export const ATTRIBUTION: Record<Lang, string> = {
  az: 'Lider.com.az istinadən bildirir ki,',
  ru: 'Как сообщает Lider.com.az,',
}

const Output = z.object({
  duplicate_of: z.number().int().nullable(),
  skip: z.boolean(),
  skip_reason: z.string().nullable(),
  title: z.string(),
  paragraphs: z.array(z.string()),
  category: z.string().nullable(),
})

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    duplicate_of: { type: Type.INTEGER, nullable: true, description: 'number of the recent headline that reports the same news event, or null' },
    skip: { type: Type.BOOLEAN, description: 'true when the text is not a news story (advert, promo, horoscope, empty page) or is unusable' },
    skip_reason: { type: Type.STRING, nullable: true },
    title: { type: Type.STRING },
    paragraphs: { type: Type.ARRAY, items: { type: Type.STRING } },
    category: { type: Type.STRING, nullable: true },
  },
  required: ['duplicate_of', 'skip', 'skip_reason', 'title', 'paragraphs', 'category'],
  propertyOrdering: ['duplicate_of', 'skip', 'skip_reason', 'title', 'paragraphs', 'category'],
}

const LANG_NAME: Record<Lang, string> = { az: 'Azerbaijani', ru: 'Russian' }

export interface RewriteInput {
  lang: Lang
  source: string
  title: string
  paragraphs: string[]
  rewrite: boolean
  categories: { slug: string; name: string }[]
  /** Headlines already published on the target site in the last 36 h (duplicate check). */
  recentTitles: string[]
}

export interface Rewritten {
  /** Set when the story repeats an already published one; nothing else is filled in then. */
  duplicateOf: string | null
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
  const opening = ATTRIBUTION[input.lang]
  const text = input.paragraphs.join('\n\n').slice(0, 30_000)
  if (text.length < 120) return null

  const task = input.rewrite
    ? 'Rewrite the story in your own words: rephrase every sentence, change sentence structure and word order, merge or split sentences where natural. ' +
      'Keep exactly the same meaning and every fact: names, positions, numbers, dates, places and direct quotes (quotes may be lightly re-punctuated but not changed in meaning). ' +
      'Do not add facts, opinions or conclusions that are not in the original, and do not drop important details. Write a new title with the same meaning.'
    : 'Keep the original text and title as they are (only fix obvious typos and spacing).'

  const response = await generate({
      contents: JSON.stringify({
        recent_headlines: input.recentTitles.slice(0, 150).map((t, i) => `${i + 1}. ${t}`),
        title: input.title,
        text,
      }),
      config: {
        systemInstruction:
          `You are a senior editor at Lider.com.az, an independent Azerbaijani news portal. You receive a news story taken from another news site ("${input.source}"). ` +
          `Output language: ${LANG_NAME[input.lang]} (literary, grammatically correct, news-agency register; translate if the input is in another language). ` +
          `${task} ` +
          `The first paragraph MUST begin with exactly: "${opening}" and continue that sentence with the main news (lowercase after the comma). ` +
          'The story is published as Lider.com.az\'s own: NEVER mention the site it was taken from or any other news site, agency or media outlet ' +
          `(e.g. ${input.source}, APA, Report, Trend, Qafqazinfo, Milli.az, Oxu.az, Sputnik, TASS, RIA Novosti, Interfax) — not in the title, not in the text. ` +
          'Drop their attribution phrases entirely ("X xəbər verir", "X-a istinadən", "X-ın məlumatına görə", "сообщает X", "по данным X", "передает X") and keep the fact itself. ' +
          'Official sources stay (ministries, agencies of state, officials, courts, press services quoted in the story). ' +
          'Remove anything that is not part of the story: bylines, "read also" links, social-media prompts, ads, photo credits. ' +
          'Return the body as an array of paragraphs (plain text, no HTML, no markdown). ' +
          `Pick the best category slug from: ${input.categories.map((c) => `${c.slug} (${c.name})`).join(', ')}; null if none fits. ` +
          'Set skip=true (with skip_reason) for adverts, promotions, horoscopes, lottery results or pages with no real news content. ' +
          'Duplicate check: `recent_headlines` were already published on our site. If the story reports the SAME specific news event as one of them ' +
          '(same people/organisation, same action, same occasion — even if worded differently or in another language), set duplicate_of to that number ' +
          'and return empty title and paragraphs. A follow-up with substantial new facts, or merely the same topic, is not a duplicate.',
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        temperature: input.rewrite ? 0.7 : 0.1,
      },
    }, 70_000)

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
  if (out.duplicate_of && input.recentTitles[out.duplicate_of - 1]) {
    return { duplicateOf: input.recentTitles[out.duplicate_of - 1], title: '', html: '', category: null }
  }
  if (out.skip) return null

  const paras = out.paragraphs.map((p) => plainText(p)).filter(Boolean)
  if (!paras.length || !out.title.trim()) return null
  // The attribution is required; repair the first paragraph if the model dropped or altered it.
  if (!paras[0].startsWith(opening)) {
    const first = paras[0].replace(/^Lider\.com\.az[^,]*,\s*/i, '').replace(/^Как сообщает[^,]*,\s*/i, '')
    paras[0] = `${opening} ${first}`
  }
  return {
    duplicateOf: null,
    title: plainText(out.title).replace(/\s+/g, ' ').trim(),
    html: paras.map((p) => `<p>${escape(p)}</p>`).join(''),
    category: out.category,
  }
}
