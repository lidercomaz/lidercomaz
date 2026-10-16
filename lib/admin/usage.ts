import 'server-only'
import { dailyLimit, postsToday } from '../bot/sources'
import { adminDb } from './db'

const MB = 1024 * 1024
/** Supabase free plan. */
export const LIMITS = { dbBytes: 500 * MB, storageBytes: 1024 * MB }
/** A post with its share of the indexes (measured on this database). */
const BYTES_PER_POST = 5 * 1024

export async function usage() {
  const db = adminDb()
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
  const [sizes, total, week, azToday, ruToday] = await Promise.all([
    db.rpc('storage_usage').then((r) => (r.error ? null : (r.data as { db_bytes: number; posts_bytes: number; storage_bytes: number }))),
    db.from('posts').select('id', { count: 'exact', head: true }),
    // New posts only (the archive imported from DLE has a recent created_at but an old published_at).
    db.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo).gte('published_at', weekAgo),
    postsToday('az'),
    postsToday('ru'),
  ])
  const posts = total.count ?? 0
  // Without the SQL helper (003_usage.sql) the size is estimated from the number of posts.
  // Base: Postgres itself plus the Storage metadata of the image archive (measured ≈ 55 MB).
  const dbBytes = sizes?.db_bytes ?? 55 * MB + posts * BYTES_PER_POST
  const perDay = (week.count ?? 0) / 7
  const cappedPerDay = Math.min(perDay, dailyLimit('az') + dailyLimit('ru'))
  const room = Math.max(0, LIMITS.dbBytes * 0.95 - dbBytes)
  return {
    measured: sizes !== null,
    dbBytes,
    storageBytes: sizes?.storage_bytes ?? null,
    posts,
    perDay: Math.round(perDay),
    today: { az: azToday, ru: ruToday },
    limits: { az: dailyLimit('az'), ru: dailyLimit('ru'), dbBytes: LIMITS.dbBytes, storageBytes: LIMITS.storageBytes },
    /** Years until 95 % of the database is used, at the last week's pace (capped by the daily limits). */
    yearsLeft: cappedPerDay > 0 ? Math.round((room / (cappedPerDay * BYTES_PER_POST) / 365) * 10) / 10 : null,
    yearsAtLimit: Math.round((room / ((dailyLimit('az') + dailyLimit('ru')) * BYTES_PER_POST) / 365) * 10) / 10,
  }
}
