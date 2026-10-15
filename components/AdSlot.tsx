'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    smartbee?: { runAinsyndication?: () => void }
  }
}

const SCRIPT = 'https://code.ainsyndication.com/v2/js/slot.js?12012022'

// runAinsyndication walks a live HTMLCollection while renaming items, so one pass may fill
// only every other slot (the original theme included the script once per banner).
function fill() {
  for (let i = 0; i < 6 && document.getElementsByClassName('ainsyndication').length; i++) {
    window.smartbee?.runAinsyndication?.()
  }
}

/** One ainsyndication banner (160x600 by default). The ad script rewrites its <ins>, so it is created outside React. */
export function AdSlot({ slot, width = 160, height = 600 }: { slot: string; width?: number; height?: number }) {
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = box.current
    if (!el || el.childElementCount) return
    const ins = document.createElement('ins')
    ins.className = 'ainsyndication'
    ins.style.cssText = `display:block; width:${width}px; height:${height}px;`
    ins.setAttribute('data-ad-slot', slot)
    el.appendChild(ins)
    if (window.smartbee?.runAinsyndication) {
      fill()
    } else {
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`)
      if (!s) {
        s = document.createElement('script')
        s.src = SCRIPT
        s.async = true
        document.body.appendChild(s)
      }
      s.addEventListener('load', fill, { once: true })
    }
  }, [slot, width, height])

  return <div className="ad-slot" ref={box} style={{ width, minHeight: height }} />
}
