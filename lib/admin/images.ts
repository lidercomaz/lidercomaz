import 'server-only'
import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { adminDb } from './db'

const BUCKET = 'images'
const MAX_BYTES = 15 * 1024 * 1024
const SIZES = { full: 1200, small: 480 }

export class ImageError extends Error {}

async function variants(buf: Buffer) {
  let meta
  try {
    meta = await sharp(buf, { failOn: 'none' }).metadata()
  } catch {
    throw new ImageError('Şəkil oxunmadı (dəstəklənməyən format)')
  }
  if (!meta.width) throw new ImageError('Şəkil oxunmadı')
  const render = (width: number) =>
    sharp(buf, { failOn: 'none', animated: (meta.pages ?? 1) > 1 })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer()
  const [full, small] = await Promise.all([render(SIZES.full), render(SIZES.small)])
  return { full, small }
}

async function put(key: string, body: Buffer) {
  const { error } = await adminDb()
    .storage.from(BUCKET)
    .upload(key, body, { contentType: 'image/webp', cacheControl: '31536000', upsert: false })
  if (error) throw new Error(`Storage: ${error.message}`)
  return `/img/${key}`
}

interface ImgbbResponse {
  success?: boolean
  data?: { url: string; display_url?: string }
  error?: { message?: string }
}

/** Uploads one file to imgbb (https://api.imgbb.com) and returns its direct url (i.ibb.co/…). */
async function putImgbb(body: Buffer, name: string) {
  const key = process.env.IMGBB_API_KEY!
  for (let attempt = 0; ; attempt++) {
    const form = new FormData()
    form.append('key', key)
    form.append('name', name)
    form.append('image', new Blob([new Uint8Array(body)], { type: 'image/webp' }), `${name}.webp`)
    try {
      const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(30_000) })
      const json = (await res.json().catch(() => ({}))) as ImgbbResponse
      if (res.ok && json.success && json.data?.url) return json.data.url
      if (res.status === 400 && /key/i.test(json.error?.message ?? '')) throw new ImageError('IMGBB_API_KEY yanlışdır')
      if (attempt >= 1 || (res.status < 500 && res.status !== 429)) {
        throw new ImageError(`imgbb şəkli qəbul etmədi: ${json.error?.message ?? `HTTP ${res.status}`}`)
      }
    } catch (err) {
      if (err instanceof ImageError) throw err
      if (attempt >= 1) throw new ImageError(`imgbb-yə yükləmə alınmadı: ${(err as Error).message}`)
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
}

/**
 * Stores a picture as WebP (1200px article + 480px card) on imgbb and returns the card url and the full url.
 * New pictures never go to Supabase (its free storage is kept for data); the migrated archive stays in
 * the Supabase "images" bucket and is served as /img/….
 */
export async function storeImage(buf: Buffer) {
  if (!process.env.IMGBB_API_KEY) throw new ImageError('Şəkil yükləmək üçün IMGBB_API_KEY təyin edilməyib (Vercel → Environment Variables)')
  if (buf.length > MAX_BYTES) throw new ImageError('Şəkil 15 MB-dan böyükdür')
  const { full, small } = await variants(buf)
  const name = `lider-${Date.now()}-${randomBytes(3).toString('hex')}`
  const [fullUrl, smallUrl] = await Promise.all([putImgbb(full, name), putImgbb(small, `${name}-s`)])
  return { image: smallUrl, full: fullUrl }
}

/** Old Supabase Storage upload, kept only for maintenance scripts. */
export async function storeImageInSupabase(buf: Buffer) {
  if (buf.length > MAX_BYTES) throw new ImageError('Şəkil 15 MB-dan böyükdür')
  const { full, small } = await variants(buf)
  const now = new Date()
  const key = `posts/${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}/${now.getTime()}-${randomBytes(4).toString('hex')}`
  const [fullUrl, smallUrl] = await Promise.all([put(`${key}.webp`, full), put(`${key}-s.webp`, small)])
  return { image: smallUrl, full: fullUrl }
}

/** Downloads a picture from a public http(s) url (bot input) and stores it. */
export async function storeImageFromUrl(url: string) {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    throw new ImageError('Şəkil linki yanlışdır')
  }
  if (!/^https?:$/.test(u.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/.test(u.hostname)) {
    throw new ImageError('Şəkil linki yanlışdır')
  }
  const res = await fetch(u, { signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LiderBot/1.0)' } })
  if (!res.ok) throw new ImageError(`Şəkil yüklənmədi (HTTP ${res.status})`)
  if (Number(res.headers.get('content-length')) > MAX_BYTES) throw new ImageError('Şəkil 15 MB-dan böyükdür')
  return storeImage(Buffer.from(await res.arrayBuffer()))
}
