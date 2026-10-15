import type { Lang } from './types'

/**
 * ru.lider.com.az (or ru.localhost) serves the Russian site; everything else is Azerbaijani.
 * "ru-" also matches, so a test domain like ru-lider.vercel.app shows the Russian site.
 */
export function langFromHost(host: string | null): Lang {
  return host && /^ru[.-]/.test(host) ? 'ru' : 'az'
}

// Same split as DLE's smartphone template: phones get the mobile layout, tablets the desktop one.
const MOBILE_UA = /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|Opera Mini|IEMobile|BlackBerry/i

export function isMobileUA(ua: string | null) {
  return Boolean(ua && MOBILE_UA.test(ua))
}
