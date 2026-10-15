import type { Category, Lang, PostCard } from './types'

const TZ = 'Asia/Baku'

const MONTHS: Record<Lang, string[]> = {
  az: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'],
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
}

function parts(iso: string) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (t: string) => p.find((x) => x.type === t)!.value
  return { y: get('year'), m: get('month'), d: get('day'), H: get('hour'), i: get('minute') }
}

const RELATIVE: Record<Lang, [string, string]> = { az: ['Bugün', 'Dünən'], ru: ['Сегодня', 'Вчера'] }

/** DLE {date}: "Bugün, 10:16" / "Dünən, 18:02" / "15-10-2026, 10:16" */
export function formatDate(iso: string, lang: Lang) {
  const { y, m, d, H, i } = parts(iso)
  const day = `${y}-${m}-${d}`
  const today = parts(new Date().toISOString())
  const yesterday = parts(new Date(Date.now() - 864e5).toISOString())
  if (day === `${today.y}-${today.m}-${today.d}`) return `${RELATIVE[lang][0]}, ${H}:${i}`
  if (day === `${yesterday.y}-${yesterday.m}-${yesterday.d}`) return `${RELATIVE[lang][1]}, ${H}:${i}`
  return `${Number(d)}-${m}-${y}, ${H}:${i}`
}

/** DLE {date=j.m.Y, H:i}: "15.10.2026, 10:16" */
export function formatDotted(iso: string) {
  const { y, m, d, H, i } = parts(iso)
  return `${d}.${m}.${y}, ${H}:${i}`
}

export function formatTime(iso: string) {
  const { H, i } = parts(iso)
  return `${H}:${i}`
}

/** DLE {date=j M} */
export function formatDayMonth(iso: string, lang: Lang) {
  const { m, d } = parts(iso)
  return `${Number(d)} ${MONTHS[lang][Number(m) - 1]}`
}

export function formatYear(iso: string) {
  return parts(iso).y
}

/** Legacy DLE url (seo_type 2): /{category}/{id}-{slug}.html */
export function postPath(post: Pick<PostCard, 'id' | 'slug' | 'category_ids'>, cats: Map<number, Category>) {
  const cat = cats.get(post.category_ids[0])
  return `${cat ? `/${cat.slug}` : ''}/${post.id}-${post.slug}.html`
}

export function categoryMap(cats: Category[]) {
  return new Map(cats.map((c) => [c.id, c]))
}

/** DLE no_image.jpg, shown where a post has no picture. */
export const NO_IMAGE = '/theme/images/no_image.jpg'
