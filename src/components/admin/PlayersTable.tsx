'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'

export type PlayerRow = {
  id: string
  name: string
  email: string
  teamId: string | null
  teamName: string | null
  jerseyNumber: number | null
  position: string | null
}

type TeamOption = { id: string; name: string }

export function PlayersTable({ players, teams }: { players: PlayerRow[]; teams: TeamOption[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [teamId, setTeamId] = useState('')
  const [jerseyNumber, setJerseyNumber] = useState('')
  const [position, setPosition] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(player: PlayerRow) {
    setEditingId(player.id)
    setTeamId(player.teamId ?? '')
    setJerseyNumber(player.jerseyNumber?.toString() ?? '')
    setPosition(player.position ?? '')
    setError('')
  }

  async function save(playerId: string) {
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/players/${playerId}`, 'PUT', {
      teamId: teamId || null,
      jerseyNumber: jerseyNumber ? Number(jerseyNumber) : null,
      position: position || null,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setEditingId(null)
    router.refresh()
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-kelme-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-kelme-surface">
          <tr>
            <th className="p-3">Nombre</th>
            <th className="p-3">Email</th>
            <th className="p-3">Equipo</th>
            <th className="p-3">Dorsal</th>
            <th className="p-3">Posición</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id} className="border-t border-kelme-border">
              <td className="p-3">{player.name}</td>
              <td className="p-3">{player.email}</td>
              {editingId === player.id ? (
                <>
                  <td className="p-3">
                    <select
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                      className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    >
                      <option value="">Sin equipo</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={jerseyNumber}
                      onChange={(e) => setJerseyNumber(e.target.value)}
                      className="w-16 rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-32 rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => save(player.id)}
                        disabled={saving}
                        className="rounded-lg bg-kelme-red px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs"
                      >
                        Cancelar
                      </button>
                      {error && <span className="text-xs text-kelme-red">{error}</span>}
                    </span>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-3">{player.teamName ?? '—'}</td>
                  <td className="p-3">{player.jerseyNumber ?? '—'}</td>
                  <td className="p-3">{player.position ?? '—'}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(player)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
                      >
                        Editar
                      </button>
                      <DeleteButton
                        url={`/api/players/${player.id}`}
                        confirmMessage={`¿Eliminar al jugador ${player.name}? Se borra también su usuario.`}
                      />
                    </span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
