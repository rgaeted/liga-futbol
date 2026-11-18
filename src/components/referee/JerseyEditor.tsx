'use client'

import { useState } from 'react'
import { readApiError } from '@/lib/api-error'

export type JerseyEditorPlayer = {
  id: string
  label: string
  /** Dorsal asignado para este partido (null si aún no hay). */
  jersey: number | null
  /** Dorsal permanente del jugador, se muestra como sugerencia. */
  permanentJersey: number | null
}

type Props = {
  matchId: string
  teamName: string
  players: JerseyEditorPlayer[]
  onChange: (playerId: string, jersey: number | null) => void
}

function sortPlayers(players: JerseyEditorPlayer[]) {
  return [...players].sort((a, b) => {
    const aj = a.jersey ?? a.permanentJersey
    const bj = b.jersey ?? b.permanentJersey
    if (aj === null && bj === null) return a.label.localeCompare(b.label, 'es-CL')
    if (aj === null) return 1
    if (bj === null) return -1
    return aj - bj
  })
}

export function JerseyEditor({ matchId, teamName, players, onChange }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function save(player: JerseyEditorPlayer) {
    const draft = drafts[player.id]
    if (draft === undefined) return
    const trimmed = draft.trim()
    const next = trimmed === '' ? null : Number(trimmed)

    const clearDraft = () =>
      setDrafts((prev) => {
        const rest = { ...prev }
        delete rest[player.id]
        return rest
      })

    if (next === player.jersey) {
      clearDraft()
      return
    }
    if (next !== null && (!Number.isInteger(next) || next < 0 || next > 99)) {
      setError('Dorsal no válido: usa un número entre 0 y 99')
      clearDraft()
      return
    }

    setSavingId(player.id)
    setError('')
    const res = await fetch(`/api/matches/${matchId}/jerseys`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: player.id, number: next }),
    })
    setSavingId(null)
    clearDraft()
    if (!res.ok) {
      setError(await readApiError(res, 'No se pudo guardar el dorsal'))
      return
    }
    onChange(player.id, next)
  }

  return (
    <div className="space-y-2">
      <p className="font-ui text-sm font-medium text-kelme-gray-700">{teamName}</p>
      <ul className="divide-y divide-kelme-border rounded-lg border border-kelme-border">
        {sortPlayers(players).map((player) => (
          <li key={player.id} className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="min-w-0 flex-1 truncate text-sm">{player.label}</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              aria-label={`Dorsal de ${player.label}`}
              placeholder={player.permanentJersey !== null ? String(player.permanentJersey) : '—'}
              value={drafts[player.id] ?? (player.jersey !== null ? String(player.jersey) : '')}
              disabled={savingId === player.id}
              onChange={(e) =>
                setDrafts((prev) => ({ ...prev, [player.id]: e.target.value.replace(/\D/g, '') }))
              }
              onBlur={() => void save(player)}
              className="h-11 w-16 rounded-lg border border-kelme-border bg-white text-center font-display text-lg font-bold tabular-nums disabled:opacity-50"
            />
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm font-semibold text-org-primary">{error}</p> : null}
    </div>
  )
}
