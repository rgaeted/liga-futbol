'use client'

import { useState } from 'react'
import { readApiError } from '@/lib/api-error'
import { FriendlyPlayerAvatar } from './FriendlyPlayerAvatar'

export type FriendlyRosterPlayer = {
  id: string
  firstName: string
  lastName: string
  categoryIds: string[]
  primaryPosition?: string | null
  hasPhoto?: boolean
}

function playerLabel(p: FriendlyRosterPlayer) {
  const name = `${p.firstName} ${p.lastName}`.trim()
  return p.primaryPosition ? `${name} (${p.primaryPosition})` : name
}

function playerSearchText(p: FriendlyRosterPlayer) {
  return `${p.firstName} ${p.lastName} ${p.primaryPosition ?? ''}`.toLowerCase()
}

function filterRoster(players: FriendlyRosterPlayer[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return players
  return players.filter((p) => playerSearchText(p).includes(q))
}

type Props = {
  roster: FriendlyRosterPlayer[]
  convokedIds: Set<string>
  search: string
  onSearchChange: (value: string) => void
  onToggle: (playerId: string, checked: boolean) => void
  /** Categoría del partido — requerida para el alta rápida */
  categoryId?: string | null
  /** Tras crear: el padre agrega al roster local y marca convocado */
  onPlayerCreated?: (player: FriendlyRosterPlayer) => void
}

export function FriendlyMatchConvocationPicker({
  roster,
  convokedIds,
  search,
  onSearchChange,
  onToggle,
  categoryId,
  onPlayerCreated,
}: Props) {
  const filtered = filterRoster(roster, search)
  const canQuickCreate = Boolean(categoryId && onPlayerCreated)

  const [showCreate, setShowCreate] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  function resetCreateForm() {
    setFirstName('')
    setLastName('')
    setCreateError('')
    setShowCreate(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId || !onPlayerCreated) return

    const first = firstName.trim()
    const last = lastName.trim()
    if (!first || !last) {
      setCreateError('Ingresa nombre y apellido.')
      return
    }

    setCreating(true)
    setCreateError('')

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: first,
          lastName: last,
          friendlyCategoryIds: [categoryId],
        }),
      })

      if (!res.ok) {
        setCreateError(await readApiError(res))
        return
      }

      const created = (await res.json()) as {
        id: string
        firstName: string
        lastName: string
        primaryPosition?: string | null
        photoMimeType?: string | null
        categories?: Array<{ friendlyCategoryId: string }>
      }

      onPlayerCreated({
        id: created.id,
        firstName: created.firstName,
        lastName: created.lastName,
        primaryPosition: created.primaryPosition ?? null,
        hasPhoto: Boolean(created.photoMimeType),
        categoryIds:
          created.categories?.map((c) => c.friendlyCategoryId) ?? [categoryId],
      })
      resetCreateForm()
    } finally {
      setCreating(false)
    }
  }

  return (
    <fieldset className="rounded-lg border border-kelme-border bg-white p-3">
      <legend className="px-1 text-sm font-medium">
        Convocados
        {convokedIds.size > 0 && (
          <span className="ml-1 font-normal text-kelme-gray-400">
            ({convokedIds.size} seleccionados)
          </span>
        )}
      </legend>

      {canQuickCreate && (
        <div className="mb-3">
          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="text-sm font-semibold text-kelme-red hover:underline"
            >
              + Nuevo jugador
            </button>
          ) : (
            <form
              onSubmit={(e) => void handleCreate(e)}
              className="space-y-2 rounded-lg border border-kelme-border bg-kelme-gray-50 p-3"
            >
              <p className="text-xs font-medium text-kelme-gray-600">
                Alta rápida (queda en esta categoría y convocado)
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Nombre"
                  autoFocus
                  className="rounded-lg border border-kelme-border bg-white px-3 py-1.5 text-sm"
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Apellido"
                  className="rounded-lg border border-kelme-border bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-kelme-red px-3 py-1.5 text-sm font-semibold text-white hover:bg-kelme-red-dark disabled:opacity-50"
                >
                  {creating ? 'Creando…' : 'Crear'}
                </button>
                <button
                  type="button"
                  disabled={creating}
                  onClick={resetCreateForm}
                  className="rounded-lg border border-kelme-border bg-white px-3 py-1.5 text-sm font-semibold text-kelme-gray-700 hover:bg-kelme-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
              {createError ? <p className="text-sm text-kelme-red">{createError}</p> : null}
            </form>
          )}
        </div>
      )}

      {roster.length === 0 && !canQuickCreate ? (
        <p className="text-sm text-kelme-gray-400">No hay jugadores en esta categoría.</p>
      ) : roster.length === 0 ? (
        <p className="text-sm text-kelme-gray-400">
          No hay jugadores en esta categoría. Crea uno con el botón de arriba.
        </p>
      ) : (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar jugador…"
            className="mb-2 w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-1.5 text-sm"
          />
          {filtered.length === 0 ? (
            <p className="text-sm text-kelme-gray-400">Ningún jugador coincide con la búsqueda.</p>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {filtered.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={convokedIds.has(p.id)}
                      onChange={(ev) => onToggle(p.id, ev.target.checked)}
                    />
                    <FriendlyPlayerAvatar
                      id={p.id}
                      firstName={p.firstName}
                      lastName={p.lastName}
                      hasPhoto={Boolean(p.hasPhoto)}
                      size="sm"
                    />
                    {playerLabel(p)}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </fieldset>
  )
}
