'use client'

import { useMemo } from 'react'
import { MatchTimeline } from '@/components/live/MatchTimeline'
import { LosLunesDarkPitch } from '@/components/live/LosLunesDarkPitch'
import { LosLunesLiveScoreboard } from '@/components/live/LosLunesLiveScoreboard'
import {
  LosLunesPageBackdrop,
  LosLunesPageFooter,
  LosLunesPhotoRing,
} from '@/components/live/loslunes-live-ui'
import { useLiveMatchSnapshot } from '@/hooks/useLiveMatchSnapshot'
import { sortTimelineEvents } from '@/lib/match-timeline-sort'
import { footballFormatLabel } from '@/lib/football-format'
import { LOSLUNES_LOGO_PATH, LOSLUNES_SLUG } from '@/lib/org-brand'
import { MatchType } from '@prisma/client'
import type { LiveMatchSnapshot } from '@/lib/live-match-snapshot'
import { LiveMatchContextBar } from '@/components/live/LiveMatchContextBar'
import { LiveTeamStaff } from '@/components/live/LiveTeamStaff'
import { MatchClockDisplay } from '@/components/live/MatchClockDisplay'
import { FormationPitch } from '@/components/lineup/FormationPitch'
import { TeamCrest } from '@/components/TeamCrest'
import { matchStatusLabel } from '@/lib/match-status-ui'
function DefaultScoreboardBody({
  match,
  isLive,
}: {
  match: LiveMatchSnapshot
  isLive: boolean
}) {
  return (
    <>
      <p className="mb-2 text-center font-ui text-sm uppercase tracking-widest text-org-primary">
        {isLive ? (
          <span className="live-pulse inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-org-primary" />
            EN VIVO
          </span>
        ) : (
          matchStatusLabel(match.status)
        )}
      </p>

      <div className="mb-4 flex justify-center">
        <MatchClockDisplay clock={{ ...match.clock, status: match.status }} />
      </div>

      <div className="mb-8 rounded-2xl border border-white/10 bg-kelme-live-surface p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            <TeamCrest
              name={match.homeTeam.name}
              src={match.homeTeam.crestSrc ?? match.organization.logoUrl}
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
            <p className="font-data text-5xl font-extrabold tabular-nums text-[#E8E4D8] sm:text-6xl">
              {match.homeScore}
              <span className="mx-1 text-[#8A938C]/50">-</span>
              {match.awayScore}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            <TeamCrest
              name={match.awayTeam.name}
              src={match.awayTeam.crestSrc ?? match.guestOrganization?.logoUrl}
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
                  <LosLunesPhotoRing name={mvp.label ?? '?'} photoUrl={mvp.photoUrl} size="xl" />
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
    </>
  )
}

export function LiveScoreboard({
  initialMatch,
  organizationSlug,
}: {
  initialMatch: LiveMatchSnapshot
  organizationSlug?: string
}) {
  const { snapshot: match } = useLiveMatchSnapshot({
    initialSnapshot: initialMatch,
  })

  const premium = organizationSlug === LOSLUNES_SLUG

  const paidByPlayerId =
    match.matchType === MatchType.FRIENDLY ? match.friendlyPaidByPlayerId : undefined
  const galletaPlayerIds =
    match.matchType === MatchType.FRIENDLY ? match.friendlyGalletaPlayerIds : undefined

  const sortedEvents = useMemo(
    () =>
      sortTimelineEvents(match.events, {
        preferCreatedAt: match.preferCreatedAtOrder,
      }),
    [match.events, match.preferCreatedAtOrder],
  )

  const isLive = match.status === 'LIVE'
  const hasFormations = match.formations.some((formation) => formation.lineup)

  return (
    <div
      className={`relative min-h-screen ${
        premium ? 'bg-[#050403] text-white' : 'bg-[#0B1210] text-[#E8E4D8]'
      }`}
    >
      {premium ? <LosLunesPageBackdrop /> : null}

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8">
        {premium ? (
          <div className="mb-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOSLUNES_LOGO_PATH}
              alt={match.organization.name}
              className="h-14 w-14 object-contain opacity-95 sm:h-16 sm:w-16"
            />
          </div>
        ) : null}

        {premium ? (
          <div className="mb-8">
            <LosLunesLiveScoreboard match={match} isLive={isLive} />
          </div>
        ) : (
          <>
            <DefaultScoreboardBody match={match} isLive={isLive} />
            <LiveMatchContextBar
              venue={match.venue}
              locationLabel={match.locationLabel}
              weather={match.weather}
            />
          </>
        )}

        {hasFormations && (
          <section
            className={`mb-8 ${
              premium
                ? 'overflow-hidden rounded-2xl border border-org-primary bg-[#0a0a0a] p-5 sm:p-6'
                : ''
            }`}
          >
            {premium ? (
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-org-primary/80" />
                <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.2em] text-white">
                  Formaciones
                </h2>
                <span className="h-px flex-1 bg-org-primary/80" />
              </div>
            ) : (
              <>
                <h2 className="mb-1 font-display text-sm font-bold uppercase tracking-[0.25em] text-amber-200/75">
                  Formaciones
                </h2>
              </>
            )}
            <p
              className={`text-center font-ui uppercase tracking-[0.2em] ${
                premium
                  ? 'mb-4 text-[10px] text-white/40'
                  : 'mb-4 text-xs text-white/40'
              }`}
            >
              {footballFormatLabel(match.footballFormat)}
              {paidByPlayerId ? ' · Borde verde: pagó · Borde rojo: no pagó' : ''}
              {galletaPlayerIds && galletaPlayerIds.length > 0 ? ' · 🍪 Galleta' : ''}
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              {match.formations.map((side) =>
                side.lineup ? (
                  <div key={side.label}>
                    {premium ? (
                      <>
                        <p className="mb-2 text-center font-display text-sm font-bold uppercase tracking-wide text-white">
                          {side.label}
                        </p>
                        <LosLunesDarkPitch lineup={side.lineup} />
                      </>
                    ) : (
                      <FormationPitch
                        variant="live"
                        lineup={side.lineup}
                        teamName={side.label}
                        crestSrc={side.crestSrc}
                        color={side.color}
                        coachLabel={side.coachLabel}
                        mvpPlayerIds={match.mvpPlayerIds}
                        captainPlayerIds={match.captainPlayerIds}
                        paidByPlayerId={paidByPlayerId}
                        galletaPlayerIds={galletaPlayerIds}
                      />
                    )}
                    {side.lineup.bench.length > 0 && (
                      <p
                        className={`mt-2 text-center text-xs ${
                          premium ? 'text-white/35' : 'text-white/40'
                        }`}
                      >
                        Banco: {side.lineup.bench.map((b) => b.playerName).join(', ')}
                      </p>
                    )}
                  </div>
                ) : null,
              )}
            </div>
          </section>
        )}

        <MatchTimeline
          events={sortedEvents}
          teams={{
            home: match.homeTeam,
            away: match.awayTeam,
          }}
          organizationSlug={organizationSlug}
          embedded={premium}
        />

        {premium ? (
          <LosLunesPageFooter />
        ) : (
          <p className="mt-10 text-center font-ui text-xs uppercase tracking-widest text-white/30">
            {match.organization.name}
          </p>
        )}
      </div>
    </div>
  )
}
