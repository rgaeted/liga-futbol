import Link from 'next/link'
import { TeamCrest } from '@/components/TeamCrest'
import { matchStatusLabel } from '@/lib/match-status-ui'
import { personInitials } from '@/lib/player-name'
import type { LineupView } from '@/lib/match-lineup'

type Featured = {
  id: string
  status: 'LIVE' | 'HALFTIME' | 'FINISHED'
  dateLine: string
  venue: string
  home: { name: string; crestSrc: string | null; color: string }
  away: { name: string; crestSrc: string | null; color: string }
  homeScore: number
  awayScore: number
  formations: Array<{
    label: string
    lineup: LineupView | null
  }>
}

function shortPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].toUpperCase()
  return `${parts[0][0]!.toUpperCase()}. ${parts[parts.length - 1]!.toUpperCase()}`
}

function SideLabel({ children }: { children: string }) {
  return (
    <div className="mt-2 flex items-center justify-center gap-2">
      <span className="h-px w-6 bg-org-primary" />
      <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-org-primary">
        {children}
      </span>
      <span className="h-px w-6 bg-org-primary" />
    </div>
  )
}

function DarkPitch({ lineup }: { lineup: LineupView }) {
  return (
    <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#141414]">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 150"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect width="100" height="150" fill="#141414" />
        <rect x="4" y="4" width="92" height="142" fill="none" stroke="#5a5a5a" strokeWidth="0.7" />
        <line x1="4" y1="75" x2="96" y2="75" stroke="#5a5a5a" strokeWidth="0.55" />
        <circle cx="50" cy="75" r="12" fill="none" stroke="#5a5a5a" strokeWidth="0.55" />
        <circle cx="50" cy="75" r="1.1" fill="#5a5a5a" />
        <rect x="22" y="4" width="56" height="22" fill="none" stroke="#5a5a5a" strokeWidth="0.55" />
        <rect x="34" y="4" width="32" height="8" fill="none" stroke="#4a4a4a" strokeWidth="0.45" />
        <rect x="22" y="124" width="56" height="22" fill="none" stroke="#5a5a5a" strokeWidth="0.55" />
        <rect x="34" y="138" width="32" height="8" fill="none" stroke="#4a4a4a" strokeWidth="0.45" />
      </svg>

      <span className="absolute left-2.5 top-2 z-20 font-display text-[12px] font-bold uppercase tracking-[0.12em] text-org-primary">
        {lineup.scheme}
      </span>

      {lineup.pitch.map((slot) => {
        const filled = Boolean(slot.playerName)
        return (
          <div
            key={slot.slotKey}
            className="absolute z-10 flex w-[4.4rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ top: `${slot.topPct}%`, left: `${slot.leftPct}%` }}
          >
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[#1c1c1c] ring-[1.5px] ring-white/35">
              {filled && slot.playerPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slot.playerPhotoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-[9px] font-bold text-white/80">
                  {filled ? personInitials(slot.playerName!) : '—'}
                </span>
              )}
            </div>
            <span className="mt-1 max-w-[4.4rem] truncate text-center text-[8px] font-semibold uppercase tracking-wide text-white">
              {filled ? shortPlayerName(slot.playerName!) : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function LosLunesMatchBoard({
  featured,
  slug,
}: {
  featured: Featured
  slug: string
}) {
  const homeLineup =
    featured.formations.find((side) => side.label === featured.home.name)?.lineup ?? null
  const awayLineup =
    featured.formations.find((side) => side.label === featured.away.name)?.lineup ?? null
  const hasPitch = Boolean(homeLineup || awayLineup)

  return (
    <article className="relative overflow-hidden rounded-2xl border border-org-primary bg-[#0a0a0a] text-white">
      <span className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 font-display text-[120px] font-bold tracking-[0.12em] text-white/[0.04] max-sm:text-[72px]">
        FDL
      </span>

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/75 max-sm:grid-cols-1 max-sm:text-center">
        <span className="inline-flex items-center gap-2 max-sm:justify-center">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          {featured.dateLine}
        </span>
        <span className="inline-flex items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="6" width="18" height="12" rx="1" />
            <circle cx="12" cy="12" r="2.2" />
            <path d="M3 12h18" />
          </svg>
          {featured.venue}
        </span>
        <span className="justify-self-end rounded-md border border-org-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-org-primary max-sm:justify-self-center">
          {matchStatusLabel(featured.status)}
        </span>
      </div>

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-8 py-6 max-sm:gap-2 max-sm:px-3">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-[88px] w-[88px] items-center justify-center max-sm:h-14 max-sm:w-14">
            <TeamCrest
              name={featured.home.name}
              src={featured.home.crestSrc}
              color={featured.home.color}
              size="lg"
              fit="contain"
              className="!h-full !w-full"
            />
          </div>
          <div className="font-display text-[24px] font-bold uppercase leading-none tracking-[-0.03em] max-sm:text-[15px]">
            {featured.home.name}
          </div>
          <SideLabel>Local</SideLabel>
        </div>

        <div className="min-w-[150px] text-center max-sm:min-w-[96px]">
          <div className="font-display text-[clamp(48px,7.5vw,86px)] font-bold leading-none tracking-[-0.05em] tabular-nums">
            {featured.homeScore}
            <span className="mx-[0.14em] inline-block h-[0.1em] w-[0.38em] translate-y-[-0.22em] bg-org-primary align-middle" />
            {featured.awayScore}
          </div>
        </div>

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-[88px] w-[88px] items-center justify-center max-sm:h-14 max-sm:w-14">
            <TeamCrest
              name={featured.away.name}
              src={featured.away.crestSrc}
              color={featured.away.color}
              size="lg"
              fit="contain"
              className="!h-full !w-full"
            />
          </div>
          <div className="font-display text-[24px] font-bold uppercase leading-none tracking-[-0.03em] max-sm:text-[15px]">
            {featured.away.name}
          </div>
          <SideLabel>Visita</SideLabel>
        </div>
      </div>

      {hasPitch ? (
        <div className="relative px-5 pb-5 max-sm:px-3">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-org-primary/80" />
            <h3 className="font-display text-[13px] font-bold uppercase tracking-[0.2em]">Formaciones</h3>
            <span className="h-px flex-1 bg-org-primary/80" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {homeLineup ? <DarkPitch lineup={homeLineup} /> : null}
            {awayLineup ? <DarkPitch lineup={awayLineup} /> : null}
          </div>
        </div>
      ) : null}

      <div className="relative px-5 pb-4 text-right">
        <Link
          href={`/${slug}/live/${featured.id}`}
          className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-org-primary"
        >
          {featured.status === 'FINISHED' ? 'Ver resumen' : 'Ver en vivo'}
        </Link>
      </div>
    </article>
  )
}
