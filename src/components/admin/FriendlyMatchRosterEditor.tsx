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
  sideAName?: string
  sideBName?: string
  sideAIds: Set<string>
  sideBIds: Set<string>
  sideASearch: string
  sideBSearch: string
  onSideASearchChange: (value: string) => void
  onSideBSearchChange: (value: string) => void
  sideACaptainId: string | null
  sideBCaptainId: string | null
  onSideACaptainChange: (playerId: string | null) => void
  onSideBCaptainChange: (playerId: string | null) => void
  onToggleSide: (side: 'A' | 'B', playerId: string, checked: boolean) => void
}

export function FriendlyMatchRosterEditor({
  roster,
  sideAName = 'A',
  sideBName = 'B',
  sideAIds,
  sideBIds,
  sideASearch,
  sideBSearch,
  sideACaptainId,
  sideBCaptainId,
  onSideASearchChange,
  onSideBSearchChange,
  onSideACaptainChange,
  onSideBCaptainChange,
  onToggleSide,
}: Props) {
  const filteredSideA = filterRoster(roster, sideASearch)
  const filteredSideB = filterRoster(roster, sideBSearch)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <fieldset className="rounded-lg border border-kelme-border bg-white p-3">
        <legend className="px-1 text-sm font-medium">
          Jugadores lado {sideAName}
          {sideAIds.size > 0 && (
            <span className="ml-1 font-normal text-kelme-gray-400">
              ({sideAIds.size} seleccionados)
            </span>
          )}
        </legend>
        {roster.length === 0 ? (
          <p className="text-sm text-kelme-gray-400">No hay jugadores en esta categoría.</p>
        ) : (
          <>
            <input
              type="search"
              value={sideASearch}
              onChange={(e) => onSideASearchChange(e.target.value)}
              placeholder="Buscar jugador…"
              className="mb-2 w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-1.5 text-sm"
            />
            {filteredSideA.length === 0 ? (
              <p className="text-sm text-kelme-gray-400">Ningún jugador coincide con la búsqueda.</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {filteredSideA.map((p) => (
                  <li key={`a-${p.id}`}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={sideAIds.has(p.id)}
                        disabled={sideBIds.has(p.id)}
                        onChange={(ev) => onToggleSide('A', p.id, ev.target.checked)}
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
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium text-kelme-gray-700">Capitán</span>
          <select
            value={sideACaptainId ?? ''}
            onChange={(e) => onSideACaptainChange(e.target.value || null)}
            disabled={sideAIds.size === 0}
            className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">Seleccionar capitán…</option>
            {[...sideAIds].map((playerId) => {
              const p = roster.find((row) => row.id === playerId)
              if (!p) return null
              return (
                <option key={playerId} value={playerId}>
                  {playerLabel(p)}
                </option>
              )
            })}
          </select>
        </label>
      </fieldset>
      <fieldset className="rounded-lg border border-kelme-border bg-white p-3">
        <legend className="px-1 text-sm font-medium">
          Jugadores lado {sideBName}
          {sideBIds.size > 0 && (
            <span className="ml-1 font-normal text-kelme-gray-400">
              ({sideBIds.size} seleccionados)
            </span>
          )}
        </legend>
        {roster.length === 0 ? (
          <p className="text-sm text-kelme-gray-400">No hay jugadores en esta categoría.</p>
        ) : (
          <>
            <input
              type="search"
              value={sideBSearch}
              onChange={(e) => onSideBSearchChange(e.target.value)}
              placeholder="Buscar jugador…"
              className="mb-2 w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-1.5 text-sm"
            />
            {filteredSideB.length === 0 ? (
              <p className="text-sm text-kelme-gray-400">Ningún jugador coincide con la búsqueda.</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {filteredSideB.map((p) => (
                  <li key={`b-${p.id}`}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={sideBIds.has(p.id)}
                        disabled={sideAIds.has(p.id)}
                        onChange={(ev) => onToggleSide('B', p.id, ev.target.checked)}
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
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium text-kelme-gray-700">Capitán</span>
          <select
            value={sideBCaptainId ?? ''}
            onChange={(e) => onSideBCaptainChange(e.target.value || null)}
            disabled={sideBIds.size === 0}
            className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">Seleccionar capitán…</option>
            {[...sideBIds].map((playerId) => {
              const p = roster.find((row) => row.id === playerId)
              if (!p) return null
              return (
                <option key={playerId} value={playerId}>
                  {playerLabel(p)}
                </option>
              )
            })}
          </select>
        </label>
      </fieldset>
    </div>
  )
}

export function rosterEntriesFromSets(
  sideAIds: Set<string>,
  sideBIds: Set<string>,
  sideACaptainId: string | null = null,
  sideBCaptainId: string | null = null
) {
  return [
    ...[...sideAIds].map((friendlyPlayerId) => ({
      friendlyPlayerId,
      side: 'A' as const,
      isCaptain: friendlyPlayerId === sideACaptainId,
    })),
    ...[...sideBIds].map((friendlyPlayerId) => ({
      friendlyPlayerId,
      side: 'B' as const,
      isCaptain: friendlyPlayerId === sideBCaptainId,
    })),
  ]
}

export function setsFromPlayerSides(
  players: Array<{ friendlyPlayerId: string; side: 'A' | 'B'; isCaptain?: boolean }>
) {
  const sideAIds = new Set<string>()
  const sideBIds = new Set<string>()
  let sideACaptainId: string | null = null
  let sideBCaptainId: string | null = null
  for (const p of players) {
    if (p.side === 'A') {
      sideAIds.add(p.friendlyPlayerId)
      if (p.isCaptain) sideACaptainId = p.friendlyPlayerId
    } else {
      sideBIds.add(p.friendlyPlayerId)
      if (p.isCaptain) sideBCaptainId = p.friendlyPlayerId
    }
  }
  return { sideAIds, sideBIds, sideACaptainId, sideBCaptainId }
}

export function toggleFriendlyRosterSide(
  side: 'A' | 'B',
  playerId: string,
  checked: boolean,
  sideAIds: Set<string>,
  sideBIds: Set<string>
): { sideAIds: Set<string>; sideBIds: Set<string> } {
  const nextA = new Set(sideAIds)
  const nextB = new Set(sideBIds)

  if (side === 'A') {
    if (checked) {
      nextA.add(playerId)
      nextB.delete(playerId)
    } else {
      nextA.delete(playerId)
    }
  } else {
    if (checked) {
      nextB.add(playerId)
      nextA.delete(playerId)
    } else {
      nextB.delete(playerId)
    }
  }

  return { sideAIds: nextA, sideBIds: nextB }
}
