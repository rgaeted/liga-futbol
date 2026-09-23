'use client'

import { useEffect, useState } from 'react'

const INTERVAL_MS = 7000
const FADE_MS = 1200

export function LosLunesHeroRotatingBackground({
  images,
}: {
  images: readonly string[]
}) {
  const [index, setIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(true)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (reduceMotion || images.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length)
    }, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [images.length, reduceMotion])

  if (images.length === 0) return null

  return (
    <div className="absolute inset-0" aria-hidden>
      {images.map((src, imageIndex) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover brightness-[0.68] contrast-[1.1] transition-opacity ease-in-out ${
            imageIndex === 0 ? 'object-[72%_30%]' : 'object-[center_30%]'
          } ${imageIndex === index ? 'opacity-100' : 'opacity-0'}`}
          style={{ transitionDuration: `${FADE_MS}ms` }}
        />
      ))}
    </div>
  )
}
