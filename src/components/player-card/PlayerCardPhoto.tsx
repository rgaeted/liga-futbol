'use client'

import { useState } from 'react'

type Props = {
  fotoUrl: string
  fotoEsRecorte: boolean
  alt: string
  initials: string
  variant?: 'rect' | 'shield'
}

function InitialsFallback({
  initials,
  isShield,
}: {
  initials: string
  isShield: boolean
}) {
  return (
    <div
      className={`relative z-[1] grid place-items-center rounded-full border border-[#22382E] bg-gradient-to-br from-[#1D3228] to-[#0E1B15] font-[family-name:var(--font-oswald)] text-[#3DE68C] ${
        isShield ? 'mb-2 h-[110px] w-[110px] text-[38px]' : 'mb-4 h-[120px] w-[120px] text-[44px]'
      }`}
    >
      {initials}
    </div>
  )
}

export function PlayerCardPhoto({
  fotoUrl,
  fotoEsRecorte,
  alt,
  initials,
  variant = 'rect',
}: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const isShield = variant === 'shield'

  if (failedUrl === fotoUrl) {
    return <InitialsFallback initials={initials} isShield={isShield} />
  }

  if (isShield) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt={alt}
        className={`relative z-[1] min-h-0 max-h-full max-w-full select-none ${
          fotoEsRecorte
            ? 'h-auto w-auto object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.66)]'
            : 'h-full w-full object-cover object-[center_10%] drop-shadow-[0_14px_22px_rgba(0,0,0,0.55)] [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]'
        }`}
        onError={() => setFailedUrl(fotoUrl)}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fotoUrl}
      alt={alt}
      className="relative z-[1] h-[190px] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.55)]"
      onError={() => setFailedUrl(fotoUrl)}
    />
  )
}
