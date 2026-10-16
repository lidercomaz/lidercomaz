import sanitizeHtml from 'sanitize-html'

const TRANSLIT: Record<string, string> = {
  ə: 'e', ı: 'i', ö: 'o', ü: 'u', ğ: 'g', ş: 's', ç: 'c',
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/** URL slug from an AZ or RU title: "Bakıda güclü külək" → "bakida-guclu-kulek". */
export function slugify(title: string) {
  const ascii = title
    .toLocaleLowerCase('az')
    .replace(/i̇/g, 'i')
    .replace(/[^\u0000-\u007f]/g, (c) => TRANSLIT[c] ?? c.normalize('NFD').replace(/[̀-ͯ]/g, ''))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (ascii.length <= 80) return ascii || 'xeber'
  const cut = ascii.slice(0, 80)
  return cut.slice(0, cut.lastIndexOf('-') > 40 ? cut.lastIndexOf('-') : 80)
}

const IFRAME_HOSTS = ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com', 'www.facebook.com', 'www.instagram.com']

/** Allow-list for article HTML (admin editor and bot input). */
export function cleanHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'a', 'img', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol', 'li', 'span', 'div', 'iframe', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'title'],
      span: ['style'],
      p: ['style'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedStyles: {
      span: { color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i, /^red$/i] },
      p: { 'text-align': [/^(left|right|center|justify)$/] },
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
    allowedIframeHostnames: IFRAME_HOSTS,
    transformTags: {
      a: (tag, attribs) => ({
        tagName: 'a',
        attribs: /^https?:\/\//.test(attribs.href ?? '') && !/^https?:\/\/(ru\.)?lider\.com\.az/.test(attribs.href)
          ? { ...attribs, target: '_blank', rel: 'noopener' }
          : attribs,
      }),
      img: (tag, attribs) => ({ tagName: 'img', attribs: { ...attribs, loading: 'lazy' } }),
    },
    exclusiveFilter: (frame) => ['p', 'span', 'b', 'strong', 'i', 'em'].includes(frame.tag) && !frame.text.trim() && !frame.mediaChildren.length,
  }).trim()
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

/** Plain text (e.g. from an e-mail bot) → paragraphs. Strings that already contain HTML pass through. */
export function toHtml(input: string) {
  if (/<\/?(p|br|div|b|strong|img|iframe|h[2-4]|ul|ol|blockquote|span|a)\b/i.test(input)) return input
  return input
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escape(para).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function plainText(html: string) {
  return sanitizeHtml(html.replace(/<(br|\/p|\/div|\/h[2-4]|\/li)\b[^>]*>/gi, ' '), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Same length as the migrated DLE excerpts (~300 chars, cut at a word). */
export function makeExcerpt(html: string, max = 300) {
  const text = plainText(html)
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 40)).trim()
}

/** Full-size picture for a stored card thumbnail (`…-s.webp` → `….webp`). */
export const fullImage = (image: string) => image.replace(/-s\.webp$/, '.webp')

/** The lead picture is stored as the first element of the body (as in the migrated posts). */
export function withLeadImage(body: string, image: string | null, alt: string) {
  return image ? `<img src="${escape(fullImage(image))}" alt="${escape(alt)}" loading="lazy">${body}` : body
}

export function withoutLeadImage(body: string, image: string | null) {
  if (!image) return body
  const m = /^\s*<img\b[^>]*\bsrc="([^"]+)"[^>]*>/i.exec(body)
  return m && m[1] === fullImage(image) ? body.slice(m[0].length) : body
}
