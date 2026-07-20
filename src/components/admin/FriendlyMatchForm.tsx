'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'

type Referee = { id: string; name: string }
type FriendlyPlayer = { id: string; firstName: string; lastName: string }

type Props = {
  referees: Referee[]
  friendlyPlayers: FriendlyPlayer[]
}

function playerLabel(p: FriendlyPlayer) {
  return `${p.firstName} ${p.lastName}`.trim()
}

export function FriendlyMatchForm({ referees, friendlyPlayers }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sideAIds, setSideAIds] = useState<Set<string>>(new Set())
  const [sideBIds, setSideBIds] = useState<Set<string>>(new Set())

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

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4"
    >
      <h2 className="font-display text-lg font-semibold">Crear partido amistoso</h2>
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
          <legend className="px-1 text-sm font-medium">Jugadores lado A</legend>
          {friendlyPlayers.length === 0 ? (
            <p className="text-sm text-kelme-gray-400">No hay jugadores en el pool.</p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {friendlyPlayers.map((p) => (
                <li key={`a-${p.id}`}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sideAIds.has(p.id)}
                      disabled={sideBIds.has(p.id)}
                      onChange={(ev) => toggleSide('A', p.id, ev.target.checked)}
                    />
                    {playerLabel(p)}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
        <fieldset className="rounded-lg border border-kelme-border p-3">
          <legend className="px-1 text-sm font-medium">Jugadores lado B</legend>
          {friendlyPlayers.length === 0 ? (
            <p className="text-sm text-kelme-gray-400">No hay jugadores en el pool.</p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {friendlyPlayers.map((p) => (
                <li key={`b-${p.id}`}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sideBIds.has(p.id)}
                      disabled={sideAIds.has(p.id)}
                      onChange={(ev) => toggleSide('B', p.id, ev.target.checked)}
                    />
                    {playerLabel(p)}
                  </label>
                </li>
              ))}
            </ul>
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
          disabled={loading || friendlyPlayers.length === 0}
          className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50"
        >
          {loading ? 'Creando…' : 'Crear amistoso'}
        </button>
      </div>
      {error && <p className="text-sm text-kelme-red">{error}</p>}
    </form>
  )
}