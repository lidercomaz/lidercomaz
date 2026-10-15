'use client'

import { useEffect, useState } from 'react'
import { NO_IMAGE } from '@/lib/format'
import { PostTitle } from './PostTitle'
import type { CardWithHref } from './NewsItem'

interface Props {
  posts: (CardWithHref & { date: string })[]
  readMore: string
}

/** manset.tpl + mansetalt.tpl, replaces owl.carousel (autoplay 5s, thumbs switch slides). */
export function MainSlider({ posts, readMore }: Props) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || posts.length < 2) return
    const t = setInterval(() => setActive((i) => (i + 1) % posts.length), 5000)
    return () => clearInterval(t)
  }, [paused, posts.length])

  return (
    <div className="m-slider" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="m-slider-wrap owl-carousel">
        {posts.map((p, i) => (
          <div key={p.id} className={`m-slider-item${i === active ? ' active' : ''}`}>
            <a href={p.href}>
              <div className="m-slider-image">
                <img src={p.image ?? NO_IMAGE} alt="" style={{ height: 410 }} />
              </div>
              <div className="m-slider-info">
                <h2 className="m-slider-title">
                  <PostTitle post={p} />
                </h2>
                <div className="m-slider-extra">
                  <div className="m-slider-date">{p.date}</div>
                  <div className="m-slider-details"><span>{readMore}</span></div>
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>
      <div className="thumbs">
        {posts.map((p, i) => (
          <div
            key={p.id}
            className={`thumb-item${i === active ? ' active' : ''}`}
            onClick={() => setActive(i)}
            onMouseEnter={() => setActive(i)}
          >
            <div className="thumb-image"><img src={p.image ?? NO_IMAGE} alt="" style={{ height: 81 }} /></div>
            <div className="thumb-info">
              <h2 className="thumb-title">
                <PostTitle post={p} />
              </h2>
              <div className="thumb-date">{p.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
