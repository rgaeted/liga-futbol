import type { ReactNode } from 'react'
import { LOSLUNES_HERO_PATH, LOSLUNES_LOGO_PATH } from '@/lib/org-brand'
import { personInitials } from '@/lib/player-name'

export const losLunesLiveCard =
  'overflow-hidden rounded-2xl border border-amber-400/30 bg-black/55 shadow-[0_0_32px_rgba(245,200,66,0.08)] backdrop-blur-sm'

export function LosLunesPageBackdrop() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOSLUNES_HERO_PATH}
        alt=""
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-[0.16]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-black/88 via-[#050403]/92 to-black/95"
        aria-hidden
      />
      <p
        className="pointer-events-none fixed bottom-8 left-6 hidden font-display text-4xl font-bold uppercase tracking-[0.08em] text-white/[0.025] sm:block xl:text-5xl"
        aria-hidden
      >
        Más que fútbol
      </p>
      <p
        className="pointer-events-none fixed right-6 top-24 hidden font-display text-3xl font-bold uppercase tracking-[0.12em] text-white/[0.02] sm:block"
        aria-hidden
      >
        Los lunes también se juega
      </p>
    </>
  )
}

export function LosLunesGoldDivider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-amber-400/25" aria-hidden />
      <p className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.24em] text-amber-400/50">
        {text}
      </p>
      <span className="h-px flex-1 bg-amber-400/25" aria-hidden />
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
      className={`shrink-0 rounded-full bg-gradient-to-br from-amber-200/90 via-amber-400/50 to-amber-700/40 p-[3px] shadow-[0_0_22px_rgba(245,200,66,0.35)] ${box}`}
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

export function LosLunesSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-amber-100/85 sm:text-base">
      {children}
    </h2>
  )
}

export function LosLunesPageFooter() {
  return (
    <div className="mt-10 flex items-end justify-between gap-4 border-t border-amber-400/15 pt-5">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400/40 sm:text-xs">
        Más que un partido
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOSLUNES_LOGO_PATH} alt="" className="h-8 w-8 object-contain opacity-90 sm:h-9 sm:w-9" />
    </div>
  )
}
