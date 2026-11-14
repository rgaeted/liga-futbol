'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'
import { CrestUploadField } from './CrestUploadField'
import { TeamColorPicker } from './TeamColorPicker'
import { TeamCrest } from '@/components/TeamCrest'
import { teamCrestUrl } from '@/lib/team-crest'
import { resolveTeamColor } from '@/lib/team-color'

export type TeamRow = {
  id: string
  name: string
  categoryId: string | null
  categoryName: string | null
  color: string | null
  coachId: string | null
  coachName: string | null
  playerCount: number
  /** Jugadores del equipo (para desplegar la lista en la tabla). */
  players: { id: string; name: string; jerseyNumber: number | null }[]
  hasCrest: boolean
  /** Cambia al subir un escudo nuevo (fuerza a recargar la imagen). */
  crestVersion: number
}

export type CoachOption = {
  id: string
  name: string
  assignedTeamId: string | null
}

function PlayerJerseyRow({ player }: { player: TeamRow['players'][number] }) {
  const router = useRouter()
  const [value, setValue] = useState(player.jerseyNumber?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dirty = value !== (player.jerseyNumber?.toString() ?? '')

  async function save() {
    const number = value.trim() === '' ? null : Number(value)
    if (number !== null && (!Number.isInteger(number) || number < 1 || number > 99)) {
      setError('Dorsal entre 1 y 99')
      return
    }
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/players/${player.id}`, 'PUT', { jerseyNumber: number })
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
  }

  return (
    <li className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        min={1}
        max={99}
        inputMode="numeric"
        aria-label={`Dorsal de ${player.name}`}
        placeholder="N°"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-14 rounded-md border border-kelme-border bg-kelme-gray-100 px-1.5 py-0.5 text-center"
      />
      <span>{player.name}</span>
      {dirty ? (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-kelme-red px-1.5 py-0.5 font-semibold text-white disabled:opacity-50"
        >
          Guardar
        </button>
      ) : null}
      {error ? <span className="text-kelme-red">{error}</span> : null}
    </li>
  )
}

export function TeamsTable({ teams, coaches, categories }: { teams: TeamRow[]; coaches: CoachOption[]; categories: { id: string; name: string }[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [coachId, setCoachId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(team: TeamRow) {
    setEditingId(team.id)
    setName(team.name)
    setColor(team.color)
    setCategoryId(team.categoryId ?? '')
    setCoachId(team.coachId ?? '')
    setError('')
  }

  async function save(teamId: string) {
    setSaving(true)
    setError('')
    const result = await submitJson(`/api/teams/${teamId}`, 'PUT', {
      name,
      color,
      coachId: coachId || null,
      categoryId: categoryId || null,
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
            <th className="p-3">Escudo</th>
            <th className="p-3">Nombre</th>
            <th className="p-3">Categoría</th>
            <th className="p-3">DT</th>
            <th className="p-3">Jugadores</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team.id} className="border-t border-kelme-border">
              {editingId === team.id ? (
                <>
                  <td className="p-3 align-top">
                    <div className="space-y-3">
                      <TeamColorPicker
                        name={name}
                        value={color}
                        onChange={setColor}
                        hasCrest={team.hasCrest}
                        crestSrc={teamCrestUrl(team.id, team.crestVersion)}
                      />
                      <CrestUploadField
                        label="Imagen del escudo (opcional)"
                        name={name}
                        color={resolveTeamColor(color, name)}
                        uploadUrl={`/api/teams/${team.id}/crest`}
                        previewUrl={teamCrestUrl(team.id, team.crestVersion)}
                        hasCrest={team.hasCrest}
                        onUpdated={() => router.refresh()}
                      />
                    </div>
                  </td>
                  <td className="p-3">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3">
                    <select
                      aria-label="Categoría del equipo"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={coachId}
                      onChange={(e) => setCoachId(e.target.value)}
                      className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    >
                      <option value="">Sin DT</option>
                      {coaches.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          disabled={c.assignedTeamId !== null && c.assignedTeamId !== team.id}
                        >
                          {c.name}
                          {c.assignedTeamId && c.assignedTeamId !== team.id ? ' (asignado)' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">{team.playerCount}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => save(team.id)}
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
                  <td className="p-3">
                    <TeamCrest
                      name={team.name}
                      src={team.hasCrest ? teamCrestUrl(team.id, team.crestVersion) : null}
                      color={resolveTeamColor(team.color, team.name)}
                      size="sm"
                    />
                  </td>
                  <td className="p-3">{team.name}</td>
                  <td className="p-3">{team.categoryName ?? 'Sin categoría'}</td>
                  <td className="p-3">{team.coachName ?? '—'}</td>
                  <td className="p-3 align-top">
                    {team.players.length > 0 ? (
                      <details>
                        <summary className="cursor-pointer font-semibold text-org-primary">
                          {team.playerCount} {team.playerCount === 1 ? 'jugador' : 'jugadores'}
                        </summary>
                        <ul className="mt-2 space-y-0.5 text-xs text-kelme-gray-400">
                          {team.players.map((player) => (
                            <PlayerJerseyRow key={player.id} player={player} />
                          ))}
                        </ul>
                      </details>
                    ) : (
                      team.playerCount
                    )}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(team)}
                        className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
                      >
                        Editar
                      </button>
                      <DeleteButton
                        url={`/api/teams/${team.id}`}
                        confirmMessage={`¿Eliminar el equipo ${team.name}? Sus jugadores quedarán sin equipo.`}
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
