'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'
import { formatDominantFoot } from '@/lib/friendly-player-options'
import {
  FriendlyPlayerProfileFields,
  friendlyPlayerProfilePayload,
} from './FriendlyPlayerProfileFields'
import { FriendlyPlayerPhotoUpload } from './FriendlyPlayerPhotoUpload'
import { FriendlyCategoryCheckboxes } from './FriendlyCategoryCheckboxes'
import type { DominantFoot } from '@prisma/client'

export type FriendlyPlayerRow = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  hasPhoto: boolean
  dominantFoot: DominantFoot | null
  primaryPosition: string | null
  secondaryPosition: string | null
  categoryIds: string[]
}

type CategoryOption = { id: string; name: string }

export function FriendlyPlayersTable({
  players,
  categories,
}: {
  players: FriendlyPlayerRow[]
  categories: CategoryOption[]
}) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dominantFoot, setDominantFoot] = useState('')
  const [primaryPosition, setPrimaryPosition] = useState('')
  const [secondaryPosition, setSecondaryPosition] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(player: FriendlyPlayerRow) {
    setEditingId(player.id)
    setFirstName(player.firstName)
    setLastName(player.lastName)
    setDominantFoot(player.dominantFoot ?? '')
    setPrimaryPosition(player.primaryPosition ?? '')
    setSecondaryPosition(player.secondaryPosition ?? '')
    setCategoryIds(player.categoryIds)
    setEmail('')
    setPassword('')
    setError('')
  }

  async function save(player: FriendlyPlayerRow) {
    if (categoryIds.length === 0) {
      setError('Selecciona al menos una categoría.')
      return
    }
    if (email && !password) {
      setError('Si ingresas email, también debes ingresar una contraseña.')
      return
    }

    setSaving(true)
    setError('')
    const payload: Record<string, unknown> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      friendlyCategoryIds: categoryIds,
      ...friendlyPlayerProfilePayload(dominantFoot, primaryPosition, secondaryPosition),
    }
    if (!player.email && email) {
      payload.email = email.trim()
      payload.password = password
    }

    const result = await submitJson(`/api/friendly-players/${player.id}`, 'PUT', payload)
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setEditingId(null)
    router.refresh()
  }

  function categoryLabels(ids: string[]) {
    return ids
      .map((id) => categories.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-kelme-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-kelme-surface">
          <tr>
            <th className="p-3">Foto</th>
            <th className="p-3">Nombre</th>
            <th className="p-3">Apellido</th>
            <th className="p-3">Categorías</th>
            <th className="p-3">Pie</th>
            <th className="p-3">Posición</th>
            <th className="p-3">2.ª posición</th>
            <th className="p-3">Cuenta</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id} className="border-t border-kelme-border">
              <td className="p-3 align-top">
                <FriendlyPlayerPhotoUpload
                  playerId={player.id}
                  firstName={player.firstName}
                  lastName={player.lastName}
                  hasPhoto={player.hasPhoto}
                />
              </td>
              {editingId === player.id ? (
                <>
                  <td className="p-3 align-top">
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3 align-top">
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                    />
                  </td>
                  <td className="p-3 align-top" colSpan={4}>
                    <div className="space-y-3">
                      <FriendlyCategoryCheckboxes
                        categories={categories}
                        selectedIds={categoryIds}
                        onChange={setCategoryIds}
                        namePrefix={`edit-${player.id}`}
                      />
                      <div className="grid gap-2 md:grid-cols-3">
                        <FriendlyPlayerProfileFields
                          compact
                          dominantFoot={dominantFoot}
                          primaryPosition={primaryPosition}
                          secondaryPosition={secondaryPosition}
                          onDominantFootChange={setDominantFoot}
                          onPrimaryPositionChange={setPrimaryPosition}
                          onSecondaryPositionChange={setSecondaryPosition}
                        />
                      </div>
                      {!player.email && (
                        <div className="grid gap-2 md:grid-cols-2">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email para crear cuenta"
                            className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                          />
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña"
                            className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-2 py-1"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3 align-top">{player.email ?? 'Sin cuenta'}</td>
                  <td className="p-3 align-top">
                    <span className="inline-flex flex-col gap-2">
                      <span className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => save(player)}
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
                      </span>
                      {error && <span className="text-xs text-kelme-red">{error}</span>}
                    </span>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-3">{player.firstName}</td>
                  <td className="p-3">{player.lastName}</td>
                  <td className="p-3">{categoryLabels(player.categoryIds) || '—'}</td>
                  <td className="p-3">{formatDominantFoot(player.dominantFoot)}</td>
                  <td className="p-3">{player.primaryPosition ?? '—'}</td>
                  <td className="p-3">{player.secondaryPosition ?? '—'}</td>
                  <td className="p-3">{player.email ?? 'Sin cuenta'}</td>
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
                        url={`/api/friendly-players/${player.id}`}
                        confirmMessage={`¿Eliminar a ${player.firstName} ${player.lastName} del pool amistoso?`}
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
