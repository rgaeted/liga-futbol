'use client'

import { useState } from 'react'
import {
  discoBackClasses,
  discoClasses,
  ICON_SVG,
  SIZE_CLASSES,
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

function BadgeIcon({ iconKey }: { iconKey: string }) {
  const icon = ICON_SVG[iconKey] ?? (
    <circle cx="12" cy="12" r="8" />
  )

  return (
    <svg
      viewBox="0 0 24 24"
      className="fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
    >
      {icon}
    </svg>
  )
}

function BadgeBack() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="fill-none stroke-current stroke-[1.4] opacity-70 [stroke-linecap:round] [stroke-linejoin:round]"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function BadgeDisco({
  rarity,
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
      className={`badge-disco-scene cursor-pointer rounded-full border-0 bg-transparent p-0 motion-reduce:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3DE68C] ${className}`}
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
        className={`relative [transform-style:preserve-3d] ${SIZE_CLASSES[size]} ${spinning ? 'badge-disco-spin' : ''}`}
        onAnimationEnd={() => setSpinning(false)}
      >
        <div
          className={`badge-disco-face absolute inset-0 grid place-items-center rounded-full ${discoClasses(rarity, locked)}`}
        >
          <BadgeIcon iconKey={iconKey} />
        </div>
        <div
          className={`badge-disco-face badge-disco-face-back absolute inset-0 grid place-items-center rounded-full ${discoBackClasses(rarity, locked)}`}
          aria-hidden
        >
          <BadgeBack />
        </div>
      </div>
    </button>
  )
}
