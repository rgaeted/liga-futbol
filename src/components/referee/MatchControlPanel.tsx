'use client'

import { useState } from 'react'
import { EventType } from '@prisma/client'
import { MatchClockDisplay } from '@/components/live/MatchClockDisplay'
import { MatchTeamMvpEditor } from '@/components/match/MatchTeamMvpEditor'
import { EVENT_TYPE_LABELS, eventNeedsPlayer } from '@/lib/event-labels'
import { refereePanelEvents } from '@/lib/match-referee-events'
import { matchStatusLabel } from '@/lib/match-status-ui'
import type { TeamMvpSideView } from '@/lib/match-mvp'
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
  initialTeamMvps: TeamMvpSideView[]
  initialClock: SerializableClockState
  enabledEventTypes: EventType[]
}

type DetailMode = 'team' | 'player' | 'goal'

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function getDetailMode(type: EventType): DetailMode | null {
  if (type === EventType.KICKOFF) return 'team'
  if (type === EventType.GOAL) return 'goal'
  if (eventNeedsPlayer(type)) return 'player'
  return null
}

export function MatchControlPanel({
  matchId,
  matchType,
  homeTeam,
  awayTeam,
  initialHomeScore,
  initialAwayScore,
  initialStatus,
  initialTeamMvps,
  initialClock,
  enabledEventTypes,
}: Props) {
  const quickEvents = refereePanelEvents(enabledEventTypes)
  const instantEvents = quickEvents
    .map((item) => item.type)
    .filter((type) =>
      ([EventType.HALFTIME, EventType.FULLTIME, EventType.FOUL] as EventType[]).includes(type)
    )
  const [homeScore, setHomeScore] = useState(initialHomeScore)
  const [awayScore, setAwayScore] = useState(initialAwayScore)
  const [status, setStatus] = useState(initialStatus)
  const [clock, setClock] = useState(initialClock)
  const [pendingEvent, setPendingEvent] = useState<EventType | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [selectedAssist, setSelectedAssist] = useState('')
  const [loading, setLoading] = useState(false)

  const activeTeam = selectedTeam === 'home' ? homeTeam : selectedTeam === 'away' ? awayTeam : null
  const detailMode = pendingEvent ? getDetailMode(pendingEvent) : null

  function resetDetails() {
    setPendingEvent(null)
    setSelectedTeam(null)
    setSelectedPlayer('')
    setSelectedAssist('')
  }

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

  async function submitEvent(
    type: EventType,
    opts?: {
      team?: 'home' | 'away'
      playerId?: string
      assistId?: string
    }
  ) {
    const teamSide = opts?.team ?? selectedTeam
    const playerId = opts?.playerId ?? selectedPlayer
    const assistId = opts?.assistId ?? selectedAssist
    const team = teamSide === 'home' ? homeTeam : teamSide === 'away' ? awayTeam : null

    const body =
      matchType === 'FRIENDLY'
        ? {
            type,
            friendlyPlayerId: playerId || undefined,
            side: teamSide === 'home' ? ('A' as const) : teamSide === 'away' ? ('B' as const) : undefined,
            ...(type === EventType.GOAL && assistId
              ? { assistFriendlyPlayerId: assistId }
              : {}),
          }
        : {
            type,
            playerId: playerId || undefined,
            teamId: team?.id,
            ...(type === EventType.GOAL && assistId ? { assistPlayerId: assistId } : {}),
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
    resetDetails()
    setLoading(false)
  }

  function handleEventClick(type: EventType) {
    if (instantEvents.includes(type)) {
      void submitEvent(type)
      return
    }
    setPendingEvent(type)
    setSelectedTeam(null)
    setSelectedPlayer('')
    setSelectedAssist('')
  }

  async function handleTeamPick(team: 'home' | 'away') {
    if (!pendingEvent) return
    setSelectedTeam(team)
    setSelectedPlayer('')
    setSelectedAssist('')

    if (detailMode === 'team') {
      await submitEvent(pendingEvent, { team })
    }
  }

  async function handleConfirmDetails(withoutAssist = false) {
    if (!pendingEvent || !selectedTeam) return
    if (detailMode === 'goal' || detailMode === 'player') {
      if (!selectedPlayer) return
      await submitEvent(pendingEvent, {
        assistId: withoutAssist ? undefined : selectedAssist || undefined,
      })
    }
  }

  function eventLabel(type: EventType, defaultLabel: string) {
    if (type === EventType.KICKOFF) {
      if (status === 'HALFTIME') return '▶ 2.º tiempo'
      return '▶ Inicio'
    }
    return defaultLabel
  }

  function kickoffPrompt() {
    if (status === 'HALFTIME') return '¿Qué equipo saca el segundo tiempo?'
    return '¿Qué equipo saca?'
  }

  function canConfirmDetails() {
    if (!selectedTeam || !selectedPlayer) return false
    return detailMode === 'player' || detailMode === 'goal'
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 text-kelme-gray-900">
      <div className="text-center">
        <p className="font-ui text-sm uppercase tracking-widest text-kelme-red">
          {status === 'LIVE' ? '● EN VIVO' : matchStatusLabel(status)}
        </p>
        <MatchClockDisplay clock={{ ...clock, status }} className="text-kelme-gray-900" />
        <p className="font-display text-5xl font-extrabold tabular-nums">
          {homeScore} - {awayScore}
        </p>
        <p className="text-kelme-gray-400">
          {homeTeam.name} vs {awayTeam.name}
        </p>
      </div>

      {pendingEvent ? (
        <section className="space-y-4 rounded-xl border border-kelme-border bg-kelme-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-ui text-xs uppercase tracking-wider text-kelme-gray-400">
                Registrar evento
              </p>
              <h2 className="font-display text-lg font-bold">
                {pendingEvent === EventType.KICKOFF && status === 'HALFTIME'
                  ? 'Inicio 2.º tiempo'
                  : EVENT_TYPE_LABELS[pendingEvent]}
              </h2>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={resetDetails}
              className="rounded-lg border border-kelme-border px-3 py-1.5 text-sm text-kelme-gray-600 hover:bg-kelme-gray-100 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>

          <div className="space-y-2">
            <p className="font-ui text-sm font-medium text-kelme-gray-700">
              {detailMode === 'team' ? kickoffPrompt() : 'Equipo'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleTeamPick('home')}
                className={`flex-1 rounded-lg py-3 font-semibold transition-colors ${
                  selectedTeam === 'home'
                    ? 'bg-kelme-red text-white'
                    : 'bg-kelme-gray-100 hover:bg-kelme-gray-200'
                } disabled:opacity-50`}
              >
                {homeTeam.name}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleTeamPick('away')}
                className={`flex-1 rounded-lg py-3 font-semibold transition-colors ${
                  selectedTeam === 'away'
                    ? 'bg-kelme-red text-white'
                    : 'bg-kelme-gray-100 hover:bg-kelme-gray-200'
                } disabled:opacity-50`}
              >
                {awayTeam.name}
              </button>
            </div>
          </div>

          {(detailMode === 'player' || detailMode === 'goal') && selectedTeam && activeTeam && (
            <div className="space-y-2">
              <p className="font-ui text-sm font-medium text-kelme-gray-700">Jugador</p>
              {activeTeam.players.length === 0 ? (
                <p className="text-sm text-kelme-gray-400">No hay jugadores en este equipo.</p>
              ) : (
                <ul className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-kelme-border">
                  {activeTeam.players.map((player) => (
                    <li key={player.id}>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setSelectedPlayer(player.id)
                          if (selectedAssist === player.id) setSelectedAssist('')
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                          selectedPlayer === player.id
                            ? 'bg-kelme-red/10 font-semibold text-kelme-red'
                            : 'hover:bg-kelme-gray-100'
                        } disabled:opacity-50`}
                      >
                        {player.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {detailMode === 'goal' && selectedPlayer && activeTeam && (
            <div className="space-y-2">
              <p className="font-ui text-sm font-medium text-kelme-gray-700">
                Asistencia <span className="font-normal text-kelme-gray-400">(opcional)</span>
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-kelme-border">
                {activeTeam.players
                  .filter((player) => player.id !== selectedPlayer)
                  .map((player) => (
                    <li key={player.id}>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setSelectedAssist(player.id)}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                          selectedAssist === player.id
                            ? 'bg-kelme-red/10 font-semibold text-kelme-red'
                            : 'hover:bg-kelme-gray-100'
                        } disabled:opacity-50`}
                      >
                        {player.label}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {(detailMode === 'player' || detailMode === 'goal') && (
            <div className="flex gap-2 pt-1">
              {detailMode === 'goal' && (
                <button
                  type="button"
                  disabled={loading || !canConfirmDetails()}
                  onClick={() => void handleConfirmDetails(true)}
                  className="flex-1 rounded-xl border border-kelme-border py-3 font-semibold hover:bg-kelme-gray-100 disabled:opacity-50"
                >
                  Sin asistencia
                </button>
              )}
              <button
                type="button"
                disabled={loading || !canConfirmDetails()}
                onClick={() => void handleConfirmDetails(false)}
                className={`rounded-xl bg-kelme-red py-3 font-bold text-white hover:bg-kelme-red-dark disabled:opacity-50 ${
                  detailMode === 'goal' ? 'flex-1' : 'w-full'
                }`}
              >
                {loading ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {quickEvents.map((ev) => (
            <button
              key={ev.type}
              type="button"
              disabled={loading}
              onClick={() => handleEventClick(ev.type)}
              className={`rounded-xl py-4 text-lg font-bold ${ev.color} disabled:opacity-50`}
            >
              {eventLabel(ev.type, ev.label)}
            </button>
          ))}
        </div>
      )}

      <MatchTeamMvpEditor
        matchId={matchId}
        matchType={matchType}
        matchStatus={status}
        homeTeam={{ label: homeTeam.name, players: homeTeam.players }}
        awayTeam={{ label: awayTeam.name, players: awayTeam.players }}
        teamMvps={initialTeamMvps}
        compact
      />
    </div>
  )
}
