'use client'

import { useState } from 'react'
import { BadgeIllustration } from '@/components/badges/BadgeIllustration'
import {
  badgeCardClasses,
  badgeRarityLabel,
  discoBackClasses,
} from '@/components/badges/badge-disco-shared'

type Props = {
  iconKey: string
  name: string
  description: string
  rarity: string
  locked: boolean
  proximamente: boolean
  context?: string | null
}

export function BadgeCard({
  iconKey,
  name,
  description,
  rarity,
  locked,
  proximamente,
  context,
}: Props) {
  const [spinning, setSpinning] = useState(false)

  return (
    <article
      className={`relative overflow-hidden rounded-xl px-4 pb-4 pt-5 text-center transition-transform hover:-translate-y-0.5 ${badgeCardClasses(rarity, locked, proximamente)}`}
    >
      <span className="absolute right-3 top-2.5 text-[8px] font-bold uppercase tracking-[0.18em] text-[#666]">
        {proximamente ? 'Próximamente' : badgeRarityLabel(rarity)}
      </span>

      <button
        type="button"
        aria-label={`Insignia ${name}`}
        title={name}
        className="badge-disco-scene mx-auto mb-3 block w-full max-w-[132px] cursor-pointer border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B1A] motion-reduce:cursor-default"
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
          className={`relative h-[88px] [transform-style:preserve-3d] ${spinning ? 'badge-disco-spin' : ''}`}
          onAnimationEnd={() => setSpinning(false)}
        >
          <div className="badge-disco-face absolute inset-0">
            <BadgeIllustration
              iconKey={iconKey}
              rarity={rarity}
              locked={locked}
              className="mx-auto h-full w-full"
            />
          </div>
          <div
            className="badge-disco-face badge-disco-face-back absolute inset-0 grid place-items-center"
            aria-hidden
          >
            <div
              className={`flex h-[88px] w-[88px] items-center justify-center rounded-full ${discoBackClasses(rarity, locked)}`}
            >
              <svg viewBox="0 0 24 24" className="h-10 w-10" aria-hidden>
                <circle cx={12} cy={12} r={9} fill="none" stroke="currentColor" strokeWidth={1.4} />
                <circle cx={12} cy={12} r={5} fill="none" stroke="currentColor" strokeWidth={1.2} />
              </svg>
            </div>
          </div>
        </div>
      </button>

      <b className="block font-[family-name:var(--font-anton)] text-[13px] uppercase leading-tight tracking-[0.04em] text-white">
        {name}
      </b>
      <div className="mx-auto my-2 h-px w-8 bg-white/10" />
      <p className="min-h-9 text-[9px] font-semibold uppercase leading-snug tracking-[0.12em] text-[#777]">
        {description}
      </p>

      {proximamente ? (
        <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[#666]">
          Próximamente
        </div>
      ) : context ? (
        <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[#FF6B1A]">
          {context}
        </div>
      ) : locked ? (
        <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[#555]">
          Bloqueada
        </div>
      ) : null}
    </article>
  )
}
