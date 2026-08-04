'use client'

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
}

export function FriendlyMatchConvocationPicker({
  roster,
  convokedIds,
  search,
  onSearchChange,
  onToggle,
}: Props) {
  const filtered = filterRoster(roster, search)

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
      {roster.length === 0 ? (
        <p className="text-sm text-kelme-gray-400">No hay jugadores en esta categoría.</p>
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
