import 'server-only'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { categoryMap, postPath } from '../format'
import { LANGS, SITE_URL } from '../site'
import type { Category, Lang } from '../types'
import { cleanHtml, makeExcerpt, slugify, toHtml, withLeadImage, withoutLeadImage } from './content'
import { adminDb } from './db'
import { storeImageFromUrl } from './images'
import { canTranslate, translatePost } from './translate'

export class InputError extends Error {}

const other = (lang: Lang): Lang => (lang === 'az' ? 'ru' : 'az')

const LangInput = z.object({
  title: z.string().trim().min(1, 'Başlıq boşdur').max(300),
  title_extra: z.string().trim().max(200).nullish(),
  is_red: z.boolean().optional(),
  body: z.string().max(500_000).default(''),
  excerpt: z.string().trim().max(1000).nullish(),
  keywords: z.string().trim().max(1000).nullish(),
})

export const StoryInput = z.object({
  az: LangInput.nullish(),
  ru: LangInput.nullish(),
  /** Fill in a missing language with an automatic translation (default: true). */
  translate: z.boolean().default(true),
  category_id: z.number().int().positive().optional(),
  /** Category id or slug ("siyaset"), convenient for bots. */
  category: z.union([z.number().int().positive(), z.string().trim().min(1)]).optional(),
  /** Card picture already stored via /api/admin/upload (`/img/…-s.webp`) or any https url; null removes it. */
  image: z.string().trim().max(1000).nullish(),
  /** Public picture url to download and store (bots). */
  image_url: z.string().trim().url().optional(),
  published_at: z.string().datetime({ offset: true }).optional(),
  is_published: z.boolean().optional(),
  show_on_main: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
  author: z.string().trim().max(100).nullish(),
})
export type StoryInput = z.infer<typeof StoryInput>
type LangFields = z.infer<typeof LangInput>

export function parseStory(json: unknown) {
  const r = StoryInput.safeParse(json)
  if (!r.success) throw new InputError(r.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '))
  return r.data
}

/** Columns returned to the admin UI. */
const ROW = 'lang,id,slug,title,title_extra,is_red,excerpt,body,image,category_ids,author,published_at,is_published,is_pinned,show_on_main,views,keywords,updated_at'
const LIST = 'lang,id,slug,title,title_extra,is_red,image,category_ids,published_at,is_published,show_on_main,views'

export type AdminRow = {
  lang: Lang
  id: number
  slug: string
  title: string
  title_extra: string | null
  is_red: boolean
  excerpt: string | null
  body: string
  image: string | null
  category_ids: number[]
  author: string | null
  published_at: string
  is_published: boolean
  is_pinned: boolean
  show_on_main: boolean
  views: number
  keywords: string | null
  group_id?: string | null
}

// Until supabase/migrations/001_admin.sql runs, `group_id` does not exist; everything still works unlinked.
let hasGroup: boolean | undefined
const missingGroup = (e: { message: string } | null) => Boolean(e && /group_id/.test(e.message))

async function groupSupported() {
  if (hasGroup === undefined) {
    const { error } = await adminDb().from('posts').select('group_id').limit(1)
    hasGroup = !missingGroup(error)
  }
  return hasGroup
}

const cols = async (base: string) => ((await groupSupported()) ? `${base},group_id` : base)

function must<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(`Supabase: ${error.message}`)
  return data as T
}

async function categories(lang: Lang) {
  return must<Category[]>(await adminDb().from('categories').select('id,name,slug,position,description').eq('lang', lang).order('position').order('id'))
}

async function resolveCategory(input: StoryInput, fallback?: number) {
  const ref = input.category_id ?? input.category
  if (ref === undefined) return fallback
  const cats = await categories('az')
  const found = cats.find((c) => c.id === ref || c.slug === String(ref).toLowerCase() || c.name.toLocaleLowerCase('az') === String(ref).toLocaleLowerCase('az'))
  if (!found) throw new InputError(`Kateqoriya tapılmadı: ${ref}`)
  return found.id
}

async function resolveImage(input: StoryInput) {
  if (input.image_url) return (await storeImageFromUrl(input.image_url)).image
  if (input.image === undefined) return undefined
  if (input.image === null || input.image === '') return null
  if (!/^(\/img\/[a-zA-Z0-9/_.-]+|https:\/\/\S+)$/.test(input.image)) throw new InputError('Şəkil linki yanlışdır')
  return input.image
}

/** Story fields for one language → table columns. */
function langColumns(f: LangFields, image: string | null) {
  const body = cleanHtml(toHtml(f.body))
  return {
    title: f.title,
    title_extra: f.title_extra || null,
    is_red: f.is_red ?? false,
    slug: slugify(f.title),
    excerpt: f.excerpt || makeExcerpt(body) || null,
    keywords: f.keywords || null,
    body: withLeadImage(body, image, f.title),
  }
}

/** Fills the missing language by translation when possible. Returns the per-language input and warnings. */
async function completeLanguages(input: StoryInput, need: Lang[]) {
  const fields: Partial<Record<Lang, LangFields>> = { az: input.az ?? undefined, ru: input.ru ?? undefined }
  const warnings: string[] = []
  for (const lang of need) {
    if (fields[lang]) continue
    const from = fields[other(lang)]
    if (!from || !input.translate) continue
    if (!canTranslate()) {
      warnings.push(`${lang.toUpperCase()} versiyası yaradılmadı: avtomatik tərcümə qoşulmayıb (ANTHROPIC_API_KEY)`)
      continue
    }
    const t = await translatePost(other(lang), lang, { title: from.title, title_extra: from.title_extra ?? null, body: cleanHtml(toHtml(from.body)) })
    fields[lang] = { ...t, is_red: from.is_red, excerpt: null, keywords: null }
  }
  return { fields, warnings }
}

const RETURNING = 'lang,id,slug,category_ids'
type Saved = { lang: Lang; id: number; slug: string; category_ids: number[] }

/** Drops `group_id` while the column does not exist yet (migration not run). */
async function forTable(values: Record<string, unknown>) {
  if (await groupSupported()) return values
  const rest = { ...values }
  delete rest.group_id
  return rest
}

async function insertRow(row: Record<string, unknown>) {
  return must(await adminDb().from('posts').insert(await forTable(row)).select(RETURNING).single()) as Saved
}

async function updateRow(lang: Lang, id: number, patch: Record<string, unknown>) {
  const values = await forTable(patch)
  const res = Object.keys(values).length
    ? await adminDb().from('posts').update(values).eq('lang', lang).eq('id', id).select(RETURNING).single()
    : await adminDb().from('posts').select(RETURNING).eq('lang', lang).eq('id', id).single()
  return must(res) as Saved
}

async function publicUrl(row: { lang: Lang; id: number; slug: string; category_ids: number[] }) {
  return `${SITE_URL[row.lang]}${postPath(row, categoryMap(await categories(row.lang)))}`
}

/** Both sites (desktop + phone templates) re-render on their next request. */
export function revalidateSites() {
  revalidatePath('/[lang]', 'layout')
  revalidatePath('/m/[lang]', 'layout')
}

export type SaveResult = { posts: Partial<Record<Lang, { id: number; url: string }>>; warnings: string[] }

/** Creates a story on both sites: the given language(s) plus a translation of the missing one. */
export async function createStory(input: StoryInput): Promise<SaveResult> {
  if (!input.az && !input.ru) throw new InputError('Ən azı bir dildə (az və ya ru) başlıq və mətn lazımdır')
  const [categoryId, image] = await Promise.all([resolveCategory(input, 1), resolveImage(input)])
  const { fields, warnings } = await completeLanguages(input, [...LANGS])
  const group_id = randomUUID()
  const shared = {
    category_ids: [categoryId!],
    image: image ?? null,
    author: input.author ?? 'lider',
    published_at: input.published_at ?? new Date().toISOString(),
    is_published: input.is_published ?? true,
    show_on_main: input.show_on_main ?? true,
    is_pinned: input.is_pinned ?? false,
    group_id,
  }
  const result: SaveResult = { posts: {}, warnings }
  for (const lang of LANGS) {
    const f = fields[lang]
    if (!f) continue
    const row = await insertRow({ lang, ...shared, ...langColumns(f, shared.image) })
    result.posts[lang] = { id: row.id, url: await publicUrl(row) }
  }
  revalidateSites()
  return result
}

async function getRow(lang: Lang, id: number) {
  return must<AdminRow | null>(await adminDb().from('posts').select(await cols(ROW)).eq('lang', lang).eq('id', id).maybeSingle())
}

async function linked(row: AdminRow) {
  if (!row.group_id) return null
  return must<AdminRow | null>(
    await adminDb().from('posts').select(await cols(ROW)).eq('lang', other(row.lang)).eq('group_id', row.group_id).limit(1).maybeSingle(),
  )
}

/** A story as the editor sees it: both language versions, bodies without the lead picture. */
export async function getStory(lang: Lang, id: number) {
  const row = await getRow(lang, id)
  if (!row) return null
  const pair = await linked(row)
  const strip = (r: AdminRow | null) => (r ? { ...r, body: withoutLeadImage(r.body, r.image) } : null)
  return { [lang]: strip(row), [other(lang)]: strip(pair), linkSupported: await groupSupported() } as {
    az: AdminRow | null
    ru: AdminRow | null
    linkSupported: boolean
  }
}

/**
 * Updates the story that `lang/id` belongs to. Shared fields go to both versions; a language present in the
 * input updates its version (or creates it, linked, when it does not exist yet).
 */
export async function updateStory(lang: Lang, id: number, input: StoryInput): Promise<SaveResult> {
  const row = await getRow(lang, id)
  if (!row) throw new InputError('Xəbər tapılmadı')
  const pair = await linked(row)
  const [categoryId, image] = await Promise.all([resolveCategory(input), resolveImage(input)])

  const shared: Record<string, unknown> = {}
  if (categoryId !== undefined) shared.category_ids = [categoryId]
  if (image !== undefined) shared.image = image
  for (const k of ['published_at', 'is_published', 'show_on_main', 'is_pinned', 'author'] as const) {
    if (input[k] !== undefined) shared[k] = input[k]
  }
  const nextImage = image !== undefined ? image : row.image

  const rows: Partial<Record<Lang, AdminRow | null>> = { [lang]: row, [other(lang)]: pair }
  const need = LANGS.filter((l) => !rows[l])
  const { fields, warnings } = await completeLanguages(input, need)
  const group_id = row.group_id ?? (need.some((l) => fields[l]) ? randomUUID() : undefined)

  const result: SaveResult = { posts: {}, warnings }
  for (const l of LANGS) {
    const existing = rows[l]
    const f = fields[l]
    if (existing) {
      const patch: Record<string, unknown> = { ...shared }
      if (f) Object.assign(patch, langColumns(f, nextImage))
      else if (image !== undefined) patch.body = withLeadImage(withoutLeadImage(existing.body, existing.image), nextImage, existing.title)
      if (group_id && !existing.group_id) patch.group_id = group_id
      const saved = await updateRow(l, existing.id, patch)
      result.posts[l] = { id: saved.id, url: await publicUrl(saved) }
    } else if (f) {
      const base = rows[other(l)]!
      const saved = await insertRow({
        lang: l,
        category_ids: base.category_ids,
        image: base.image,
        author: base.author,
        published_at: base.published_at,
        is_published: base.is_published,
        show_on_main: base.show_on_main,
        is_pinned: base.is_pinned,
        ...shared,
        group_id,
        ...langColumns(f, nextImage),
      })
      result.posts[l] = { id: saved.id, url: await publicUrl(saved) }
    }
  }
  revalidateSites()
  return result
}

export async function deleteStory(lang: Lang, id: number, both: boolean) {
  const row = await getRow(lang, id)
  if (!row) throw new InputError('Xəbər tapılmadı')
  const pair = both ? await linked(row) : null
  must(await adminDb().from('posts').delete().eq('lang', lang).eq('id', id))
  if (pair) must(await adminDb().from('posts').delete().eq('lang', pair.lang).eq('id', pair.id))
  revalidateSites()
  return { deleted: [{ lang, id }, ...(pair ? [{ lang: pair.lang, id: pair.id }] : [])] }
}

export type ListRow = Omit<AdminRow, 'body' | 'excerpt' | 'author' | 'keywords' | 'is_pinned'> & { translation: number | null }

export async function listPosts(lang: Lang, { q, page, perPage, category }: { q?: string; page: number; perPage: number; category?: number }) {
  let query = adminDb().from('posts').select(await cols(LIST), { count: 'exact' }).eq('lang', lang)
  if (q) query = /^\d+$/.test(q) ? query.eq('id', Number(q)) : query.ilike('title', `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`)
  if (category) query = query.contains('category_ids', [category])
  const from = (page - 1) * perPage
  const res = await query.order('published_at', { ascending: false }).range(from, from + perPage - 1)
  const rows = must(res) as unknown as (ListRow & { group_id?: string | null })[]

  const groups = rows.map((r) => r.group_id).filter(Boolean) as string[]
  const pairs = new Map<string, number>()
  if (groups.length) {
    const other_ = must(await adminDb().from('posts').select('id,group_id').eq('lang', other(lang)).in('group_id', groups)) as { id: number; group_id: string }[]
    for (const p of other_) pairs.set(p.group_id, p.id)
  }
  return {
    total: res.count ?? 0,
    rows: rows.map((r) => ({ ...r, translation: r.group_id ? pairs.get(r.group_id) ?? null : null })),
  }
}

export async function listCategories() {
  const [az, ru] = await Promise.all([categories('az'), categories('ru')])
  const ruName = new Map(ru.map((c) => [c.id, c.name]))
  return az.map((c) => ({ id: c.id, slug: c.slug, az: c.name, ru: ruName.get(c.id) ?? c.name }))
}
