'use client'

import { useState } from 'react'

type Props = {
  fotoUrl: string
  alt: string
  initials: string
}

export function PlayerCardPhoto({ fotoUrl, alt, initials }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="relative z-[1] mb-4 grid h-[120px] w-[120px] place-items-center rounded-full border border-[#22382E] bg-gradient-to-br from-[#1D3228] to-[#0E1B15] font-[family-name:var(--font-anton)] text-[44px] text-[#3DE68C]">
        {initials}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fotoUrl}
      alt={alt}
      className="relative z-[1] h-[190px] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.55)]"
      onError={() => setFailed(true)}
    />
  )
}
