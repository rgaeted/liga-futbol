'use client'

import { useState } from 'react'

type Props = {
  fotoUrl: string
  alt: string
  initials: string
  variant?: 'rect' | 'shield'
}

export function PlayerCardPhoto({ fotoUrl, alt, initials, variant = 'rect' }: Props) {
  const [failed, setFailed] = useState(false)
  const isShield = variant === 'shield'

  if (failed) {
    return (
      <div
        className={`relative z-[1] grid place-items-center rounded-full border border-[#22382E] bg-gradient-to-br from-[#1D3228] to-[#0E1B15] font-[family-name:var(--font-anton)] text-[#3DE68C] ${
          isShield ? 'mb-2 h-[110px] w-[110px] text-[38px]' : 'mb-4 h-[120px] w-[120px] text-[44px]'
        }`}
      >
        {initials}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fotoUrl}
      alt={alt}
      className={`relative z-[1] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.55)] ${
        isShield ? 'mb-0 h-[200px] max-w-full' : 'h-[190px]'
      }`}
      onError={() => setFailed(true)}
    />
  )
}
