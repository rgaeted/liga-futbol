import type { ReactNode } from 'react'
import { LOSLUNES_HERO_PATH } from '@/lib/org-brand'
import { matchStatusLabel } from '@/lib/match-status-ui'
import { personInitials } from '@/lib/player-name'

export const losLunesLiveCard =
  'overflow-hidden rounded-2xl border border-[#d4af37]/35 bg-black/45 shadow-[0_0_32px_rgba(212,175,55,0.12)] backdrop-blur-sm'

export function LosLunesPageBackdrop() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 bg-[#020202]" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOSLUNES_HERO_PATH}
        alt=""
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-[0.22] saturate-50"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 45% at 8% -8%, rgba(255, 236, 180, 0.28), transparent 52%),
            radial-gradient(ellipse 55% 40% at 96% -6%, rgba(255, 220, 140, 0.16), transparent 48%),
            radial-gradient(ellipse 80% 50% at 50% 108%, rgba(8, 12, 20, 0.95), transparent 55%),
            linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.72) 38%, rgba(0,0,0,0.88) 100%)
          `,
        }}
        aria-hidden
      />
      <p
        className="pointer-events-none fixed left-[-2%] top-[28%] hidden origin-left -rotate-[18deg] font-display text-[42px] font-bold uppercase tracking-[0.14em] text-white/[0.045] xl:block"
        aria-hidden
      >
        Los lunes también se juega
      </p>
      <p
        className="pointer-events-none fixed right-[-1%] top-[34%] hidden origin-right rotate-[16deg] font-display text-[36px] font-bold uppercase tracking-[0.16em] text-white/[0.04] xl:block"
        aria-hidden
      >
        Más que fútbol
      </p>
    </>
  )
}

function LocationPin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0 text-[#d4af37]">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
      />
      <circle cx="12" cy="10" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function LosLunesStatusLine({
  status,
  isLive = false,
}: {
  status: string
  isLive?: boolean
}) {
  return (
    <p className="font-display text-[13px] font-semibold uppercase tracking-[0.28em] text-[#e08a32] sm:text-sm">
      {isLive ? (
        <span className="live-pulse inline-flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[#e08a32]" />
          En vivo
        </span>
      ) : (
        matchStatusLabel(status)
      )}
    </p>
  )
}

export function LosLunesLocationPill({ label }: { label: string }) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#d4af37]/40 bg-black/55 px-4 py-2 backdrop-blur-sm">
      <LocationPin />
      <p className="truncate font-ui text-xs text-white/80 sm:text-sm">{label}</p>
    </div>
  )
}

export function LosLunesGoldDivider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-[#d4af37]/30" aria-hidden />
      <p className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#d4af37]/55">
        {text}
      </p>
      <span className="h-px flex-1 bg-[#d4af37]/30" aria-hidden />
    </div>
  )
}

export function LosLunesFlankedTitle({
  children,
  as: Tag = 'h2',
  size = 'section',
}: {
  children: ReactNode
  as?: 'h1' | 'h2'
  size?: 'hero' | 'section'
}) {
  const title =
    size === 'hero'
      ? 'min-w-0 font-display text-[24px] font-bold uppercase tracking-[0.08em] text-white sm:text-[36px] md:text-[42px]'
      : 'shrink-0 font-display text-[13px] font-bold uppercase tracking-[0.2em] text-white sm:text-sm'
  const line =
    size === 'hero'
      ? 'h-px w-8 shrink-0 bg-[#c4782a] sm:w-[64px] md:w-[88px]'
      : 'h-px min-w-8 flex-1 bg-[#d4af37]/40'

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <span className={line} aria-hidden />
      <Tag className={`text-center ${title}`}>{children}</Tag>
      <span className={line} aria-hidden />
    </div>
  )
}

export function LosLunesPhotoRing({
  name,
  photoUrl,
  size = 'lg',
}: {
  name: string
  photoUrl?: string | null
  size?: 'md' | 'lg' | 'xl'
}) {
  const box =
    size === 'xl'
      ? 'h-24 w-24 sm:h-28 sm:w-28'
      : size === 'lg'
        ? 'h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]'
        : 'h-12 w-12 sm:h-14 sm:w-14'
  const text = size === 'xl' ? 'text-lg' : size === 'lg' ? 'text-sm' : 'text-xs'

  return (
    <div
      className={`shrink-0 rounded-full bg-gradient-to-br from-[#fff1b0] via-[#d4af37] to-[#8a6414] p-[3px] shadow-[0_0_28px_rgba(212,175,55,0.45)] ${box}`}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#141010]">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className={`font-display font-bold text-white/75 ${text}`}>{personInitials(name)}</span>
        )}
      </div>
    </div>
  )
}

export function LosLunesPageFooter({ locationLabel }: { locationLabel?: string | null }) {
  return (
    <p className="mt-10 text-center font-ui text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
      FDL{locationLabel ? ` · ${locationLabel}` : ''}
    </p>
  )
}
