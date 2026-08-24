'use client'

import { useState } from 'react'
import { playersOfTeam } from '@/lib/friendly-match-roster-ui'
import type { FriendlyRosterPlayer } from './FriendlyMatchConvocationPicker'

type TeamOption = { id: string; name: string }

type Props = {
  teams: TeamOption[]
  roster: FriendlyRosterPlayer[]
  onAddToSide: (side: 'A' | 'B', playerIds: string[]) => void
  /** Solo un lado (ej. desafío guest en lado B) */
  sideOnly?: 'A' | 'B'
}

export function FriendlyTeamBulkAdd({ teams, roster, onAddToSide, sideOnly }: Props) {
  const [teamId, setTeamId] = useState('')

  if (teams.length === 0) return null

  const count = teamId ? playersOfTeam(roster, teamId).length : 0

  function handleAdd(side: 'A' | 'B') {
    if (!teamId || count === 0) return
    const ids = playersOfTeam(roster, teamId).map((p) => p.id)
    onAddToSide(side, ids)
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-kelme-border bg-kelme-surface p-3">
      <label className="flex min-w-[10rem] flex-col gap-1">
        <span className="text-xs font-medium text-kelme-gray-600">Equipo</span>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="input-kelme rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Selecciona equipo</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      {(sideOnly === undefined || sideOnly === 'A') && (
        <button
          type="button"
          disabled={!teamId || count === 0}
          onClick={() => handleAdd('A')}
          className="rounded-lg border border-kelme-border px-3 py-2 text-sm font-semibold hover:border-kelme-red disabled:opacity-50"
        >
          Agregar todo al lado A{count > 0 ? ` (${count})` : ''}
        </button>
      )}
      {(sideOnly === undefined || sideOnly === 'B') && (
        <button
          type="button"
          disabled={!teamId || count === 0}
          onClick={() => handleAdd('B')}
          className="rounded-lg border border-kelme-border px-3 py-2 text-sm font-semibold hover:border-kelme-red disabled:opacity-50"
        >
          Agregar todo al lado B{count > 0 ? ` (${count})` : ''}
        </button>
      )}
    </div>
  )
}
