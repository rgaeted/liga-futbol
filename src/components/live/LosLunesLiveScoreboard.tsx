import { MatchClockDisplay } from '@/components/live/MatchClockDisplay'
import { LiveTeamStaff } from '@/components/live/LiveTeamStaff'
import {
  LosLunesFlankedTitle,
  LosLunesGoldDivider,
  LosLunesLocationPill,
  LosLunesPhotoRing,
  LosLunesStatusLine,
} from '@/components/live/loslunes-live-ui'
import { TeamCrest } from '@/components/TeamCrest'
import type { LiveMatchSnapshot } from '@/lib/live-match-snapshot'
import type { TeamMvpSideView } from '@/lib/match-mvp'

function MvpCard({ mvp }: { mvp: TeamMvpSideView }) {
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-[#d4af37]/45 bg-black/50 px-4 py-4 shadow-[0_0_28px_rgba(212,175,55,0.14)] backdrop-blur-sm sm:px-5">
      <LosLunesPhotoRing name={mvp.label ?? '?'} photoUrl={mvp.photoUrl} size="xl" />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
          👑 MVP · {mvp.teamLabel}
        </p>
        <p className="mt-1 truncate font-live-serif text-2xl font-bold leading-tight text-white sm:text-[28px]">
          {mvp.label}
        </p>
        <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
          Juego real · Personas reales
        </p>
      </div>
    </article>
  )
}

function TeamColumn({
  name,
  crestSrc,
  color,
  captainLabel,
  coachLabel,
}: {
  name: string
  crestSrc: string | null
  color: string
  captainLabel: string | null
  coachLabel: string | null
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
      <div className="mb-3 rounded-full bg-gradient-to-br from-[#fff1b0] via-[#d4af37] to-[#8a6414] p-[3px] shadow-[0_0_24px_rgba(212,175,55,0.4)]">
        <div className="flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-full bg-[#141010] max-sm:h-[62px] max-sm:w-[62px]">
          <TeamCrest name={name} src={crestSrc} color={color} size="lg" fit="contain" className="!h-[78%] !w-[78%]" />
        </div>
      </div>
      <p className="font-display text-[22px] font-bold uppercase leading-none tracking-[-0.02em] text-white max-sm:text-[16px]">
        {name}
      </p>
      <div className="mt-3">
        <LiveTeamStaff captainLabel={captainLabel} coachLabel={coachLabel} tone="premium" />
      </div>
    </div>
  )
}

export function LosLunesLiveScoreboard({
  match,
  isLive,
}: {
  match: LiveMatchSnapshot
  isLive: boolean
}) {
  const showMvps = match.status === 'FINISHED' && match.teamMvps.some((m) => m.label)
  const venueLabel = [match.venue, match.locationLabel].filter(Boolean).join(' · ')

  return (
    <section className="text-white">
      <header className="mb-8 text-center sm:mb-10">
        <LosLunesFlankedTitle as="h1" size="hero">
          {match.organization.name}
        </LosLunesFlankedTitle>
        <div className="mt-2">
          <LosLunesStatusLine status={match.status} isLive={isLive} />
        </div>
        {venueLabel ? (
          <div className="mt-4">
            <LosLunesLocationPill label={venueLabel} />
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:gap-6">
        <TeamColumn
          name={match.homeTeam.name}
          crestSrc={match.homeTeam.crestSrc ?? match.organization.logoUrl}
          color={match.homeTeam.color}
          captainLabel={match.homeCaptainLabel}
          coachLabel={match.homeCoachLabel}
        />

        <div className="relative min-w-[132px] pt-4 text-center max-sm:min-w-[96px] sm:pt-6">
          <div
            className="pointer-events-none absolute left-1/2 top-[58%] h-36 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(245,200,66,0.28),transparent_70%)]"
            aria-hidden
          />
          {isLive || match.status === 'HALFTIME' ? (
            <MatchClockDisplay
              clock={{ ...match.clock, status: match.status }}
              className="relative mb-2 text-3xl text-[#f5c842] sm:text-4xl"
            />
          ) : null}
          <p className="loslunes-gold-score relative font-live-serif text-[clamp(56px,11vw,104px)] font-black leading-none tracking-tight tabular-nums">
            {match.homeScore}
            <span className="mx-[0.12em]">-</span>
            {match.awayScore}
          </p>
          <div className="relative mt-4">
            <LosLunesGoldDivider text="Fútbol — Disciplina — Amigos" />
          </div>
        </div>

        <TeamColumn
          name={match.awayTeam.name}
          crestSrc={match.awayTeam.crestSrc ?? match.guestOrganization?.logoUrl ?? null}
          color={match.awayTeam.color}
          captainLabel={match.awayCaptainLabel}
          coachLabel={match.awayCoachLabel}
        />
      </div>

      {showMvps ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {match.teamMvps
            .filter((m) => m.label)
            .map((mvp) => (
              <MvpCard key={mvp.side} mvp={mvp} />
            ))}
        </div>
      ) : null}
    </section>
  )
}
