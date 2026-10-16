import 'server-only'
import { z } from 'zod'
import { adminDb } from '../admin/db'
import { storeImageFromUrl } from '../admin/images'
import { InputError, createStory, listCategories } from '../admin/posts'
import { TranslateError, canTranslate } from '../admin/translate'
import type { Lang } from '../types'
import { type FeedItem, discoverFeed, extractArticle, fetchText, paragraphs, parseFeed } from './fetch'
import { rewriteStory } from './rewrite'

export interface Source {
  id: number
  lang: Lang
  name: string
  site_url: string
  feed_url: string
  category_id: number | null
  is_active: boolean
  rewrite: boolean
  cross_post: boolean
  auto_publish: boolean
  with_image: boolean
  max_per_run: number
  last_checked_at: string | null
  last_error: string | null
  created_at: string
}

export class SetupError extends Error {}

function must<T>({ data, error }: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205' || /relation .*sources|source_items/.test(error.message)) {
      throw new SetupError('Mənbə cədvəlləri yoxdur: Supabase → SQL Editor-da supabase/admin-setup.sql faylını işlədin.')
    }
    throw new Error(`Supabase: ${error.message}`)
  }
  return data as T
}

/** Drops tracking parameters and the fragment so one story has one url. */
export function normalizeUrl(raw: string) {
  try {
    const u = new URL(raw)
    u.hash = ''
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|yclid|ref$)/i.test(k)) u.searchParams.delete(k)
    return u.href
  } catch {
    return raw
  }
}

/** Language of a feed judged by its headlines: Cyrillic → ru, Azerbaijani letters → az. */
export function feedLanguage(titles: string[]): Lang | 'other' {
  const text = titles.join(' ')
  const letters = text.match(/\p{L}/gu)?.length ?? 1
  if ((text.match(/[\u0400-\u04ff]/g)?.length ?? 0) / letters > 0.4) return 'ru'
  if ((text.match(/[əğışçöüƏĞİŞÇÖÜ]/g)?.length ?? 0) / letters > 0.02) return 'az'
  return 'other'
}

export const SourceInput = z.object({
  lang: z.enum(['az', 'ru']),
  name: z.string().trim().min(2, 'Ad lazımdır').max(60),
  site_url: z.string().trim().url('Sayt linki yanlışdır'),
  category_id: z.number().int().positive().nullish(),
  is_active: z.boolean().optional(),
  rewrite: z.boolean().optional(),
  cross_post: z.boolean().optional(),
  auto_publish: z.boolean().optional(),
  with_image: z.boolean().optional(),
  max_per_run: z.number().int().min(1).max(20).optional(),
})
export const SourcePatch = SourceInput.omit({ lang: true, site_url: true }).partial()

export async function listSources(lang?: Lang) {
  let q = adminDb().from('sources').select('*').order('created_at')
  if (lang) q = q.eq('lang', lang)
  return must<Source[]>(await q)
}

export async function addSource(input: z.infer<typeof SourceInput>) {
  const feed_url = await discoverFeed(input.site_url)
  const { text, finalUrl } = await fetchText(feed_url)
  const items = parseFeed(text, finalUrl)
  if (!items.length) throw new InputError('RSS lentində xəbər tapılmadı')
  const detected = feedLanguage(items.map((i) => i.title))
  if (detected !== input.lang) {
    const names = { az: 'Azərbaycan dilində', ru: 'rus dilində', other: 'başqa dildə (məs. ingilis)' }
    throw new InputError(
      `Bu lentdəki xəbərlər ${names[detected]}dir, ${input.lang.toUpperCase()} saytı üçün isə ${names[input.lang]} mənbə lazımdır. ` +
        'Saytın uyğun dil versiyasının linkini daxil edin (məs. ru.sayt.az və ya sayt.az/ru/rss).',
    )
  }
  const source = must<Source>(
    await adminDb().from('sources').insert({ ...input, feed_url }).select('*').single(),
  )
  return { source, feedItems: items.length }
}

export async function updateSource(id: number, patch: z.infer<typeof SourcePatch>) {
  return must<Source>(await adminDb().from('sources').update(patch).eq('id', id).select('*').single())
}

export async function deleteSource(id: number) {
  must(await adminDb().from('sources').delete().eq('id', id))
}

export interface ImportLogRow {
  id: number
  source_id: number
  url: string
  title: string | null
  status: string
  post_lang: Lang | null
  post_id: number | null
  error: string | null
  created_at: string
}

export async function recentItems(limit = 50) {
  return must<ImportLogRow[]>(
    await adminDb().from('source_items').select('id,source_id,url,title,status,post_lang,post_id,error,created_at').neq('status', 'seen')
      .order('created_at', { ascending: false }).limit(limit),
  )
}

type Outcome = { status: 'published' | 'draft' | 'skipped' | 'error'; post_lang?: Lang; post_id?: number; error?: string; title?: string }

async function processItem(source: Source, item: FeedItem, categories: { id: number; slug: string; name: string }[]): Promise<Outcome> {
  // Full text: from the feed when it carries it, otherwise from the article page.
  let title = item.title
  let paras = item.content ? paragraphs(item.content) : []
  let image = item.image
  if (paras.join(' ').length < 600) {
    const article = await extractArticle(item.url)
    if (article.paragraphs.join(' ').length > paras.join(' ').length) paras = article.paragraphs
    title = article.title || title
    image = article.image ?? image
  }
  if (paras.join(' ').length < 200) return { status: 'skipped', error: 'Mətn tapılmadı' }

  const story = await rewriteStory({
    lang: source.lang,
    source: source.name,
    title,
    paragraphs: paras,
    rewrite: source.rewrite,
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
  })
  if (!story) return { status: 'skipped', error: 'Xəbər deyil (reklam/boş səhifə)' }

  let card: string | null = null
  if (source.with_image && image) {
    card = await storeImageFromUrl(image).then((r) => r.image, () => null)
  }
  const category = categories.find((c) => c.slug === story.category)?.id ?? source.category_id ?? 1
  const saved = await createStory({
    [source.lang]: { title: story.title, body: story.html },
    translate: source.cross_post && canTranslate(),
    category_id: category,
    image: card,
    is_published: source.auto_publish,
    show_on_main: true,
    is_pinned: false,
    author: 'lider',
  })
  const own = saved.posts[source.lang]
  return {
    status: source.auto_publish ? 'published' : 'draft',
    post_lang: source.lang,
    post_id: own?.id,
    title: story.title,
    error: saved.warnings.join('; ') || undefined,
  }
}

const CONCURRENCY = 3

/** Prefix of errors that are temporary (Gemini busy, timeouts); such items are taken again on later runs. */
const RETRY_MARK = '⟳ '
const TEMPORARY_ERROR = /^⟳ |\b(503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded)\b|vaxt bitdi|məşğuldur|limiti dolub|açılmadı/i

/** Temporary failures are retried for a day; a run that died mid-item is picked up after 15 minutes. */
function shouldRetry(row: { status: string; error: string | null; created_at: string; updated_at: string }) {
  const age = Date.now() - Date.parse(row.created_at)
  if (row.status === 'error') return age < 864e5 && TEMPORARY_ERROR.test(row.error ?? '')
  // 'seen' rows come from an older version that skipped the backlog when a source was added.
  if (row.status === 'seen') return true
  if (row.status === 'processing') return Date.now() - Date.parse(row.updated_at) > 15 * 60e3 && age < 864e5
  return false
}

export interface RunReport {
  sources: number
  published: number
  drafts: number
  skipped: number
  errors: number
  details: { source: string; title: string; status: string; error?: string }[]
}

/**
 * One import pass: checks active sources (least recently checked first), takes up to `max_per_run` new stories
 * from each and publishes them. Stops starting new work once `budgetMs` is used up.
 */
export async function runImport({ sourceId, budgetMs = 230_000 }: { sourceId?: number; budgetMs?: number } = {}): Promise<RunReport> {
  if (!canTranslate()) throw new SetupError('Bot üçün GEMINI_API_KEY təyin edilməyib')
  const started = Date.now()
  const report: RunReport = { sources: 0, published: 0, drafts: 0, skipped: 0, errors: 0, details: [] }

  let q = adminDb().from('sources').select('*').order('last_checked_at', { ascending: true, nullsFirst: true })
  q = sourceId ? q.eq('id', sourceId) : q.eq('is_active', true)
  const sources = must<Source[]>(await q)
  const cats = await listCategories()

  for (const source of sources) {
    if (Date.now() - started > budgetMs) break
    report.sources++
    let sourceError: string | null = null
    try {
      const { text, finalUrl } = await fetchText(source.feed_url)
      const feed = parseFeed(text, finalUrl).map((i) => ({ ...i, url: normalizeUrl(i.url) }))
      const rows = must<{ id: number; url: string; status: string; error: string | null; created_at: string; updated_at: string }[]>(
        await adminDb().from('source_items').select('id,url,status,error,created_at,updated_at').eq('source_id', source.id).in('url', feed.map((i) => i.url)),
      )
      const byUrl = new Map(rows.map((r) => [r.url, r]))
      // Today's stories only (last 24 h), newest first, up to the per-source count.
      const since = Date.now() - 864e5
      const fresh = feed
        .filter((i) => !i.publishedAt || !(Date.parse(i.publishedAt) < since))
        .filter((i) => !byUrl.has(i.url) || shouldRetry(byUrl.get(i.url)!))
        .slice(0, source.max_per_run)
      const categories = cats.map((c) => ({ id: c.id, slug: c.slug, name: source.lang === 'az' ? c.az : c.ru }))

      const handle = async (item: FeedItem) => {
        // Claim the item first, so a parallel run skips it: a new row (unique url) or an atomic
        // status change of a row that failed temporarily.
        const prev = byUrl.get(item.url)
        const claim = prev
          ? await adminDb().from('source_items').update({ status: 'processing', error: null, updated_at: new Date().toISOString() })
              .eq('id', prev.id).eq('status', prev.status).eq('updated_at', prev.updated_at).select('id').single()
          : await adminDb().from('source_items').insert({ source_id: source.id, url: item.url, title: item.title, status: 'processing' }).select('id').single()
        if (claim.error || !claim.data) return
        let outcome: Outcome
        try {
          outcome = await processItem(source, item, categories)
        } catch (err) {
          const retry = err instanceof TranslateError && err.retryable
          outcome = { status: 'error', error: `${retry ? RETRY_MARK : ''}${err instanceof Error ? err.message : String(err)}` }
        }
        await adminDb().from('source_items').update({
          status: outcome.status,
          post_lang: outcome.post_lang ?? null,
          post_id: outcome.post_id ?? null,
          title: outcome.title ?? item.title,
          error: outcome.error?.slice(0, 1000) ?? null,
          updated_at: new Date().toISOString(),
        }).eq('id', claim.data.id)
        if (outcome.status === 'published') report.published++
        else if (outcome.status === 'draft') report.drafts++
        else if (outcome.status === 'skipped') report.skipped++
        else report.errors++
        report.details.push({ source: source.name, title: outcome.title ?? item.title, status: outcome.status, error: outcome.error })
      }

      // Three stories at a time; no new one starts once the time budget is spent (the rest waits for the next run).
      const queue = [...fresh]
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
          for (let item = queue.shift(); item; item = queue.shift()) {
            if (Date.now() - started > budgetMs) return
            await handle(item)
          }
        }),
      )
    } catch (err) {
      if (err instanceof SetupError) throw err
      sourceError = err instanceof Error ? err.message : String(err)
      report.errors++
      report.details.push({ source: source.name, title: '—', status: 'error', error: sourceError })
    }
    await adminDb().from('sources').update({ last_checked_at: new Date().toISOString(), last_error: sourceError }).eq('id', source.id)
  }
  return report
}
