'use client'

import { useState } from 'react'
import { EventType } from '@prisma/client'
import { MatchClockDisplay } from '@/components/live/MatchClockDisplay'
import type { SerializableClockState } from '@/hooks/useMatchClock'

type RosterPlayer = { id: string; label: string }
type SideRoster = { id: string; name: string; players: RosterPlayer[] }

type Props = {
  matchId: string
  matchType: 'LEAGUE' | 'FRIENDLY'
  homeTeam: SideRoster
  awayTeam: SideRoster
  initialHomeScore: number
  initialAwayScore: number
  initialStatus: string
  initialClock: SerializableClockState
}

const QUICK_EVENTS = [
  { type: EventType.KICKOFF, label: '▶ Inicio', color: 'bg-kelme-red' },
  { type: EventType.GOAL, label: '⚽ Gol', color: 'bg-green-600' },
  { type: EventType.YELLOW_CARD, label: '🟨 Amarilla', color: 'bg-yellow-500 text-black' },
  { type: EventType.RED_CARD, label: '🟥 Roja', color: 'bg-red-600' },
  { type: EventType.SHOT_ON_TARGET, label: '🎯 Tiro al arco', color: 'bg-blue-600' },
  { type: EventType.SHOT_OFF_TARGET, label: '↗ Tiro fuera', color: 'bg-kelme-gray-600' },
  { type: EventType.SUBSTITUTION, label: '🔄 Cambio', color: 'bg-purple-600' },
  { type: EventType.FOUL, label: '⚠ Falta', color: 'bg-orange-600' },
  { type: EventType.HALFTIME, label: '⏸ Entretiempo', color: 'bg-kelme-gray-600' },
  { type: EventType.FULLTIME, label: '⏹ Final', color: 'bg-kelme-gray-900' },
] as const

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

export function MatchControlPanel({
  matchId,
  matchType,
  homeTeam,
  awayTeam,
  initialHomeScore,
  initialAwayScore,
  initialStatus,
  initialClock,
}: Props) {
  const [homeScore, setHomeScore] = useState(initialHomeScore)
  const [awayScore, setAwayScore] = useState(initialAwayScore)
  const [status, setStatus] = useState(initialStatus)
  const [clock, setClock] = useState(initialClock)
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home')
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [selectedAssist, setSelectedAssist] = useState('')
  const [pendingEvent, setPendingEvent] = useState<EventType | null>(null)
  const [loading, setLoading] = useState(false)

  const activeTeam = selectedTeam === 'home' ? homeTeam : awayTeam

  function updateFromMatchResponse(match: {
    homeScore: number
    awayScore: number
    status: string
    clockStartedAt?: Date | string | null
    secondHalfStartedAt?: Date | string | null
    halftimeAt?: Date | string | null
  }) {
    setHomeScore(match.homeScore)
    setAwayScore(match.awayScore)
    setStatus(match.status)
    setClock({
      status: match.status,
      clockStartedAt: toIso(match.clockStartedAt),
      secondHalfStartedAt: toIso(match.secondHalfStartedAt),
      halftimeAt: toIso(match.halftimeAt),
    })
  }

  async function submitEvent(type: EventType) {
    const needsPlayer = (
      [
        EventType.GOAL,
        EventType.OWN_GOAL,
        EventType.YELLOW_CARD,
        EventType.RED_CARD,
        EventType.SHOT_ON_TARGET,
        EventType.SHOT_OFF_TARGET,
        EventType.SUBSTITUTION,
      ] as EventType[]
    ).includes(type)

    if (needsPlayer && !selectedPlayer) {
      setPendingEvent(type)
      return
    }

    const body =
      matchType === 'FRIENDLY'
        ? {
            type,
            friendlyPlayerId: selectedPlayer || undefined,
            side: selectedTeam === 'home' ? ('A' as const) : ('B' as const),
            ...(type === EventType.GOAL && selectedAssist
              ? { assistFriendlyPlayerId: selectedAssist }
              : {}),
          }
        : {
            type,
            playerId: selectedPlayer || undefined,
            teamId: activeTeam.id,
            ...(type === EventType.GOAL && selectedAssist
              ? { assistPlayerId: selectedAssist }
              : {}),
          }

    setLoading(true)
    const res = await fetch(`/api/matches/${matchId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.match) {
      updateFromMatchResponse(data.match)
    }
    setPendingEvent(null)
    setSelectedAssist('')
    setLoading(false)
  }

  function eventLabel(type: EventType, defaultLabel: string) {
    if (type === EventType.KICKOFF) {
      if (status === 'HALFTIME') return '▶ 2.º tiempo'
      return '▶ Inicio'
    }
    return defaultLabel
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 text-kelme-gray-900">
      <div className="text-center">
        <p className="font-ui text-sm uppercase tracking-widest text-kelme-red">
          {status === 'LIVE' ? '● EN VIVO' : status}
        </p>
        <MatchClockDisplay clock={{ ...clock, status }} className="text-kelme-gray-900" />
        <p className="font-display text-5xl font-extrabold tabular-nums">
          {homeScore} - {awayScore}
        </p>
        <p className="text-kelme-gray-400">
          {homeTeam.name} vs {awayTeam.name}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSelectedTeam('home')}
          className={`flex-1 rounded-lg py-2 ${selectedTeam === 'home' ? 'bg-kelme-red' : 'bg-kelme-gray-100'}`}
        >
          {homeTeam.name}
        </button>
        <button
          type="button"
          onClick={() => setSelectedTeam('away')}
          className={`flex-1 rounded-lg py-2 ${selectedTeam === 'away' ? 'bg-kelme-red' : 'bg-kelme-gray-100'}`}
        >
          {awayTeam.name}
        </button>
      </div>

      <select
        value={selectedPlayer}
        onChange={(e) => {
          setSelectedPlayer(e.target.value)
          if (e.target.value === selectedAssist) setSelectedAssist('')
        }}
        className="w-full rounded-lg border border-kelme-border bg-kelme-surface px-4 py-3"
      >
        <option value="">Seleccionar jugador...</option>
        {activeTeam.players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <select
        value={selectedAssist}
        onChange={(e) => setSelectedAssist(e.target.value)}
        className="w-full rounded-lg border border-kelme-border bg-kelme-surface px-4 py-3"
      >
        <option value="">Asistencia (opcional)...</option>
        {activeTeam.players
          .filter((p) => p.id !== selectedPlayer)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
      </select>

      <div className="grid grid-cols-2 gap-3">
        {QUICK_EVENTS.map((ev) => (
          <button
            key={ev.type}
            type="button"
            disabled={loading}
            onClick={() => submitEvent(ev.type)}
            className={`rounded-xl py-4 text-lg font-bold ${ev.color} disabled:opacity-50`}
          >
            {eventLabel(ev.type, ev.label)}
          </button>
        ))}
      </div>

      {pendingEvent && (
        <p className="text-center text-yellow-600">
          Selecciona un jugador para registrar este evento.
        </p>
      )}
    </div>
  )
}
