'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { EventType } from '@prisma/client'
import { submitJson } from './submit'
import { MatchRefereeEventsPicker } from './MatchRefereeEventsPicker'
import { ChileLocationPicker } from './ChileLocationPicker'
import { DEFAULT_REFEREE_EVENT_TYPES } from '@/lib/match-referee-events'
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
  const [sideACaptainId, setSideACaptainId] = useState<string | null>(null)
  const [sideBCaptainId, setSideBCaptainId] = useState<string | null>(null)
  const [sideACoachId, setSideACoachId] = useState<string | null>(null)
  const [sideBCoachId, setSideBCoachId] = useState<string | null>(null)
  const [sideASearch, setSideASearch] = useState('')
  const [sideBSearch, setSideBSearch] = useState('')
  const [refereeEventTypes, setRefereeEventTypes] = useState<EventType[]>(
    DEFAULT_REFEREE_EVENT_TYPES
  )
  const [regionCode, setRegionCode] = useState('')
  const [communeCode, setCommuneCode] = useState('')

  const roster = friendlyPlayers.filter((p) => p.categoryIds.includes(categoryId))

  function onCategoryChange(nextId: string) {
    setCategoryId(nextId)
    setSideAIds(new Set())
    setSideBIds(new Set())
    setSideACaptainId(null)
    setSideBCaptainId(null)
    setSideACoachId(null)
    setSideBCoachId(null)
    setSideASearch('')
    setSideBSearch('')
    setError('')
  }

  function handleToggleSide(side: 'A' | 'B', playerId: string, checked: boolean) {
    setError('')
    const next = toggleFriendlyRosterSide(side, playerId, checked, sideAIds, sideBIds)
    setSideAIds(next.sideAIds)
    setSideBIds(next.sideBIds)
    if (side === 'A') {
      if (!checked && sideACaptainId === playerId) setSideACaptainId(null)
      if (!checked && sideACoachId === playerId) setSideACoachId(null)
    } else {
      if (!checked && sideBCaptainId === playerId) setSideBCaptainId(null)
      if (!checked && sideBCoachId === playerId) setSideBCoachId(null)
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
    if (sideAIds.size < 1 || sideBIds.size < 1) {
      setError('Selecciona al menos un jugador por lado.')
      return
    }
    if (!sideACaptainId || !sideBCaptainId) {
      setError('Debes elegir un capitán por equipo.')
      return
    }
    if (!sideACoachId || !sideBCoachId) {
      setError('Debes elegir un DT por equipo.')
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
      refereeEventTypes,
      venue: String(form.get('venue') ?? '').trim() || undefined,
      regionCode: regionCode || undefined,
      communeCode: communeCode || undefined,
      scheduledAt: scheduleInputToIso(date, time),
      players: rosterEntriesFromSets(
        sideAIds,
        sideBIds,
        sideACaptainId,
        sideBCaptainId,
        sideACoachId,
        sideBCoachId
      ),
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    formEl.reset()
    setSideAIds(new Set())
    setSideBIds(new Set())
    setSideACaptainId(null)
    setSideBCaptainId(null)
    setSideACoachId(null)
    setSideBCoachId(null)
    setRefereeEventTypes(DEFAULT_REFEREE_EVENT_TYPES)
    setRegionCode('')
    setCommuneCode('')
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
        sideACaptainId={sideACaptainId}
        sideBCaptainId={sideBCaptainId}
        sideACoachId={sideACoachId}
        sideBCoachId={sideBCoachId}
        onSideASearchChange={setSideASearch}
        onSideBSearchChange={setSideBSearch}
        onSideACaptainChange={setSideACaptainId}
        onSideBCaptainChange={setSideBCaptainId}
        onSideACoachChange={setSideACoachId}
        onSideBCoachChange={setSideBCoachId}
        onToggleSide={handleToggleSide}
      />
      <MatchRefereeEventsPicker value={refereeEventTypes} onChange={setRefereeEventTypes} />
      <ChileLocationPicker
        regionCode={regionCode}
        communeCode={communeCode}
        onRegionChange={setRegionCode}
        onCommuneChange={setCommuneCode}
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
