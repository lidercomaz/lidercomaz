'use client'

import { useEffect, useRef, useState } from 'react'
import { NO_IMAGE } from '@/lib/format'
import { PostTitle } from '../PostTitle'
import type { CardWithHref } from '../NewsItem'

type Slide = CardWithHref & { date: string; categoryName: string }

/** smartphone/slider.tpl, replaces owl.carousel (arrows, swipe, 5s autoplay). */
export function MSlider({ posts }: { posts: Slide[] }) {
  const [active, setActive] = useState(0)
  const touchX = useRef<number | null>(null)
  const n = posts.length
  const go = (d: number) => setActive((i) => (i + d + n) % n)

  useEffect(() => {
    if (n < 2) return
    const t = setInterval(() => setActive((i) => (i + 1) % n), 5000)
    return () => clearInterval(t)
  }, [n, active])

  return (
    <div className="main-slider">
      <div
        className="main-slider-wrap owl-carousel owl-loaded"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        <div className="owl-stage-outer">
          <div
            className="owl-stage"
            style={{ width: `${n * 100}%`, transform: `translateX(-${(active * 100) / n}%)`, transition: 'transform .4s ease' }}
          >
            {posts.map((p, i) => (
              <div key={p.id} className="owl-item" style={{ width: `${100 / n}%` }}>
                <div className="main-slider-item">
                  <a href={p.href}>
                    <div className="main-slider-image">
                      <img src={p.image ?? NO_IMAGE} height={220} alt="" loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : 'auto'} />
                      <div className="main-slider-extra">
                        <div className="main-slider-category">{p.categoryName}</div>
                        <div className="main-slider-date">{p.date}</div>
                      </div>
                    </div>
                    <div className="main-slider-info">
                      <h2 className="main-slider-title"><PostTitle post={p} /></h2>
                    </div>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
        {n > 1 && (
          <div className="owl-nav">
            <button type="button" className="owl-prev" aria-label="Prev" onClick={() => go(-1)} />
            <button type="button" className="owl-next" aria-label="Next" onClick={() => go(1)} />
          </div>
        )}
      </div>
    </div>
  )
}
