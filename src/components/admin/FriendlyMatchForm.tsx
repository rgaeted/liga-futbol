'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { FriendlyPlayerAvatar } from './FriendlyPlayerAvatar'
import { FOOTBALL_FORMATS, FOOTBALL_FORMAT_LABELS } from '@/lib/football-format'

type Referee = { id: string; name: string }
type FriendlyCategoryOption = { id: string; name: string; isActive: boolean }
type FriendlyPlayer = {
  id: string
  firstName: string
  lastName: string
  friendlyCategoryId: string
  primaryPosition?: string | null
  hasPhoto?: boolean
}

type Props = {
  referees: Referee[]
  categories: FriendlyCategoryOption[]
  friendlyPlayers: FriendlyPlayer[]
}

function playerLabel(p: FriendlyPlayer) {
  const name = `${p.firstName} ${p.lastName}`.trim()
  return p.primaryPosition ? `${name} (${p.primaryPosition})` : name
}

function playerSearchText(p: FriendlyPlayer) {
  return `${p.firstName} ${p.lastName} ${p.primaryPosition ?? ''}`.toLowerCase()
}

function filterRoster(players: FriendlyPlayer[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return players
  return players.filter((p) => playerSearchText(p).includes(q))
}

export function FriendlyMatchForm({ referees, categories, friendlyPlayers }: Props) {
  const router = useRouter()
  const activeCategories = categories.filter((c) => c.isActive)
  const [categoryId, setCategoryId] = useState(activeCategories[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sideAIds, setSideAIds] = useState<Set<string>>(new Set())
  const [sideBIds, setSideBIds] = useState<Set<string>>(new Set())
  const [sideASearch, setSideASearch] = useState('')
  const [sideBSearch, setSideBSearch] = useState('')

  const roster = friendlyPlayers.filter((p) => p.friendlyCategoryId === categoryId)
  const filteredSideA = filterRoster(roster, sideASearch)
  const filteredSideB = filterRoster(roster, sideBSearch)

  function onCategoryChange(nextId: string) {
    setCategoryId(nextId)
    setSideAIds(new Set())
    setSideBIds(new Set())
    setSideASearch('')
    setSideBSearch('')
    setError('')
  }

  function toggleSide(side: 'A' | 'B', playerId: string, checked: boolean) {
    setError('')
    if (side === 'A') {
      setSideAIds((prev) => {
        const next = new Set(prev)
        if (checked) next.add(playerId)
        else next.delete(playerId)
        return next
      })
      if (checked) {
        setSideBIds((prev) => {
          if (!prev.has(playerId)) return prev
          const next = new Set(prev)
          next.delete(playerId)
          return next
        })
      }
    } else {
      setSideBIds((prev) => {
        const next = new Set(prev)
        if (checked) next.add(playerId)
        else next.delete(playerId)
        return next
      })
      if (checked) {
        setSideAIds((prev) => {
          if (!prev.has(playerId)) return prev
          const next = new Set(prev)
          next.delete(playerId)
          return next
        })
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setError('')

    if (!categoryId) {
      setError('Selecciona una categoría.')
      return
    }

    const sideA = [...sideAIds]
    const sideB = [...sideBIds]
    const overlap = sideA.some((id) => sideBIds.has(id))
    if (sideA.length < 1 || sideB.length < 1) {
      setError('Selecciona al menos un jugador por lado.')
      return
    }
    if (overlap) {
      setError('Un jugador no puede estar en ambos lados.')
      return
    }

    setLoading(true)
    const form = new FormData(formEl)
    const date = form.get('date') as string
    const time = form.get('time') as string
    const refereeId = String(form.get('refereeId') ?? '').trim()

    const result = await submitJson('/api/matches', 'POST', {
      matchType: 'FRIENDLY',
      friendlyCategoryId: categoryId,
      footballFormat: String(form.get('footballFormat') ?? 'FUTBOL_11'),
      sideAName: String(form.get('sideAName') ?? '').trim(),
      sideBName: String(form.get('sideBName') ?? '').trim(),
      refereeId: refereeId || undefined,
      venue: String(form.get('venue') ?? '').trim() || undefined,
      scheduledAt: new Date(`${date}T${time}`).toISOString(),
      players: [
        ...sideA.map((id) => ({ friendlyPlayerId: id, side: 'A' as const })),
        ...sideB.map((id) => ({ friendlyPlayerId: id, side: 'B' as const })),
      ],
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    formEl.reset()
    setSideAIds(new Set())
    setSideBIds(new Set())
    router.refresh()
  }

  if (activeCategories.length === 0) {
    return (
      <div className="rounded-xl border border-kelme-border bg-kelme-surface p-4">
        <h2 className="font-display text-lg font-semibold">Crear partido amistoso</h2>
        <p className="mt-2 text-sm text-kelme-gray-400">
          Primero crea una categoría amistosa activa.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4"
    >
      <h2 className="font-display text-lg font-semibold">Crear partido amistoso</h2>
      <select
        value={categoryId}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        required
      >
        {activeCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        name="footballFormat"
        defaultValue="FUTBOL_11"
        className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        required
      >
        {FOOTBALL_FORMATS.map((format) => (
          <option key={format} value={format}>
            {FOOTBALL_FORMAT_LABELS[format]}
          </option>
        ))}
      </select>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          name="sideAName"
          placeholder="Nombre lado A"
          required
          className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        />
        <input
          name="sideBName"
          placeholder="Nombre lado B"
          required
          className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <fieldset className="rounded-lg border border-kelme-border p-3">
          <legend className="px-1 text-sm font-medium">
            Jugadores lado A
            {sideAIds.size > 0 && (
              <span className="ml-1 font-normal text-kelme-gray-400">({sideAIds.size} seleccionados)</span>
            )}
          </legend>
          {roster.length === 0 ? (
            <p className="text-sm text-kelme-gray-400">No hay jugadores en esta categoría.</p>
          ) : (
            <>
              <input
                type="search"
                value={sideASearch}
                onChange={(e) => setSideASearch(e.target.value)}
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
                          onChange={(ev) => toggleSide('A', p.id, ev.target.checked)}
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
        <fieldset className="rounded-lg border border-kelme-border p-3">
          <legend className="px-1 text-sm font-medium">
            Jugadores lado B
            {sideBIds.size > 0 && (
              <span className="ml-1 font-normal text-kelme-gray-400">({sideBIds.size} seleccionados)</span>
            )}
          </legend>
          {roster.length === 0 ? (
            <p className="text-sm text-kelme-gray-400">No hay jugadores en esta categoría.</p>
          ) : (
            <>
              <input
                type="search"
                value={sideBSearch}
                onChange={(e) => setSideBSearch(e.target.value)}
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
                          onChange={(ev) => toggleSide('B', p.id, ev.target.checked)}
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
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <select
          name="refereeId"
          className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        >
          <option value="">Árbitro</option>
          {referees.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input
          name="date"
          type="date"
          required
          className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        />
        <input
          name="time"
          type="time"
          required
          className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
        />
        <input
          name="venue"
          placeholder="Cancha"
          className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2"
        />
        <button
          type="submit"
          disabled={loading || roster.length === 0}
          className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50"
        >
          {loading ? 'Creando…' : 'Crear amistoso'}
        </button>
      </div>
      {error && <p className="text-sm text-kelme-red">{error}</p>}
    </form>
  )
}
