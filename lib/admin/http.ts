import 'server-only'
import { isAuthorized } from './auth'
import { ImageError } from './images'
import { InputError } from './posts'
import { TranslateError } from './translate'
import { FetchError } from '../bot/fetch'
import { SetupError } from '../bot/sources'

const NO_STORE = { 'Cache-Control': 'no-store' }

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE })

/** Wraps an admin route handler: requires a session cookie or the bot token, maps known errors to 4xx. */
export function adminRoute<C>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    if (!(await isAuthorized(req))) return json({ error: 'Giriş tələb olunur' }, 401)
    try {
      return await handler(req, ctx)
    } catch (err) {
      if (err instanceof InputError || err instanceof ImageError || err instanceof FetchError) return json({ error: err.message }, 400)
      if (err instanceof SetupError) return json({ error: err.message }, 503)
      if (err instanceof TranslateError) return json({ error: err.message }, 502)
      console.error('[admin]', err)
      return json({ error: err instanceof Error ? err.message : 'Server xətası' }, 500)
    }
  }
}

export async function readJson(req: Request) {
  try {
    return await req.json()
  } catch {
    throw new InputError('JSON oxunmadı')
  }
}
