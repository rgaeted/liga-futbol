'use client'

import { useState } from 'react'
import {
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

export function BadgeDisco({
  rarity,
  iconKey,
  locked = false,
  size = 'md',
  className = '',
  label,
}: Props) {
  const [spinning, setSpinning] = useState(false)
  const icon = ICON_SVG[iconKey] ?? (
    <circle cx="12" cy="12" r="8" />
  )

  return (
    <button
      type="button"
      title={label}
      aria-label={label ? `Insignia ${label}` : 'Insignia'}
      className="cursor-pointer rounded-full border-0 bg-transparent p-0 motion-reduce:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3DE68C]"
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
        className={`grid place-items-center rounded-full ${SIZE_CLASSES[size]} ${discoClasses(rarity, locked)} ${spinning ? 'badge-disco-spin' : ''} ${className}`}
        onAnimationEnd={() => setSpinning(false)}
      >
        <svg
          viewBox="0 0 24 24"
          className="fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
        >
          {icon}
        </svg>
      </div>
    </button>
  )
}
