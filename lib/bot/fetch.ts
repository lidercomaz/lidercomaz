import 'server-only'
import { Readability } from '@mozilla/readability'
import { XMLParser } from 'fast-xml-parser'
import { parseHTML } from 'linkedom'
import { plainText } from '../admin/content'

const UA = 'Mozilla/5.0 (compatible; LiderBot/1.0; +https://lider.com.az)'
const MAX_BYTES = 5 * 1024 * 1024

export class FetchError extends Error {}

function assertPublicUrl(raw: string) {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    throw new FetchError(`Link yanlışdır: ${raw}`)
  }
  if (!/^https?:$/.test(u.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/.test(u.hostname)) {
    throw new FetchError(`Link yanlışdır: ${raw}`)
  }
  return u
}

/** Fetches a page or feed and decodes it with the charset it declares (some sites still use windows-1251). */
export async function fetchText(url: string, timeoutMs = 15_000) {
  const u = assertPublicUrl(url)
  const res = await fetch(u, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.8' },
    redirect: 'follow',
  }).catch((e: Error) => {
    throw new FetchError(`${u.hostname} açılmadı: ${e.name === 'TimeoutError' ? 'vaxt bitdi' : e.message}`)
  })
  if (!res.ok) throw new FetchError(`${u.hostname}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_BYTES) throw new FetchError(`${u.hostname}: səhifə çox böyükdür`)
  const head = buf.subarray(0, 2048).toString('latin1')
  const charset =
    /charset=["']?([\w-]+)/i.exec(res.headers.get('content-type') ?? '')?.[1] ??
    /<\?xml[^>]*encoding=["']([\w-]+)/i.exec(head)?.[1] ??
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ??
    'utf-8'
  let text: string
  try {
    text = new TextDecoder(charset.toLowerCase()).decode(buf)
  } catch {
    text = new TextDecoder('utf-8').decode(buf)
  }
  return { text, finalUrl: res.url || u.href, contentType: res.headers.get('content-type') ?? '' }
}

export interface FeedItem {
  url: string
  title: string
  /** Full text from the feed when it carries it (content:encoded / yandex:full-text). */
  content: string | null
  summary: string | null
  image: string | null
  publishedAt: string | null
}

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', textNodeName: '#text', cdataPropName: false, trimValues: true })

const arr = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v])
const str = (v: unknown): string => {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  if (typeof v === 'object' && '#text' in (v as object)) return String((v as Record<string, unknown>)['#text'])
  return ''
}

export function isFeed(text: string) {
  return /<(rss|feed|rdf:RDF)\b/i.test(text.slice(0, 3000))
}

export function parseFeed(text: string, base: string): FeedItem[] {
  const doc = xml.parse(text)
  const abs = (href: string) => {
    try {
      return new URL(href.trim(), base).href
    } catch {
      return ''
    }
  }
  // RSS 2.0 / RDF
  const channel = doc.rss?.channel ?? doc['rdf:RDF']
  if (channel) {
    const items = arr(channel.item ?? doc['rdf:RDF']?.item)
    return items
      .map((it: Record<string, unknown>) => {
        const enclosure = arr(it.enclosure as Record<string, string>[]).find((e) => /^image\//.test(e['@type'] ?? 'image/'))
        const media = arr((it['media:content'] ?? it['media:thumbnail']) as Record<string, string>[])[0]
        return {
          url: abs(str(it.link) || str(it.guid)),
          title: plainText(str(it.title)),
          content: str(it['content:encoded']) || str(it['yandex:full-text']) || null,
          summary: str(it.description) || null,
          image: enclosure?.['@url'] || media?.['@url'] || null,
          publishedAt: str(it.pubDate) || str(it['dc:date']) || null,
        }
      })
      .filter((i) => i.url && i.title)
  }
  // Atom
  if (doc.feed) {
    return arr(doc.feed.entry)
      .map((e: Record<string, unknown>) => {
        const links = arr(e.link as object[]) as Record<string, string>[]
        const link = links.find((l) => !l['@rel'] || l['@rel'] === 'alternate') ?? links[0]
        return {
          url: abs(link?.['@href'] ?? ''),
          title: plainText(str(e.title)),
          content: str(e.content) || null,
          summary: str(e.summary) || null,
          image: null,
          publishedAt: str(e.published) || str(e.updated) || null,
        }
      })
      .filter((i) => i.url && i.title)
  }
  return []
}

const FEED_PATHS = ['/rss', '/rss.xml', '/feed', '/feed/', '/rss/', '/az/rss', '/ru/rss', '/rss/all', '/feed.xml', '/index.rss', '/rss.php']

/** Finds the RSS/Atom feed of a news site (the url itself, <link rel=alternate>, or common paths). */
export async function discoverFeed(siteUrl: string) {
  const first = await fetchText(siteUrl)
  if (isFeed(first.text)) return first.finalUrl
  const { document } = parseHTML(first.text)
  const candidates = [...document.querySelectorAll('link[rel="alternate"]')]
    .filter((l) => /rss|atom|xml/i.test(l.getAttribute('type') ?? ''))
    .map((l) => new URL(l.getAttribute('href') ?? '', first.finalUrl).href)
  const origin = new URL(first.finalUrl).origin
  for (const url of [...candidates, ...FEED_PATHS.map((p) => origin + p)]) {
    try {
      const r = await fetchText(url, 8_000)
      if (isFeed(r.text) && parseFeed(r.text, r.finalUrl).length) return r.finalUrl
    } catch {
      // try the next candidate
    }
  }
  throw new FetchError('Bu saytda RSS lenti tapılmadı. RSS linkini birbaşa daxil edin (məs. https://sayt.az/rss).')
}

/** HTML → paragraphs of plain text. */
export function paragraphs(html: string) {
  return html
    .replace(/<(script|style|noscript|figure|figcaption|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
    .split(/<\/?(?:p|div|br|h[1-6]|li|blockquote|section|article|tr)\b[^>]*>/i)
    .map((chunk) => plainText(chunk))
    .filter((t) => t.length > 1)
}

export interface Article {
  title: string
  paragraphs: string[]
  image: string | null
}

/** Main text and lead picture of a news page. */
export async function extractArticle(url: string): Promise<Article> {
  const { text, finalUrl } = await fetchText(url)
  const { document } = parseHTML(text)
  const meta = (sel: string) => document.querySelector(sel)?.getAttribute('content')?.trim() || null
  const ogImage = meta('meta[property="og:image"]') ?? meta('meta[name="twitter:image"]')
  const ogTitle = meta('meta[property="og:title"]')
  // Readability mutates the document; it only needs the DOM linkedom gives it.
  const parsed = new Readability(document as unknown as Document, { charThreshold: 300 }).parse()
  return {
    title: plainText(parsed?.title || ogTitle || ''),
    paragraphs: parsed?.content ? paragraphs(parsed.content) : [],
    image: ogImage ? new URL(ogImage, finalUrl).href : null,
  }
}
