'use client'

import { useEffect, useState } from 'react'
import { getSocket, joinMatchRoom } from '@/lib/socket-client'

type LiveMatchPayload = {
  matchId: string
  homeScore: number
  awayScore: number
  status: string
  event?: {
    id: string
    type: string
    minute: number
    player?: { user: { name: string } } | null
  }
}

type Match = {
  id: string
  homeTeam: { name: string }
  awayTeam: { name: string }
  homeScore: number
  awayScore: number
  status: string
  events: Array<{
    id: string
    type: string
    minute: number
    player?: { user: { name: string } } | null
  }>
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
          ? [...prev.events, payload.event]
          : prev.events,
      }))
    }

    socket.on('match-update', onUpdate)
    return () => {
      socket.off('match-update', onUpdate)
    }
  }, [match.id])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="mb-2 text-center text-sm uppercase tracking-widest text-red-400">
          {match.status === 'LIVE' ? '● EN VIVO' : match.status}
        </p>

        <div className="mb-8 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <div className="flex-1 text-center">
            <p className="text-lg font-semibold">{match.homeTeam.name}</p>
            <p className="text-6xl font-bold tabular-nums text-emerald-400">{match.homeScore}</p>
          </div>
          <p className="px-4 text-2xl text-slate-500">vs</p>
          <div className="flex-1 text-center">
            <p className="text-lg font-semibold">{match.awayTeam.name}</p>
            <p className="text-6xl font-bold tabular-nums text-emerald-400">{match.awayScore}</p>
          </div>
        </div>

        <h2 className="mb-4 text-lg font-semibold">Cronología</h2>
        <ul className="space-y-2">
          {[...match.events].reverse().map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"
            >
              <span className="w-10 font-mono text-emerald-400">{event.minute}&apos;</span>
              <span>{formatEvent(event.type)}</span>
              {event.player && (
                <span className="ml-auto text-slate-400">{event.player.user.name}</span>
              )}
            </li>
          ))}
        </ul>
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
    FOUL: '⚠ Falta',
    KICKOFF: '▶ Inicio del partido',
    HALFTIME: '⏸ Entretiempo',
    FULLTIME: '⏹ Final del partido',
  }
  return labels[type] ?? type
}
