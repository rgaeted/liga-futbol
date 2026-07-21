'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitJson } from './submit'
import { FOOTBALL_FORMATS, FOOTBALL_FORMAT_LABELS } from '@/lib/football-format'
import { scheduleInputToIso } from '@/lib/schedule-datetime'
import {
  FriendlyMatchRosterEditor,
  rosterEntriesFromSets,
  toggleFriendlyRosterSide,
  type FriendlyRosterPlayer,
} from './FriendlyMatchRosterEditor'

type Referee = { id: string; name: string }
type FriendlyCategoryOption = { id: string; name: string; isActive: boolean }

type Props = {
  referees: Referee[]
  categories: FriendlyCategoryOption[]
  friendlyPlayers: FriendlyRosterPlayer[]
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

  const roster = friendlyPlayers.filter((p) => p.categoryIds.includes(categoryId))

  function onCategoryChange(nextId: string) {
    setCategoryId(nextId)
    setSideAIds(new Set())
    setSideBIds(new Set())
    setSideASearch('')
    setSideBSearch('')
    setError('')
  }

  function handleToggleSide(side: 'A' | 'B', playerId: string, checked: boolean) {
    setError('')
    const next = toggleFriendlyRosterSide(side, playerId, checked, sideAIds, sideBIds)
    setSideAIds(next.sideAIds)
    setSideBIds(next.sideBIds)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setError('')

    if (!categoryId) {
      setError('Selecciona una categoría.')
      return
    }
    if (sideAIds.size < 1 || sideBIds.size < 1) {
      setError('Selecciona al menos un jugador por lado.')
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
      scheduledAt: scheduleInputToIso(date, time),
      players: rosterEntriesFromSets(sideAIds, sideBIds),
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
      <FriendlyMatchRosterEditor
        roster={roster}
        sideAIds={sideAIds}
        sideBIds={sideBIds}
        sideASearch={sideASearch}
        sideBSearch={sideBSearch}
        onSideASearchChange={setSideASearch}
        onSideBSearchChange={setSideBSearch}
        onToggleSide={handleToggleSide}
      />
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
