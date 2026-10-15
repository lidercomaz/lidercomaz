'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    smartbee?: { runAinsyndication?: () => void }
  }
}

const SCRIPT = 'https://code.ainsyndication.com/v2/js/slot.js?12012022'

/**
 * Left/right 160x600 banners from the original main.tpl (ainsyndication).
 * The ad script rewrites its <ins> elements, so they are created outside React.
 */
export function SideAds({ slot }: { slot: string }) {
  const left = useRef<HTMLDivElement>(null)
  const right = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Desktop-wide screens only (see .reklamsol/.reklamsag in enhance.css).
    if (!window.matchMedia('(min-width: 1660px)').matches) return
    for (const box of [left.current, right.current]) {
      if (!box || box.childElementCount) continue
      const ins = document.createElement('ins')
      ins.className = 'ainsyndication'
      ins.style.cssText = 'display:block; width:160px; height:600px;'
      ins.setAttribute('data-ad-slot', slot)
      box.appendChild(ins)
    }
    if (window.smartbee?.runAinsyndication) {
      window.smartbee.runAinsyndication()
    } else if (!document.querySelector(`script[src="${SCRIPT}"]`)) {
      const s = document.createElement('script')
      s.src = SCRIPT
      s.async = true
      document.body.appendChild(s)
    }
  }, [slot])

  return (
    <>
      <div className="reklamsol" ref={left} />
      <div className="reklamsag" ref={right} />
    </>
  )
}
