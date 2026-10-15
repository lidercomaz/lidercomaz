import type { Lang } from './types'

/** ru.lider.com.az (or ru.localhost) serves the Russian site; everything else is Azerbaijani. */
export function langFromHost(host: string | null): Lang {
  return host?.startsWith('ru.') ? 'ru' : 'az'
}
