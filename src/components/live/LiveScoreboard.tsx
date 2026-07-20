'use client'

import { useEffect, useState } from 'react'
import { getSocket, joinMatchRoom } from '@/lib/socket-client'
import { KelmeLogo } from '@/components/kelme/KelmeLogo'

type RawSocketEvent = {
  id: string
  type: string
  minute: number
  player?: { user: { name: string } } | null
  friendlyPlayer?: { firstName: string; lastName: string } | null
}

type LiveMatchPayload = {
  matchId: string
  homeScore: number
  awayScore: number
  status: string
  event?: RawSocketEvent
}

type MatchEvent = {
  id: string
  type: string
  minute: number
  playerName: string | null
}

type Match = {
  id: string
  homeTeam: { name: string }
  awayTeam: { name: string }
  homeScore: number
  awayScore: number
  status: string
  events: MatchEvent[]
}

function eventPlayerName(event: RawSocketEvent): string | null {
  if (event.friendlyPlayer) {
    return `${event.friendlyPlayer.firstName} ${event.friendlyPlayer.lastName}`
  }
  return event.player?.user.name ?? null
}

export function LiveScoreboard({ initialMatch }: { initialMatch: Match }) {
  const [match, setMatch] = useState(initialMatch)

  useEffect(() => {
    joinMatchRoom(match.id)
    const socket = getSocket()

    function onUpdate(payload: LiveMatchPayload) {
      setMatch((prev) => ({
        ...prev,
        homeScore: payload.homeScore,
        awayScore: payload.awayScore,
        status: payload.status,
        events: payload.event
          ? [
              ...prev.events,
              {
                id: payload.event.id,
                type: payload.event.type,
                minute: payload.event.minute,
                playerName: eventPlayerName(payload.event),
              },
            ]
          : prev.events,
      }))
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
          {[...match.events].reverse().map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-kelme-live-surface px-4 py-3"
            >
              <span className="w-10 font-mono text-kelme-red">{event.minute}&apos;</span>
              <span className="font-ui">{formatEvent(event.type)}</span>
              {event.playerName && (
                <span className="ml-auto font-ui text-sm text-white/50">{event.playerName}</span>
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