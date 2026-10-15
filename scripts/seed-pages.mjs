// Upserts content/pages.json into the Supabase `pages` table (About, Contact, legal pages...).
// Usage: node --env-file=.env.local scripts/seed-pages.mjs
import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const pages = JSON.parse(await readFile(new URL('../content/pages.json', import.meta.url), 'utf8'))
const rows = Object.entries(pages).flatMap(([lang, bySlug]) =>
  Object.entries(bySlug).map(([slug, p]) => ({ lang, slug, title: p.title, body: p.body, updated_at: new Date().toISOString() })),
)
const { error } = await db.from('pages').upsert(rows, { onConflict: 'lang,slug' })
if (error) throw new Error(error.message)
console.log(`pages upserted: ${rows.length}`)
