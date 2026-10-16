import 'server-only'
import { FinishReason, Type } from '@google/genai'
import { z } from 'zod'
import { adminDb } from '../admin/db'
import { deleteStory } from '../admin/posts'
import { generate } from '../admin/translate'
import type { Lang } from '../types'

const Output = z.object({ groups: z.array(z.array(z.number().int())) })

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    groups: {
      type: Type.ARRAY,
      description: 'groups of post numbers that report the same news event; only groups with two or more posts',
      items: { type: Type.ARRAY, items: { type: Type.INTEGER } },
    },
  },
  required: ['groups'],
}

const STOP = /^(və|ilə|bu|da|də|ki|üçün|olub|edib|bir|и|в|на|с|по|о|для|не|что|из|к|от|за)$/

const stems = (title: string) =>
  new Set(title.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.test(w)).map((w) => w.slice(0, 5)))

/** Sanity check against a wrong grouping: real duplicates share at least two word stems in the headline. */
function related(a: string, b: string) {
  const x = stems(a)
  let shared = 0
  for (const w of stems(b)) if (x.has(w)) shared++
  return shared >= 2
}

interface Row {
  id: number
  title: string
  excerpt: string | null
  created_at: string
}

/**
 * Finds stories of the last 36 h on one site that report the same event (e.g. taken from two sources) and
 * deletes the later bot copies, together with their translations. Posts written in the panel are never deleted.
 * Returns the number of deleted posts.
 */
export async function removeDuplicates(lang: Lang): Promise<number> {
  const db = adminDb()
  const since = new Date(Date.now() - 36 * 3600e3).toISOString()
  const posts = (await db.from('posts').select('id,title,excerpt,created_at').eq('lang', lang).gte('created_at', since).order('id').limit(200)).data as Row[] | null
  if (!posts || posts.length < 2) return 0

  // Which of them the bot made (only those may be deleted).
  const { data: items } = await db.from('source_items').select('id,post_id').eq('post_lang', lang).in('post_id', posts.map((p) => p.id))
  const botItem = new Map((items ?? []).map((i: { id: number; post_id: number }) => [i.post_id, i.id]))
  if (!botItem.size) return 0

  const response = await generate({
    contents: JSON.stringify(posts.map((p, i) => ({ n: i + 1, title: p.title, lead: (p.excerpt ?? '').slice(0, 220) }))),
    config: {
      systemInstruction:
        'You check a news site for duplicate stories. Group the posts that report the SAME specific news event ' +
        '(same people or organisation, same action, same occasion), even when worded differently. ' +
        'Posts that only share a topic, or a follow-up with substantial new facts, are NOT duplicates. ' +
        'Return only groups of two or more post numbers; when unsure, leave the posts out.',
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      temperature: 0,
    },
  }, 60_000)
  if (response.candidates?.[0]?.finishReason && response.candidates[0].finishReason !== FinishReason.STOP) return 0
  let parsed
  try {
    parsed = Output.safeParse(JSON.parse(response.text ?? ''))
  } catch {
    return 0
  }
  if (!parsed.success) return 0

  let deleted = 0
  for (const group of parsed.data.groups) {
    const members = [...new Set(group)].map((n) => posts[n - 1]).filter(Boolean)
    if (members.length < 2) continue
    // Keep a post written in the panel if there is one, otherwise the earliest; delete later bot copies.
    const keep = members.find((p) => !botItem.has(p.id)) ?? members[0]
    for (const p of members) {
      if (p.id === keep.id || !botItem.has(p.id) || !related(keep.title, p.title)) continue
      try {
        await deleteStory(lang, p.id, true)
        await db.from('source_items').update({ status: 'skipped', post_id: null, error: `Dublikat — silindi ("${keep.title.slice(0, 120)}" saxlanıldı)`, updated_at: new Date().toISOString() }).eq('id', botItem.get(p.id)!)
        deleted++
      } catch (err) {
        console.error('[dedupe]', lang, p.id, err)
      }
    }
  }
  return deleted
}
