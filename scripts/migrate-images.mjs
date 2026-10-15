// Moves every image referenced by the migrated posts to imgbb as compressed WebP.
//
//   node --env-file=.env.local scripts/migrate-images.mjs upload [--limit N] [--retry-errors]
//   node --env-file=.env.local scripts/migrate-images.mjs apply
//
// upload: reads .data/{az,ru}/posts.json, takes each image from the local DLE backup when possible
//         (falls back to downloading it), converts to WebP (max 1200px) and uploads it to imgbb.
//         Progress is saved in .data/image-map.json, so the command can be stopped and re-run.
// apply:  rewrites image urls in .data/{az,ru}/posts.json using the map (backup: posts.orig.json).
//         Afterwards run scripts/import-supabase.mjs to push the new urls to Supabase.
import { copyFile, readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA = path.join(ROOT, '.data')
const MAP_FILE = path.join(DATA, 'image-map.json')
const BACKUP = path.resolve(ROOT, process.env.DLE_BACKUP_DIR ?? '../source/site/public_html')
const UPLOADS = { az: path.join(BACKUP, 'uploads'), ru: path.join(BACKUP, 'ru', 'uploads') }
const HOST_LANG = { 'lider.com.az': 'az', 'www.lider.com.az': 'az', 'ru.lider.com.az': 'ru' }
const KEY = process.env.IMGBB_API_KEY
const CONCURRENCY = 2
const MAX_WIDTH = 1200

const [cmd, ...flags] = process.argv.slice(2)
const flag = (name) => flags.includes(name)
const limitArg = flags.indexOf('--limit')
const LIMIT = limitArg >= 0 ? Number(flags[limitArg + 1]) : Infinity

const IMG_SRC = /<img[^>]+src="([^"]+)"/g
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const exists = (p) => access(p).then(() => true, () => false)

async function loadPosts(lang) {
  return JSON.parse(await readFile(path.join(DATA, lang, 'posts.json'), 'utf8'))
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
async function localFile(url) {
  let u
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const lang = HOST_LANG[u.hostname]
  if (!lang || !u.pathname.startsWith('/uploads/')) return null
  const rel = decodeURIComponent(u.pathname.slice('/uploads/'.length))
  const original = rel.replace(/\/(medium|thumbs)\//, '/')
  for (const candidate of [original, rel]) {
    const file = path.join(UPLOADS[lang], candidate)
    if (file.startsWith(UPLOADS[lang]) && (await exists(file))) return file
  }
  return null
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

async function toWebp(buf) {
  const img = sharp(buf, { failOn: 'none', animated: true })
  const meta = await img.metadata()
  if ((meta.pages ?? 1) > 1) return { buf, ext: meta.format } // keep animations as they are
  const out = await img.rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
  return { buf: out.length < buf.length || meta.format !== 'webp' ? out : buf, ext: 'webp' }
}

// imgbb throttles bursts ("Rate limit reached"); all workers pause together and retry.
let pausedUntil = 0
let backoff = 5 * 60_000
async function waitIfPaused() {
  while (Date.now() < pausedUntil) await sleep(Math.min(pausedUntil - Date.now(), 30_000))
}

async function upload(buf, name) {
  for (let attempt = 1; ; attempt++) {
    await waitIfPaused()
    const body = new FormData()
    body.set('image', buf.toString('base64'))
    body.set('name', name)
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${KEY}`, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(60_000),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }))
    if (res.ok) {
      backoff = 5 * 60_000
      const { data } = await res.json()
      return { url: data.url, medium: data.medium?.url ?? data.url, thumb: data.thumb?.url ?? data.url }
    }
    const text = (await res.text()).slice(0, 200)
    if (/rate limit/i.test(text) || res.status === 429) {
      if (Date.now() >= pausedUntil) {
        pausedUntil = Date.now() + backoff
        console.log(`\n${new Date().toLocaleTimeString()} imgbb rate limit, pausing ${backoff / 60_000} min`)
        backoff = Math.min(backoff * 2, 60 * 60_000)
      }
      continue
    }
    if (attempt >= 4 || (res.status >= 400 && res.status < 500)) throw new Error(`imgbb ${res.status}: ${text}`)
    await sleep(attempt * 5000)
  }
}

async function migrateOne(url, lang) {
  const abs = absolute(url, lang)
  const file = await localFile(abs)
  const src = file ? await readFile(file) : await fetchImage(abs)
  const { buf } = await toWebp(src)
  const name = path.parse(new URL(abs).pathname).name.slice(0, 100)
  return { ...(await upload(buf, name)), source: file ? 'local' : 'remote', bytes: buf.length }
}

async function runUpload() {
  if (!KEY) throw new Error('IMGBB_API_KEY is missing')
  const map = await loadMap()
  const todo = []
  const seen = new Set()
  for (const lang of ['az', 'ru']) {
    for (const post of await loadPosts(lang)) {
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
  let saved = 0
  const save = () => writeFile(MAP_FILE, JSON.stringify(map))
  async function worker() {
    while (i < batch.length) {
      const { url, lang } = batch[i++]
      try {
        map[url] = await migrateOne(url, lang)
        ok++
      } catch (e) {
        map[url] = { error: String(e.message ?? e).slice(0, 200) }
        failed++
      }
      if ((ok + failed) % 25 === 0) {
        await save()
        process.stdout.write(`\r${ok + failed}/${batch.length} (ok ${ok}, failed ${failed})`)
      }
      if (map[url].bytes) saved += map[url].bytes
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  await save()
  console.log(`\nDone: ok ${ok}, failed ${failed}, uploaded ${(saved / 1e6).toFixed(1)} MB. Map: ${MAP_FILE}`)
}

async function runApply() {
  const map = await loadMap()
  const full = (u) => map[u]?.url ?? u
  for (const lang of ['az', 'ru']) {
    const file = path.join(DATA, lang, 'posts.json')
    const orig = path.join(DATA, lang, 'posts.orig.json')
    if (!(await exists(orig))) await copyFile(file, orig)
    const posts = JSON.parse(await readFile(orig, 'utf8'))
    let changed = 0
    for (const p of posts) {
      const before = p.body + p.image
      if (p.image) p.image = map[p.image]?.medium ?? p.image
      p.body = p.body.replace(IMG_SRC, (tag, src) => tag.replace(src, full(decode(src)).replace(/&/g, '&amp;')))
      if (p.body + p.image !== before) changed++
    }
    await writeFile(file, JSON.stringify(posts))
    const left = posts.filter((p) => [...urlsOf(p)].some((u) => !u.includes('i.ibb.co'))).length
    console.log(`${lang}: ${changed} posts updated, ${left} still reference non-imgbb images`)
  }
}

if (cmd === 'upload') await runUpload()
else if (cmd === 'apply') await runApply()
else console.log('usage: migrate-images.mjs upload [--limit N] [--retry-errors] | apply')
