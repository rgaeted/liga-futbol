'use client'

import { useMemo } from 'react'
import { KelmeLogo } from '@/components/kelme/KelmeLogo'
import { MatchClockDisplay } from '@/components/live/MatchClockDisplay'
import { useLiveMatchSnapshot } from '@/hooks/useLiveMatchSnapshot'
import { sortTimelineEvents } from '@/lib/match-timeline-sort'
import { FormationPitch } from '@/components/lineup/FormationPitch'
import { MatchTimeline } from '@/components/live/MatchTimeline'
import { LiveMatchContextBar } from '@/components/live/LiveMatchContextBar'
import { LiveTeamStaff } from '@/components/live/LiveTeamStaff'
import { TeamCrest } from '@/components/TeamCrest'
import { footballFormatLabel } from '@/lib/football-format'
import type { LiveMatchSnapshot } from '@/lib/live-match-snapshot'
import { personInitials } from '@/lib/player-name'

export function LiveScoreboard({
  initialMatch,
}: {
  initialMatch: LiveMatchSnapshot
}) {
  const { snapshot: match } = useLiveMatchSnapshot({
    initialSnapshot: initialMatch,
  })

  const sortedEvents = useMemo(
    () =>
      sortTimelineEvents(match.events, {
        preferCreatedAt: match.preferCreatedAtOrder,
      }),
    [match.events, match.preferCreatedAtOrder]
  )

  const isLive = match.status === 'LIVE'
  const hasFormations = match.formations.some((formation) => formation.lineup)

  return (
    <div className="min-h-screen bg-kelme-live-bg text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex justify-center">
          <KelmeLogo size="sm" variant="dark" />
        </div>

        <p className="mb-2 text-center font-ui text-sm uppercase tracking-widest text-kelme-red">
          {isLive ? (
            <span className="live-pulse inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-kelme-red" />
              EN VIVO
            </span>
          ) : (
            match.status
          )}
        </p>

        <div className="mb-4 flex justify-center">
          <MatchClockDisplay clock={{ ...match.clock, status: match.status }} />
        </div>

        <LiveMatchContextBar
          venue={match.venue}
          locationLabel={match.locationLabel}
          weather={match.weather}
        />

        <div className="mb-8 rounded-2xl border border-white/10 bg-kelme-live-surface p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <TeamCrest
                name={match.homeTeam.name}
                src={match.homeTeam.crestSrc}
                color={match.homeTeam.color}
                size="lg"
              />
              <p className="font-ui text-sm font-semibold uppercase tracking-wide sm:text-base">
                {match.homeTeam.name}
              </p>
              <LiveTeamStaff
                captainLabel={match.homeCaptainLabel}
                coachLabel={match.homeCoachLabel}
              />
            </div>
            <div className="shrink-0 px-2 text-center">
              <p className="font-display text-5xl font-extrabold tabular-nums text-white sm:text-6xl">
                {match.homeScore}
                <span className="mx-1 text-white/35">-</span>
                {match.awayScore}
              </p>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <TeamCrest
                name={match.awayTeam.name}
                src={match.awayTeam.crestSrc}
                color={match.awayTeam.color}
                size="lg"
              />
              <p className="font-ui text-sm font-semibold uppercase tracking-wide sm:text-base">
                {match.awayTeam.name}
              </p>
              <LiveTeamStaff
                captainLabel={match.awayCaptainLabel}
                coachLabel={match.awayCoachLabel}
              />
            </div>
          </div>
          {match.status === 'FINISHED' && match.teamMvps.some((m) => m.label) && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {match.teamMvps
                .filter((m) => m.label)
                .map((mvp) => (
                  <div
                    key={mvp.side}
                    className="flex flex-col items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-4 sm:flex-row sm:items-center"
                  >
                    {mvp.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mvp.photoUrl}
                        alt={mvp.label ?? ''}
                        className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-amber-300/80 sm:h-28 sm:w-28"
                      />
                    ) : (
                      <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-amber-300/25 text-lg font-bold text-amber-100 ring-4 ring-amber-300/50 sm:h-28 sm:w-28">
                        {personInitials(mvp.label ?? '?')}
                      </span>
                    )}
                    <div className="min-w-0 text-center sm:text-left">
                      <p className="truncate font-ui text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/70">
                        MVP · {mvp.teamLabel}
                      </p>
                      <p className="truncate font-display text-lg font-bold text-amber-100 sm:text-xl">
                        {mvp.label}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {hasFormations && (
          <section className="mb-8">
            <h2 className="mb-1 font-display text-sm font-bold uppercase tracking-[0.25em] text-amber-200/75">
              Formaciones
            </h2>
            <p className="mb-4 text-center font-ui text-xs uppercase tracking-widest text-white/40">
              {footballFormatLabel(match.footballFormat)}
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              {match.formations.map((side) =>
                side.lineup ? (
                  <div key={side.label}>
                    <FormationPitch
                      variant="live"
                      lineup={side.lineup}
                      teamName={side.label}
                      crestSrc={side.crestSrc}
                      color={side.color}
                      coachLabel={side.coachLabel}
                      mvpPlayerIds={match.mvpPlayerIds}
                      captainPlayerIds={match.captainPlayerIds}
                    />
                    {side.lineup.bench.length > 0 && (
                      <p className="mt-2 text-center text-xs text-white/40">
                        Banco: {side.lineup.bench.map((b) => b.playerName).join(', ')}
                      </p>
                    )}
                  </div>
                ) : null
              )}
            </div>
          </section>
        )}

        <MatchTimeline events={sortedEvents} />

        <p className="mt-10 text-center font-ui text-xs uppercase tracking-widest text-white/30">
          Torneos Kelme
        </p>
      </div>
    </div>
  )
}
