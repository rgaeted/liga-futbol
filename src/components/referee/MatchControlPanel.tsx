'use client'

import { useState } from 'react'
import { EventType } from '@prisma/client'

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

export function MatchControlPanel({
  matchId,
  matchType,
  homeTeam,
  awayTeam,
  initialHomeScore,
  initialAwayScore,
  initialStatus,
}: Props) {
  const [minute, setMinute] = useState(0)
  const [homeScore, setHomeScore] = useState(initialHomeScore)
  const [awayScore, setAwayScore] = useState(initialAwayScore)
  const [status, setStatus] = useState(initialStatus)
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home')
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [pendingEvent, setPendingEvent] = useState<EventType | null>(null)
  const [loading, setLoading] = useState(false)

  const activeTeam = selectedTeam === 'home' ? homeTeam : awayTeam

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
            minute,
            friendlyPlayerId: selectedPlayer || undefined,
            side: selectedTeam === 'home' ? ('A' as const) : ('B' as const),
          }
        : {
            type,
            minute,
            playerId: selectedPlayer || undefined,
            teamId: activeTeam.id,
          }

    setLoading(true)
    const res = await fetch(`/api/matches/${matchId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.match) {
      setHomeScore(data.match.homeScore)
      setAwayScore(data.match.awayScore)
      setStatus(data.match.status)
    }
    setPendingEvent(null)
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 text-kelme-gray-900">
      <div className="text-center">
        <p className="font-ui text-sm uppercase tracking-widest text-kelme-red">
          {status === 'LIVE' ? '● EN VIVO' : status}
        </p>
        <p className="font-display text-5xl font-extrabold tabular-nums">
          {homeScore} - {awayScore}
        </p>
        <p className="text-kelme-gray-400">
          {homeTeam.name} vs {awayTeam.name}
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <label className="text-sm">Minuto</label>
        <input
          type="number"
          min={0}
          max={130}
          value={minute}
          onChange={(e) => setMinute(Number(e.target.value))}
          className="w-20 rounded-lg border border-kelme-border bg-kelme-surface px-3 py-2 text-center text-xl font-bold"
        />
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
        onChange={(e) => setSelectedPlayer(e.target.value)}
        className="w-full rounded-lg border border-kelme-border bg-kelme-surface px-4 py-3"
      >
        <option value="">Seleccionar jugador...</option>
        {activeTeam.players.map((p) => (
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
            {ev.label}
          </button>
        ))}
      </div>

      {pendingEvent && (
        <p className="text-center text-yellow-400">
          Selecciona un jugador para registrar este evento.
        </p>
      )}
    </div>
  )
}
