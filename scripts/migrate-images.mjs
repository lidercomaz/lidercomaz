// Moves every image referenced by the migrated posts to Supabase Storage as compressed WebP.
//
//   node --env-file=.env.local scripts/migrate-images.mjs upload [--limit N] [--retry-errors]
//   node --env-file=.env.local scripts/migrate-images.mjs apply
//
// upload: reads .data/{az,ru}/posts.json, takes each image from the local DLE backup when possible
//         (falls back to downloading it), converts it to WebP and stores two sizes in the public
//         "images" bucket: <key>.webp (max 1200px, article body) and <key>-s.webp (max 480px, cards).
//         Posts reference them as /img/<key>.webp, served and CDN-cached by app/img/[...path].
//         Progress is saved in .data/storage-map.json, so the command can be stopped and re-run.
// apply:  rewrites image urls in .data/{az,ru}/posts.json using the map (backup: posts.orig.json).
//         Afterwards run scripts/import-supabase.mjs to push the new urls to Supabase.
import { createHash } from 'node:crypto'
import { access, copyFile, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA = path.join(ROOT, '.data')
const MAP_FILE = path.join(DATA, 'storage-map.json')
const BUCKET = 'images'
const PUBLIC_PREFIX = '/img'
const BACKUP = path.resolve(ROOT, process.env.DLE_BACKUP_DIR ?? '../source/site/public_html')
const UPLOADS = { az: path.join(BACKUP, 'uploads'), ru: path.join(BACKUP, 'ru', 'uploads') }
const HOST_LANG = { 'lider.com.az': 'az', 'www.lider.com.az': 'az', 'ru.lider.com.az': 'ru' }
const CONCURRENCY = 6
const SIZES = { full: 1200, small: 480 }


const [cmd, ...flags] = process.argv.slice(2)
const flag = (name) => flags.includes(name)
const limitArg = flags.indexOf('--limit')
const LIMIT = limitArg >= 0 ? Number(flags[limitArg + 1]) : Infinity

const IMG_SRC = /<img[^>]+src="([^"]+)"/g
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const exists = (p) => access(p).then(() => true, () => false)

async function loadPosts(lang, file = 'posts.json') {
  return JSON.parse(await readFile(path.join(DATA, lang, file), 'utf8'))
}

async function loadMap() {
  try {
    return JSON.parse(await readFile(MAP_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function urlsOf(post) {
  const out = new Set()
  if (post.image) out.add(post.image)
  for (const m of post.body.matchAll(IMG_SRC)) out.add(decode(m[1]))
  return out
}

/** Absolute url (relative /uploads/... paths belong to the post's own site). */
function absolute(url, lang) {
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('/')) return `https://${lang === 'ru' ? 'ru.' : ''}lider.com.az${url}`
  return url
}

/** Local file in the DLE backup; prefers the full-size original over medium/ and thumbs/ copies. */
async function localFile(u) {
  const lang = HOST_LANG[u.hostname]
  if (!lang || !u.pathname.startsWith('/uploads/')) return null
  const rel = decodeURIComponent(u.pathname.slice('/uploads/'.length))
  const original = rel.replace(/\/(medium|thumbs)\//, '/')
  for (const candidate of [original, rel]) {
    const file = path.join(UPLOADS[lang], candidate)
    if (file.startsWith(UPLOADS[lang]) && (await exists(file))) return { file, rel: original }
  }
  return null
}

/** Object key without extension: az/posts/2026-10/name, ru/..., or ext/<hash> for other sites. */
function objectKey(u, local) {
  if (local) {
    const lang = HOST_LANG[u.hostname]
    return `${lang}/${local.rel.replace(/\.[a-z0-9]+$/i, '')}`.replace(/[^a-zA-Z0-9/_.-]/g, '-')
  }
  return `ext/${createHash('sha1').update(u.href).digest('hex').slice(0, 20)}`
}

async function fetchImage(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: { 'User-Agent': 'Mozilla/5.0 (lider.com.az image migration)' },
  })
  if (!res.ok) throw new Error(`download ${res.status}`)
  const type = res.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) throw new Error(`download not an image (${type})`)
  return Buffer.from(await res.arrayBuffer())
}

async function variants(buf) {
  const meta = await sharp(buf, { failOn: 'none' }).metadata()
  const render = (width) =>
    sharp(buf, { failOn: 'none', animated: (meta.pages ?? 1) > 1 })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toBuffer()
  return { full: await render(SIZES.full), small: await render(SIZES.small) }
}

let db
function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  return (db ??= createClient(url, key, { auth: { persistSession: false } })).storage
}

async function ensureBucket() {
  const { data } = await storage().getBucket(BUCKET)
  if (data) return
  const { error } = await storage().createBucket(BUCKET, {
    public: true,
    fileSizeLimit: '5MB',
    allowedMimeTypes: ['image/webp', 'image/gif'],
  })
  if (error) throw new Error(`create bucket: ${error.message}`)
}

async function put(key, body) {
  for (let attempt = 1; ; attempt++) {
    const { error } = await storage()
      .from(BUCKET)
      .upload(key, body, { contentType: 'image/webp', cacheControl: '31536000', upsert: true })
    if (!error) return `${PUBLIC_PREFIX}/${key}`
    if (attempt >= 5) throw new Error(`upload: ${error.message}`)
    await sleep(attempt * 3000)
  }
}

async function migrateOne(url, lang) {
  const u = new URL(absolute(url, lang))
  const local = await localFile(u)
  const src = local ? await readFile(local.file) : await fetchImage(u.href)
  const { full, small } = await variants(src)
  const key = objectKey(u, local)
  const [fullUrl, smallUrl] = await Promise.all([put(`${key}.webp`, full), put(`${key}-s.webp`, small)])
  return { url: fullUrl, small: smallUrl, source: local ? 'local' : 'remote', bytes: full.length + small.length }
}

async function runUpload() {
  await ensureBucket()
  const map = await loadMap()
  const todo = []
  const seen = new Set()
  for (const lang of ['az', 'ru']) {
    const source = (await exists(path.join(DATA, lang, 'posts.orig.json'))) ? 'posts.orig.json' : 'posts.json'
    for (const post of await loadPosts(lang, source)) {
      for (const url of urlsOf(post)) {
        if (seen.has(url)) continue
        seen.add(url)
        const done = map[url]
        if (done?.url || (done?.error && !flag('--retry-errors'))) continue
        todo.push({ url, lang })
      }
    }
  }
  const batch = todo.slice(0, LIMIT)
  console.log(`images: ${seen.size} total, ${batch.length} to upload now`)

  let i = 0
  let ok = 0
  let failed = 0
  let bytes = 0
  const save = () => writeFile(MAP_FILE, JSON.stringify(map))
  async function worker() {
    while (i < batch.length) {
      const { url, lang } = batch[i++]
      try {
        map[url] = await migrateOne(url, lang)
        bytes += map[url].bytes
        ok++
      } catch (e) {
        map[url] = { error: String(e.message ?? e).slice(0, 200) }
        failed++
      }
      if ((ok + failed) % 50 === 0) {
        await save()
        process.stdout.write(`\r${ok + failed}/${batch.length} (ok ${ok}, failed ${failed})`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  await save()
  console.log(`\nDone: ok ${ok}, failed ${failed}, stored ${(bytes / 1e6).toFixed(1)} MB. Map: ${MAP_FILE}`)
}

async function runApply() {
  const map = await loadMap()
  const full = (u) => map[u]?.url ?? u
  for (const lang of ['az', 'ru']) {
    const file = path.join(DATA, lang, 'posts.json')
    const orig = path.join(DATA, lang, 'posts.orig.json')
    if (!(await exists(orig))) await copyFile(file, orig)
    const posts = await loadPosts(lang, 'posts.orig.json')
    let changed = 0
    for (const p of posts) {
      const before = p.body + p.image
      if (p.image) p.image = map[p.image]?.small ?? p.image
      p.body = p.body.replace(IMG_SRC, (tag, src) => tag.replace(src, full(decode(src)).replace(/&/g, '&amp;')))
      if (p.body + p.image !== before) changed++
    }
    await writeFile(file, JSON.stringify(posts))
    const left = posts.filter((p) => [...urlsOf(p)].some((u) => !u.startsWith(`${PUBLIC_PREFIX}/`))).length
    console.log(`${lang}: ${changed} posts updated, ${left} still reference images outside Supabase Storage`)
  }
}

if (cmd === 'upload') await runUpload()
else if (cmd === 'apply') await runApply()
else console.log('usage: migrate-images.mjs upload [--limit N] [--retry-errors] | apply')
