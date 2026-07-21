'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSocket, joinMatchRoom } from '@/lib/socket-client'
import { KelmeLogo } from '@/components/kelme/KelmeLogo'
import { MatchClockDisplay } from '@/components/live/MatchClockDisplay'
import type { SerializableClockState } from '@/hooks/useMatchClock'
import { sortTimelineEvents } from '@/lib/match-timeline-sort'
import { resolveEventTeamLabel, resolveEventTeamCrest } from '@/lib/match-label'
import { FormationPitch } from '@/components/lineup/FormationPitch'
import { MatchTimeline } from '@/components/live/MatchTimeline'
import { TeamCrest } from '@/components/TeamCrest'
import type { LineupView } from '@/lib/match-lineup'
import type { FootballFormat, MatchType } from '@prisma/client'
import { footballFormatLabel } from '@/lib/football-format'

type RawSocketEvent = {
  id: string
  type: string
  minute: number
  createdAt?: string | Date
  teamId?: string | null
  side?: 'A' | 'B' | null
  friendlyPlayerId?: string | null
  player?: {
    user: { name: string }
    team?: { id: string; name: string } | null
  } | null
  friendlyPlayer?: { firstName: string; lastName: string } | null
  assistPlayer?: { user: { name: string } } | null
  assistFriendlyPlayer?: { firstName: string; lastName: string } | null
}

type LiveMatchPayload = {
  matchId: string
  homeScore: number
  awayScore: number
  status: string
  clockStartedAt?: string | Date | null
  secondHalfStartedAt?: string | Date | null
  halftimeAt?: string | Date | null
  event?: RawSocketEvent
}

type MatchEvent = {
  id: string
  type: string
  minute: number
  createdAt: string
  playerName: string | null
  teamName: string | null
  teamCrestSrc: string | null
  assistName: string | null
}

type Match = {
  id: string
  matchType: MatchType
  homeTeamId: string | null
  awayTeamId: string | null
  sideAName: string | null
  sideBName: string | null
  homeTeam: { name: string; crestSrc?: string | null }
  awayTeam: { name: string; crestSrc?: string | null }
  homeScore: number
  awayScore: number
  status: string
  preferCreatedAtOrder: boolean
  friendlySideByPlayer: Record<string, 'A' | 'B'>
  clock: SerializableClockState
  events: MatchEvent[]
  footballFormat: FootballFormat
  formations: Array<{ label: string; crestSrc?: string | null; lineup: LineupView | null }>
}

function crestLookup(match: Match) {
  return {
    homeName: match.homeTeam.name,
    awayName: match.awayTeam.name,
    homeCrestSrc: match.homeTeam.crestSrc,
    awayCrestSrc: match.awayTeam.crestSrc,
  }
}

function eventPlayerName(event: RawSocketEvent): string | null {
  if (event.friendlyPlayer) {
    return `${event.friendlyPlayer.firstName} ${event.friendlyPlayer.lastName}`
  }
  return event.player?.user.name ?? null
}

function eventAssistName(event: RawSocketEvent): string | null {
  if (event.assistFriendlyPlayer) {
    return `${event.assistFriendlyPlayer.firstName} ${event.assistFriendlyPlayer.lastName}`
  }
  return event.assistPlayer?.user.name ?? null
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function toEventCreatedAt(value: string | Date | undefined): string {
  if (!value) return new Date().toISOString()
  return value instanceof Date ? value.toISOString() : value
}

export function LiveScoreboard({ initialMatch }: { initialMatch: Match }) {
  const [match, setMatch] = useState(initialMatch)

  const sortedEvents = useMemo(
    () =>
      sortTimelineEvents(match.events, {
        preferCreatedAt: match.preferCreatedAtOrder,
      }),
    [match.events, match.preferCreatedAtOrder]
  )

  useEffect(() => {
    joinMatchRoom(match.id)
    const socket = getSocket()

    function onUpdate(payload: LiveMatchPayload) {
      setMatch((prev) => {
        const nextEvents = payload.event
          ? prev.events.some((e) => e.id === payload.event!.id)
            ? prev.events
            : [
                ...prev.events,
                (() => {
                  const teamName = resolveEventTeamLabel(
                    {
                      teamId: payload.event!.teamId,
                      side: payload.event!.side,
                      playerTeamId: payload.event!.player?.team?.id ?? null,
                      playerTeamName: payload.event!.player?.team?.name ?? null,
                      friendlyPlayerId: payload.event!.friendlyPlayerId,
                      friendlySide: payload.event!.friendlyPlayerId
                        ? (payload.event!.side ??
                          prev.friendlySideByPlayer[payload.event!.friendlyPlayerId] ??
                          null)
                        : null,
                    },
                    {
                      matchType: prev.matchType,
                      sideAName: prev.sideAName,
                      sideBName: prev.sideBName,
                      homeTeam: prev.homeTeam,
                      awayTeam: prev.awayTeam,
                      homeTeamId: prev.homeTeamId,
                      awayTeamId: prev.awayTeamId,
                    }
                  )
                  return {
                    id: payload.event!.id,
                    type: payload.event!.type,
                    minute: payload.event!.minute,
                    createdAt: toEventCreatedAt(payload.event!.createdAt),
                    playerName: eventPlayerName(payload.event!),
                    assistName: eventAssistName(payload.event!),
                    teamName,
                    teamCrestSrc: resolveEventTeamCrest(teamName, crestLookup(prev)),
                  }
                })(),
              ]
          : prev.events

        return {
          ...prev,
          homeScore: payload.homeScore,
          awayScore: payload.awayScore,
          status: payload.status,
          clock: {
            status: payload.status,
            clockStartedAt: toIso(payload.clockStartedAt ?? prev.clock.clockStartedAt),
            secondHalfStartedAt: toIso(
              payload.secondHalfStartedAt ?? prev.clock.secondHalfStartedAt
            ),
            halftimeAt: toIso(payload.halftimeAt ?? prev.clock.halftimeAt),
          },
          events: nextEvents,
        }
      })
    }

    socket.on('match-update', onUpdate)
    return () => {
      socket.off('match-update', onUpdate)
    }
  }, [match.id])

  const isLive = match.status === 'LIVE'
  const hasFormations = match.formations.some((f) => f.lineup)

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

        <div className="mb-8 rounded-2xl border border-white/10 bg-kelme-live-surface p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <TeamCrest name={match.homeTeam.name} src={match.homeTeam.crestSrc} size="lg" />
              <p className="font-ui text-sm font-semibold uppercase tracking-wide sm:text-base">
                {match.homeTeam.name}
              </p>
            </div>
            <div className="shrink-0 px-2 text-center">
              <p className="font-display text-5xl font-extrabold tabular-nums text-white sm:text-6xl">
                {match.homeScore}
                <span className="mx-1 text-white/35">-</span>
                {match.awayScore}
              </p>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <TeamCrest name={match.awayTeam.name} src={match.awayTeam.crestSrc} size="lg" />
              <p className="font-ui text-sm font-semibold uppercase tracking-wide sm:text-base">
                {match.awayTeam.name}
              </p>
            </div>
          </div>
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
