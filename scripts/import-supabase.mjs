// Imports .data/{az,ru}/{categories,posts}.json into Supabase (idempotent upsert).
// Usage: node --env-file=.env.local scripts/import-supabase.mjs
import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })
const BATCH = 300

async function upsert(table, rows) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + BATCH), { onConflict: 'lang,id' })
    if (error) throw new Error(`${table} batch ${i}: ${error.message}`)
    process.stdout.write(`\r${table}: ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
  }
  process.stdout.write('\n')
}

for (const lang of ['az', 'ru']) {
  const read = async (f) => JSON.parse(await readFile(new URL(`../.data/${lang}/${f}.json`, import.meta.url), 'utf8'))
  await upsert('categories', await read('categories'))
  await upsert('posts', await read('posts'))
}

const { error } = await db.rpc('sync_post_sequences')
if (error) throw new Error(`sync_post_sequences: ${error.message}`)
console.log('Done.')
