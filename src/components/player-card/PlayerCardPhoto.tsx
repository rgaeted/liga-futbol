'use client'

import { useEffect, useState } from 'react'
import {
  getCachedPlayerCardCutout,
  loadPlayerCardCutout,
} from '@/lib/player-card-photo-cutout'

type Props = {
  fotoUrl: string
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

export function PlayerCardPhoto({ fotoUrl, alt, initials, variant = 'rect' }: Props) {
  const [failed, setFailed] = useState(false)
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(() => getCachedPlayerCardCutout(fotoUrl))
  const isShield = variant === 'shield'

  useEffect(() => {
    if (!isShield || failed) return

    const cached = getCachedPlayerCardCutout(fotoUrl)
    if (cached) {
      setCutoutUrl(cached)
      return
    }

    let cancelled = false
    void loadPlayerCardCutout(fotoUrl)
      .then((url) => {
        if (!cancelled && url) setCutoutUrl(url)
      })
      .catch(() => {
        /* fallback: foto original con máscara CSS */
      })

    return () => {
      cancelled = true
    }
  }, [fotoUrl, isShield, failed])

  if (failed) {
    return <InitialsFallback initials={initials} isShield={isShield} />
  }

  const src = cutoutUrl ?? fotoUrl
  const isCutout = Boolean(cutoutUrl)

  if (isShield) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`relative z-[1] max-w-none select-none ${
          isCutout
            ? 'h-[248px] w-auto object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.72)]'
            : 'h-[230px] w-auto object-cover object-[center_10%] drop-shadow-[0_14px_22px_rgba(0,0,0,0.6)] [mask-image:linear-gradient(to_bottom,black_72%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_72%,transparent_100%)]'
        }`}
        style={{ transform: 'translateY(6px)' }}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="relative z-[1] h-[190px] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.55)]"
      onError={() => setFailed(true)}
    />
  )
}
