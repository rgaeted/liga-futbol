'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSocket, joinMatchRoom } from '@/lib/socket-client'
import { KelmeLogo } from '@/components/kelme/KelmeLogo'
import { MatchClockDisplay } from '@/components/live/MatchClockDisplay'
import type { SerializableClockState } from '@/hooks/useMatchClock'
import { sortTimelineEvents } from '@/lib/match-timeline-sort'
import { resolveEventTeamLabel } from '@/lib/match-label'
import type { MatchType } from '@prisma/client'

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
  assistName: string | null
}

type Match = {
  id: string
  matchType: MatchType
  homeTeamId: string | null
  awayTeamId: string | null
  sideAName: string | null
  sideBName: string | null
  homeTeam: { name: string }
  awayTeam: { name: string }
  homeScore: number
  awayScore: number
  status: string
  preferCreatedAtOrder: boolean
  friendlySideByPlayer: Record<string, 'A' | 'B'>
  clock: SerializableClockState
  events: MatchEvent[]
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
                {
                  id: payload.event!.id,
                  type: payload.event!.type,
                  minute: payload.event!.minute,
                  createdAt: toEventCreatedAt(payload.event!.createdAt),
                  playerName: eventPlayerName(payload.event!),
                  assistName: eventAssistName(payload.event!),
                  teamName: resolveEventTeamLabel(
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
                  ),
                },
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

  return (
    <div className="min-h-screen bg-kelme-live-bg text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
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

        <div className="mb-8 flex items-center justify-between rounded-2xl border border-white/10 bg-kelme-live-surface p-8">
          <div className="flex-1 text-center">
            <p className="font-ui text-lg font-semibold">{match.homeTeam.name}</p>
            <p className="font-display text-6xl font-extrabold tabular-nums text-white">{match.homeScore}</p>
          </div>
          <p className="px-4 font-ui text-2xl text-white/40">vs</p>
          <div className="flex-1 text-center">
            <p className="font-ui text-lg font-semibold">{match.awayTeam.name}</p>
            <p className="font-display text-6xl font-extrabold tabular-nums text-white">{match.awayScore}</p>
          </div>
        </div>

        <h2 className="mb-4 font-display text-lg font-bold">Cronología</h2>
        <ul className="space-y-2">
          {sortedEvents.map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-kelme-live-surface px-4 py-3"
            >
              <span className="w-10 shrink-0 font-mono text-kelme-red">{event.minute}&apos;</span>
              <span className="min-w-0 flex-1 font-ui">{formatEvent(event.type)}</span>
              {(event.playerName || event.teamName || event.assistName) && (
                <span className="ml-auto shrink-0 text-right font-ui text-sm text-white/70">
                  {event.playerName && event.teamName && (
                    <>
                      <span className="block">{event.playerName}</span>
                      <span className="block text-xs font-medium text-kelme-red/90">
                        {event.teamName}
                      </span>
                    </>
                  )}
                  {event.playerName && !event.teamName && (
                    <span className="block">{event.playerName}</span>
                  )}
                  {!event.playerName && event.teamName && (
                    <span className="block font-medium text-kelme-red/90">{event.teamName}</span>
                  )}
                  {event.assistName && (
                    <span className="mt-0.5 block text-xs text-white/50">
                      Asistencia: {event.assistName}
                    </span>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center font-ui text-xs uppercase tracking-widest text-white/30">
          Torneos Kelme
        </p>
      </div>
    </div>
  )
}

function formatEvent(type: string): string {
  const labels: Record<string, string> = {
    GOAL: '⚽ Gol',
    OWN_GOAL: '⚽ Gol en contra',
    YELLOW_CARD: '🟨 Tarjeta amarilla',
    RED_CARD: '🟥 Tarjeta roja',
    SHOT_ON_TARGET: '🎯 Tiro al arco',
    SHOT_OFF_TARGET: 'Tiro desviado',
    SUBSTITUTION: '🔄 Cambio',
    FOUL: '⚠️ Falta',
    KICKOFF: '▶ Inicio del partido',
    HALFTIME: '⏸ Entretiempo',
    FULLTIME: '⏹ Final del partido',
  }
  return labels[type] ?? type
}
