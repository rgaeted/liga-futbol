'use client'

import { useState } from 'react'

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

function foldAwardLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function shouldShowShortLabel(shortLabel: string, name: string): boolean {
  const shortFold = foldAwardLabel(shortLabel)
  const nameFold = foldAwardLabel(name)
  if (!shortFold || shortFold === nameFold) return false
  return !nameFold.includes(shortFold)
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function RecipientPhoto({
  name,
  photoUrl,
  size = 'lg',
}: {
  name: string
  photoUrl: string | null
  size?: 'lg' | 'sm'
}) {
  const dim = size === 'lg' ? 'h-[88px] w-[88px] text-xl' : 'h-11 w-11 text-xs'
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className={`${dim} rounded-full object-cover ring-2 ring-[color-mix(in_srgb,var(--org-primary)_55%,#2a302d)]`}
      />
    )
  }
  return (
    <div
      className={`${dim} grid place-items-center rounded-full bg-[#232824] font-display font-black text-org-primary ring-2 ring-[#333a36]`}
    >
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
  const key = `${award.shortLabel}-${award.name}`
  const showShortLabel = shouldShowShortLabel(award.shortLabel, award.name)

  return (
    <div className="[perspective:1100px]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`premio-${key}`}
        onClick={onToggle}
        className={`relative block min-h-[280px] w-full text-center transition-[transform,box-shadow] duration-500 [transform-style:preserve-3d] motion-reduce:transition-none max-sm:min-h-[260px] ${
          open ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <div
          aria-hidden={open}
          className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[18px] border border-[#2a302d] bg-[#131615] px-5 py-6 [backface-visibility:hidden] after:absolute after:-right-[55px] after:-top-[50px] after:h-[130px] after:w-[130px] after:rounded-full after:bg-[color-mix(in_srgb,var(--org-primary)_5%,transparent)]"
        >
          <span className="relative z-10 text-[42px] leading-none drop-shadow-[0_6px_18px_rgba(0,0,0,.35)]">
            {award.emoji}
          </span>
          <span className="relative z-10 mt-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9ca59f]">
            Toca para revelar
          </span>
        </div>

        <div
          id={`premio-${key}`}
          className="absolute inset-0 flex flex-col overflow-hidden rounded-[18px] border border-[color-mix(in_srgb,var(--org-primary)_38%,#2a302d)] bg-[#131615] px-5 py-5 [backface-visibility:hidden] [transform:rotateY(180deg)] max-sm:px-4 max-sm:py-4"
          aria-hidden={!open}
        >
          <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
            {winners.length > 0 ? (
              <div className="mb-2.5 flex items-center justify-center">
                {winners.slice(0, 3).map((row, index) => (
                  <div
                    key={row.playerId}
                    className={index === 0 ? '' : '-ml-3'}
                    style={{ zIndex: 3 - index }}
                  >
                    <RecipientPhoto
                      name={row.name}
                      photoUrl={row.photoUrl}
                      size={winners.length === 1 ? 'lg' : 'sm'}
                    />
                  </div>
                ))}
              </div>
            ) : null}
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#717a74]">
              {winners.length === 1 ? 'Ganador' : winners.length > 1 ? 'Ganadores' : 'Premio'}
            </p>
            <strong className="mt-1 block max-w-full px-1 text-[13px] leading-snug">
              {winners.length > 0
                ? winners.map((row) => row.name).join(' · ')
                : 'Aún sin ganadores'}
            </strong>
            {showShortLabel ? (
              <p className="mt-3 w-full text-center text-[10px] font-black uppercase tracking-[0.08em] text-org-primary">
                {award.shortLabel}
              </p>
            ) : null}
            <h3
              className={`w-full font-display text-[18px] font-semibold leading-[1.1] tracking-[-0.025em] ${
                showShortLabel ? 'mt-1.5' : 'mt-3'
              }`}
            >
              {award.name}
            </h3>
            {award.description ? (
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#9ca59f]">
                {award.description}
              </p>
            ) : null}
          </div>
        </div>
      </button>
    </div>
  )
}

export function AwardRevealGrid({ awards }: { awards: Award[] }) {
  const [openKeys, setOpenKeys] = useState<string[]>([])

  return (
    <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2 max-[420px]:grid-cols-1">
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
