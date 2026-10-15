import type { Lang } from './types'

/**
 * ru.lider.com.az (or ru.localhost) serves the Russian site; everything else is Azerbaijani.
 * "ru-" also matches, so a test domain like ru-lider.vercel.app shows the Russian site.
 */
export function langFromHost(host: string | null): Lang {
  return host && /^ru[.-]/.test(host) ? 'ru' : 'az'
}
