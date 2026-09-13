'use client'

import { useState } from 'react'
import { BadgeIllustration } from '@/components/badges/BadgeIllustration'
import {
  SIZE_CLASSES,
  discoBackClasses,
  type BadgeDiscoSize,
} from '@/components/badges/badge-disco-shared'

type Props = {
  rarity: string
  iconKey: string
  locked?: boolean
  size?: BadgeDiscoSize
  className?: string
  label?: string
}

export function BadgeDisco({
  rarity = 'comun',
  iconKey,
  locked = false,
  size = 'md',
  className = '',
  label,
}: Props) {
  const [spinning, setSpinning] = useState(false)

  return (
    <button
      type="button"
      title={label}
      aria-label={label ? `Insignia ${label}` : 'Insignia'}
      className={`badge-disco-scene ${SIZE_CLASSES[size]} cursor-pointer rounded-full border-0 bg-transparent p-0 motion-reduce:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B1A] ${className}`}
      onClick={() => {
        if (spinning) return
        if (
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          return
        }
        setSpinning(true)
      }}
    >
      <div
        className={`relative h-full w-full [transform-style:preserve-3d] ${spinning ? 'badge-disco-spin' : ''}`}
        onAnimationEnd={() => setSpinning(false)}
      >
        <div className="badge-disco-face absolute inset-0">
          <BadgeIllustration
            iconKey={iconKey}
            rarity={rarity}
            locked={locked}
            className="h-full w-full"
          />
        </div>
        <div
          className={`badge-disco-face badge-disco-face-back absolute inset-0 grid place-items-center rounded-full ${discoBackClasses(rarity, locked)}`}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" aria-hidden>
            <circle cx={12} cy={12} r={9} fill="none" stroke="currentColor" strokeWidth={1.4} />
            <circle cx={12} cy={12} r={5} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.5} />
          </svg>
        </div>
      </div>
    </button>
  )
}
