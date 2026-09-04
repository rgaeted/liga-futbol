'use client'

import { useState } from 'react'
import {
  awardDisplayTitle,
  resolveAwardCover,
  type AwardCoverIcon,
} from '@/lib/award-covers'

type Award = {
  name: string
  shortLabel: string
  emoji: string
  description: string | null
  recipients: Array<{
    name: string
    playerId: string
    photoUrl: string | null
  }>
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function AwardIcon({ name }: { name: AwardCoverIcon }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-[18px] w-[18px]',
    'aria-hidden': true,
  }

  if (name === 'lungs') {
    return (
      <svg {...common}>
        <path d="M12 8v13M12 11c-2.2-3.6-5.8-4.2-8-1.8C1.6 11.6 3 16 6.2 17.5M12 11c2.2-3.6 5.8-4.2 8-1.8C22.4 11.6 21 16 17.8 17.5" />
      </svg>
    )
  }
  if (name === 'column') {
    return (
      <svg {...common}>
        <path d="M5 6h14M7 6v12M17 6v12M4 18h16M8 3h8" />
      </svg>
    )
  }
  if (name === 'star') {
    return (
      <svg {...common} fill="currentColor" stroke="none">
        <path d="M12 3.2 14.4 9h6.1l-4.9 3.7 1.9 5.9L12 15.8 6.5 18.6l1.9-5.9L3.5 9h6.1Z" />
      </svg>
    )
  }
  if (name === 'cart') {
    return (
      <svg {...common}>
        <path d="M4 5h2l1.6 9.2a1.6 1.6 0 0 0 1.6 1.3h7.6a1.6 1.6 0 0 0 1.6-1.2L20 8H8" />
        <circle cx="10" cy="19" r="1.2" fill="currentColor" />
        <circle cx="17" cy="19" r="1.2" fill="currentColor" />
      </svg>
    )
  }
  if (name === 'commit') {
    return (
      <svg {...common}>
        <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10Z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="9" r="3.2" />
      <path d="M8.2 21h7.6L12 12.6 8.2 21Z" />
    </svg>
  )
}

function WinnerPhoto({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
    )
  }
  return (
    <div className="grid h-12 w-12 place-items-center rounded-full bg-[#1b1b1b] font-display text-xs font-bold text-org-primary">
      {initials(name)}
    </div>
  )
}

function AwardRevealCard({
  award,
  open,
  onToggle,
}: {
  award: Award
  open: boolean
  onToggle: () => void
}) {
  const winners = award.recipients
  const title = awardDisplayTitle(award.name, award.shortLabel)
  const cover = resolveAwardCover(award.name, award.shortLabel)
  const panelId = `premio-${title.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <article
      className={`flex h-full flex-col bg-black ${
        open ? 'ring-1 ring-org-primary' : 'ring-1 ring-white/10'
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="block w-full text-left"
      >
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
            open ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
          }`}
          aria-hidden={open}
        >
          <div className="overflow-hidden">
            <div className="relative aspect-[3/4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover grayscale contrast-[1.15] brightness-[0.78]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/10" />
              <span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-org-primary text-white">
                <AwardIcon name={cover.icon} />
              </span>
              <h3 className="absolute inset-x-3 bottom-4 font-display text-[clamp(22px,2.4vw,30px)] font-bold uppercase leading-[0.88] tracking-[-0.03em] text-white">
                {title}
              </h3>
            </div>
          </div>
        </div>
        <div className="flex min-h-[44px] items-center justify-between gap-3 bg-[#0a0a0a] px-3 py-2.5">
          <span className="flex min-w-0 items-center gap-2">
            {open ? (
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-org-primary text-white">
                <AwardIcon name={cover.icon} />
              </span>
            ) : null}
            {open ? (
              <h3 className="truncate font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                {title}
              </h3>
            ) : (
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                Ver premio
              </span>
            )}
          </span>
          <span
            aria-hidden
            className={`text-org-primary transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
          >
            ›
          </span>
        </div>
      </button>

      <div
        id={panelId}
        className={`grid min-h-0 transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'flex-1 grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          <div className="flex h-full flex-col space-y-4 bg-[#080808] px-3.5 pb-4 pt-1">
            {award.description ? (
              <div>
                <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-org-primary">
                  Descripción
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/80">{award.description}</p>
              </div>
            ) : null}
            <div>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-org-primary">
                {winners.length > 1 ? 'Ganadores' : 'Ganador'}
              </p>
              {winners.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {winners.map((row) => (
                    <li key={row.playerId} className="flex items-center gap-3">
                      <WinnerPhoto name={row.name} photoUrl={row.photoUrl} />
                      <strong className="font-display text-[13px] font-bold uppercase leading-tight tracking-wide">
                        {row.name}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[13px] text-white/55">Aún sin ganador</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export function AwardRevealGrid({ awards }: { awards: Award[] }) {
  const [openKeys, setOpenKeys] = useState<string[]>([])

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {awards.map((award) => {
        const key = `${award.name}-${award.shortLabel}`
        const open = openKeys.includes(key)
        return (
          <AwardRevealCard
            key={key}
            award={award}
            open={open}
            onToggle={() =>
              setOpenKeys((current) =>
                current.includes(key)
                  ? current.filter((item) => item !== key)
                  : [...current, key],
              )
            }
          />
        )
      })}
    </div>
  )
}
