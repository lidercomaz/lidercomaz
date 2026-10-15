'use client'

import { useEffect, useState } from 'react'

const SIZES = [14, 16, 19]

/** fullstory.tpl text size buttons (A- / A / A+), applied to #full-post-article. */
export function FontSize() {
  const [size, setSize] = useState<number | null>(null)

  useEffect(() => {
    const el = document.getElementById('full-post-article')
    if (el && size) el.style.fontSize = `${size}px`
  }, [size])

  return (
    <div className="f-size">
      <ul>
        <li className="text-small" onClick={() => setSize(SIZES[0])} />
        <li className="text-n" onClick={() => setSize(SIZES[1])} />
        <li className="text-big" onClick={() => setSize(SIZES[2])} />
      </ul>
    </div>
  )
}
