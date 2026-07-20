'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { EventType } from '@prisma/client'
import {
  ALL_EVENT_TYPES,
  EVENT_TYPE_LABELS,
  eventNeedsPlayer,
} from '@/lib/event-labels'
import { readApiError } from '@/lib/api-error'

type RosterPlayer = { id: string; label: string; side?: 'A' | 'B' }

type TimelineEvent = {
  id: string
  type: EventType
  minute: number
  playerId: string | null
  teamId: string | null
  friendlyPlayerId: string | null
  side: 'A' | 'B' | null
  description: string | null
  playerName: string | null
}

type Props = {
  matchId: string
  matchType: 'LEAGUE' | 'FRIENDLY'
  homeTeamId: string | null
  awayTeamId: string | null
  homeLabel: string
  awayLabel: string
  players: RosterPlayer[]
  initialEvents: TimelineEvent[]
}

type EditState = {
  id: string
  type: EventType
  minute: number
  playerId: string
  teamId: string
  friendlyPlayerId: string
  side: string
  description: string
}

export function MatchTimelineEditor({
  matchId,
  matchType,
  homeTeamId,
  awayTeamId,
  homeLabel,
  awayLabel,
  players,
  initialEvents,
}: Props) {
  const router = useRouter()
  const [events, setEvents] = useState(initialEvents)

  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])
  const [editing, setEditing] = useState<EditState | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [newEvent, setNewEvent] = useState({
    type: EventType.GOAL as EventType,
    minute: 0,
    playerId: '',
    teamId: homeTeamId ?? '',
    friendlyPlayerId: '',
    side: 'A',
    description: '',
  })

  function startEdit(event: TimelineEvent) {
    setEditing({
      id: event.id,
      type: event.type,
      minute: event.minute,
      playerId: event.playerId ?? '',
      teamId: event.teamId ?? homeTeamId ?? '',
      friendlyPlayerId: event.friendlyPlayerId ?? '',
      side: event.side ?? 'A',
      description: event.description ?? '',
    })
    setError('')
  }

  async function saveEdit() {
    if (!editing) return
    setLoading(true)
    setError('')

    const body =
      matchType === 'FRIENDLY'
        ? {
            type: editing.type,
            minute: editing.minute,
            friendlyPlayerId: editing.friendlyPlayerId || null,
            side: editing.side || null,
            description: editing.description || null,
          }
        : {
            type: editing.type,
            minute: editing.minute,
            playerId: editing.playerId || null,
            teamId: editing.teamId || null,
            description: editing.description || null,
          }

    const res = await fetch(`/api/matches/${matchId}/events/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      setError(await readApiError(res))
      setLoading(false)
      return
    }

    setEditing(null)
    setLoading(false)
    router.refresh()
  }

  async function deleteEvent(eventId: string) {
    if (!confirm('¿Eliminar este evento? El marcador se recalculará.')) return
    setLoading(true)
    setError('')

    const res = await fetch(`/api/matches/${matchId}/events/${eventId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      setError(await readApiError(res))
      setLoading(false)
      return
    }

    setEvents((prev) => prev.filter((e) => e.id !== eventId))
    setLoading(false)
    router.refresh()
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const body =
      matchType === 'FRIENDLY'
        ? {
            type: newEvent.type,
            minute: newEvent.minute,
            friendlyPlayerId: newEvent.friendlyPlayerId || undefined,
            side: newEvent.side as 'A' | 'B',
            description: newEvent.description || undefined,
          }
        : {
            type: newEvent.type,
            minute: newEvent.minute,
            playerId: newEvent.playerId || undefined,
            teamId: newEvent.teamId || undefined,
            description: newEvent.description || undefined,
          }

    const res = await fetch(`/api/matches/${matchId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      setError(await readApiError(res))
      setLoading(false)
      return
    }

    setNewEvent((prev) => ({
      ...prev,
      minute: 0,
      playerId: '',
      friendlyPlayerId: '',
      description: '',
    }))
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <form onSubmit={addEvent} className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4 md:grid-cols-3">
        <h2 className="font-display text-lg font-bold md:col-span-3">Agregar evento</h2>
        <select
          value={newEvent.type}
          onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as EventType })}
          className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        >
          {ALL_EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={130}
          value={newEvent.minute}
          onChange={(e) => setNewEvent({ ...newEvent, minute: Number(e.target.value) })}
          placeholder="Minuto"
          required
          className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        />
        {matchType === 'FRIENDLY' ? (
          <>
            <select
              value={newEvent.side}
              onChange={(e) => setNewEvent({ ...newEvent, side: e.target.value })}
              className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
            >
              <option value="A">{homeLabel}</option>
              <option value="B">{awayLabel}</option>
            </select>
            {eventNeedsPlayer(newEvent.type) && (
              <select
                value={newEvent.friendlyPlayerId}
                onChange={(e) => setNewEvent({ ...newEvent, friendlyPlayerId: e.target.value })}
                className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2"
              >
                <option value="">Jugador (opcional)</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          </>
        ) : (
          <>
            <select
              value={newEvent.teamId}
              onChange={(e) => setNewEvent({ ...newEvent, teamId: e.target.value })}
              className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
            >
              {homeTeamId && <option value={homeTeamId}>{homeLabel}</option>}
              {awayTeamId && <option value={awayTeamId}>{awayLabel}</option>}
            </select>
            {eventNeedsPlayer(newEvent.type) && (
              <select
                value={newEvent.playerId}
                onChange={(e) => setNewEvent({ ...newEvent, playerId: e.target.value })}
                className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2"
              >
                <option value="">Jugador (opcional)</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50 md:col-span-3"
        >
          Agregar evento
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-kelme-border bg-kelme-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-kelme-border text-left text-kelme-gray-400">
              <th className="px-4 py-3">Min</th>
              <th className="px-4 py-3">Evento</th>
              <th className="px-4 py-3">Jugador</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) =>
              editing?.id === event.id ? (
                <tr key={event.id} className="border-b border-kelme-border">
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      max={130}
                      value={editing.minute}
                      onChange={(e) =>
                        setEditing({ ...editing, minute: Number(e.target.value) })
                      }
                      className="w-16 rounded border border-kelme-border px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={editing.type}
                      onChange={(e) =>
                        setEditing({ ...editing, type: e.target.value as EventType })
                      }
                      className="rounded border border-kelme-border px-2 py-1"
                    >
                      {ALL_EVENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {EVENT_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {matchType === 'FRIENDLY' ? (
                      <select
                        value={editing.friendlyPlayerId}
                        onChange={(e) =>
                          setEditing({ ...editing, friendlyPlayerId: e.target.value })
                        }
                        className="rounded border border-kelme-border px-2 py-1"
                      >
                        <option value="">—</option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={editing.playerId}
                        onChange={(e) =>
                          setEditing({ ...editing, playerId: e.target.value })
                        }
                        className="rounded border border-kelme-border px-2 py-1"
                      >
                        <option value="">—</option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="space-x-2 px-4 py-3">
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={loading}
                      className="text-kelme-red hover:underline"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="text-kelme-gray-400 hover:underline"
                    >
                      Cancelar
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={event.id} className="border-b border-kelme-border">
                  <td className="px-4 py-3 font-mono">{event.minute}&apos;</td>
                  <td className="px-4 py-3">{EVENT_TYPE_LABELS[event.type]}</td>
                  <td className="px-4 py-3">{event.playerName ?? '—'}</td>
                  <td className="space-x-2 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => startEdit(event)}
                      className="text-kelme-red hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEvent(event.id)}
                      disabled={loading}
                      className="text-kelme-gray-400 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-kelme-red">{error}</p>}
    </div>
  )
}
