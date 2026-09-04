import Link from 'next/link'
import { TeamCrest } from '@/components/TeamCrest'
import { LOSLUNES_LOGO_PATH } from '@/lib/org-brand'
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
  scoreCaption: string
  mvp: { name: string; initials: string } | null
  formations: Array<{
    label: string
    crestSrc: string | null
    color: string
    lineup: LineupView | null
  }>
}

function schemeLabel(scheme: string): string {
  return scheme.replace(/-/g, ' - ')
}

function toBoardPos(slot: LineupView['pitch'][number], side: 'home' | 'away') {
  const depth = (100 - slot.topPct) / 100
  const x = side === 'home' ? 5 + depth * 40 : 95 - depth * 40
  const y = 14 + (slot.leftPct / 100) * 72
  return { x, y }
}

function PitchMarkings() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden>
      <rect width="1000" height="620" fill="#141414" />
      <rect width="1000" height="620" fill="url(#fdl-stripes)" />
      <defs>
        <pattern id="fdl-stripes" width="1000" height="44" patternUnits="userSpaceOnUse">
          <rect width="1000" height="22" fill="#171717" />
          <rect y="22" width="1000" height="22" fill="#121212" />
        </pattern>
      </defs>
      <rect x="36" y="36" width="928" height="548" fill="none" stroke="white" strokeOpacity="0.28" strokeWidth="3" />
      <line x1="500" y1="36" x2="500" y2="584" stroke="white" strokeOpacity="0.28" strokeWidth="2.5" />
      <circle cx="500" cy="310" r="78" fill="none" stroke="white" strokeOpacity="0.28" strokeWidth="2.5" />
      <circle cx="500" cy="310" r="5" fill="white" fillOpacity="0.35" />
      <rect x="36" y="160" width="140" height="300" fill="none" stroke="white" strokeOpacity="0.28" strokeWidth="2.5" />
      <rect x="36" y="230" width="58" height="160" fill="none" stroke="white" strokeOpacity="0.22" strokeWidth="2" />
      <rect x="824" y="160" width="140" height="300" fill="none" stroke="white" strokeOpacity="0.28" strokeWidth="2.5" />
      <rect x="906" y="230" width="58" height="160" fill="none" stroke="white" strokeOpacity="0.22" strokeWidth="2" />
    </svg>
  )
}

function BoardPlayer({
  slot,
  side,
}: {
  slot: LineupView['pitch'][number]
  side: 'home' | 'away'
}) {
  const { x, y } = toBoardPos(slot, side)
  const filled = Boolean(slot.playerName)
  const ring = side === 'home' ? 'ring-[2.5px] ring-org-primary' : 'ring-[2.5px] ring-white/80'

  return (
    <div
      className="absolute z-10 flex w-[4.6rem] flex-col items-center"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%) rotateX(calc(var(--pitch-tilt) * -1))',
      }}
    >
      <div
        className={`grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[#1a1a1a] font-display text-[10px] font-bold text-white shadow-[0_8px_16px_rgba(0,0,0,.55)] ${ring}`}
      >
        {filled && slot.playerPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slot.playerPhotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{filled ? personInitials(slot.playerName!) : slot.label.slice(0, 2)}</span>
        )}
      </div>
      {filled ? (
        <span className="mt-1 max-w-[4.6rem] truncate text-center text-[9px] font-medium leading-tight text-white drop-shadow-[0_1px_4px_rgba(0,0,0,.85)]">
          {slot.playerName}
        </span>
      ) : null}
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
    <article className="relative overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(245,127,32,0.28),transparent_68%)]" />
      <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.16),transparent_70%)]" />

      <div className="relative flex items-center justify-between gap-3 px-5 pb-2 pt-5 max-sm:px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOSLUNES_LOGO_PATH} alt="" className="absolute left-4 top-4 hidden h-10 w-10 object-contain sm:block" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-semibold text-white/80 sm:pl-12">
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-org-primary" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            {featured.dateLine}
          </span>
          {featured.venue ? (
            <span className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-org-primary" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" />
                <circle cx="12" cy="9" r="2.2" />
              </svg>
              {featured.venue}
            </span>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full border border-org-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-org-primary">
          {matchStatusLabel(featured.status)}
        </span>
      </div>

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 pb-6 pt-4 max-sm:gap-2 max-sm:px-3">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-[84px] w-[84px] items-center justify-center max-sm:h-14 max-sm:w-14">
            <TeamCrest
              name={featured.home.name}
              src={featured.home.crestSrc}
              color={featured.home.color}
              size="lg"
              fit="contain"
              className="!h-full !w-full"
            />
          </div>
          <div className="font-display text-[22px] font-bold uppercase leading-none tracking-[-0.03em] max-sm:text-[15px]">
            {featured.home.name}
          </div>
          <div className="mt-1.5 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-org-primary">
            Local
          </div>
        </div>

        <div className="min-w-[160px] text-center max-sm:min-w-[108px]">
          <div className="font-display text-[clamp(52px,8vw,92px)] font-bold leading-none tracking-[-0.06em] tabular-nums">
            {featured.homeScore}
            <span className="mx-[0.12em] inline-block h-[0.12em] w-[0.42em] translate-y-[-0.18em] bg-org-primary align-middle" />
            {featured.awayScore}
          </div>
          <div className="mt-3 font-display text-[11px] font-bold uppercase tracking-[0.22em] text-org-primary">
            {featured.scoreCaption}
          </div>
        </div>

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-[84px] w-[84px] items-center justify-center max-sm:h-14 max-sm:w-14">
            <TeamCrest
              name={featured.away.name}
              src={featured.away.crestSrc}
              color={featured.away.color}
              size="lg"
              fit="contain"
              className="!h-full !w-full"
            />
          </div>
          <div className="font-display text-[22px] font-bold uppercase leading-none tracking-[-0.03em] max-sm:text-[15px]">
            {featured.away.name}
          </div>
          <div className="mt-1.5 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-org-primary">
            Visita
          </div>
        </div>
      </div>

      {hasPitch ? (
        <div className="relative px-4 pb-6 pt-1 max-sm:px-2">
          <div
            className="relative mx-auto w-full max-w-[980px] [perspective:1400px] max-md:[perspective:900px]"
            style={{ '--pitch-tilt': '50deg' } as React.CSSProperties}
          >
            <div className="origin-center [transform:rotateX(var(--pitch-tilt))] [transform-style:preserve-3d]">
              <div className="relative aspect-[16/9] overflow-visible rounded-[6px] shadow-[0_30px_60px_rgba(0,0,0,.55)]">
                <PitchMarkings />
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="font-display text-[clamp(48px,8vw,92px)] font-bold tracking-[0.12em] text-white/[0.07]">
                    FDL
                  </span>
                </div>
                {homeLineup?.pitch.map((slot) => (
                  <BoardPlayer key={`home-${slot.slotKey}`} slot={slot} side="home" />
                ))}
                {awayLineup?.pitch.map((slot) => (
                  <BoardPlayer key={`away-${slot.slotKey}`} slot={slot} side="away" />
                ))}
              </div>
            </div>
          </div>

          {homeLineup ? (
            <div className="absolute bottom-6 left-6 bg-[#7a4a1a] px-3 py-1.5 font-display text-[12px] font-bold uppercase tracking-[0.14em] text-white shadow-lg max-sm:left-3 max-sm:bottom-4 max-sm:text-[10px]">
              {schemeLabel(homeLineup.scheme)}
            </div>
          ) : null}
          {awayLineup ? (
            <div className="absolute bottom-6 right-6 bg-[#2a2a2a] px-3 py-1.5 font-display text-[12px] font-bold uppercase tracking-[0.14em] text-white shadow-lg max-sm:right-3 max-sm:bottom-4 max-sm:text-[10px]">
              {schemeLabel(awayLineup.scheme)}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative flex items-center justify-between gap-4 px-5 pb-5 max-sm:flex-col max-sm:items-stretch">
        {featured.mvp ? (
          <p className="text-[12px] text-white/70">
            Figura:{' '}
            <strong className="font-display uppercase tracking-wide text-white">{featured.mvp.name}</strong>
          </p>
        ) : (
          <span />
        )}
        <Link
          href={`/${slug}/live/${featured.id}`}
          className="font-display text-[12px] font-bold uppercase tracking-[0.16em] text-org-primary"
        >
          {featured.status === 'FINISHED' ? 'Ver resumen' : 'Ver en vivo'}
        </Link>
      </div>
    </article>
  )
}
