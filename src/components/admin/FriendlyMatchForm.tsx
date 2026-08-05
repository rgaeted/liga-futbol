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
  applyInitialSplitForUnassigned,
  initialSideSplit,
  mapToSideSets,
  rosterEntriesFromSets,
  setPlayerSide,
  toggleConvocation,
} from '@/lib/friendly-match-roster-ui'
import {
  FriendlyMatchConvocationPicker,
  type FriendlyRosterPlayer,
} from './FriendlyMatchConvocationPicker'
import { FriendlyMatchTeamAssigner } from './FriendlyMatchTeamAssigner'

type Referee = { id: string; name: string }
type FriendlyCategoryOption = { id: string; name: string; isActive: boolean }

type Props = {
  referees: Referee[]
  categories: FriendlyCategoryOption[]
  friendlyPlayers: FriendlyRosterPlayer[]
}

function validateRoster(
  sideAIds: Set<string>,
  sideBIds: Set<string>,
  sideACaptainId: string | null,
  sideBCaptainId: string | null,
  sideACoachId: string | null,
  sideBCoachId: string | null
): string | null {
  if (sideAIds.size < 1 || sideBIds.size < 1) {
    return 'Selecciona al menos un jugador por lado.'
  }
  if (!sideACaptainId || !sideBCaptainId) {
    return 'Debes elegir un capitán por equipo.'
  }
  if (!sideACoachId || !sideBCoachId) {
    return 'Debes elegir un DT por equipo.'
  }
  return null
}

export function FriendlyMatchForm({ referees, categories, friendlyPlayers }: Props) {
  const router = useRouter()
  const activeCategories = categories.filter((c) => c.isActive)
  const [step, setStep] = useState<1 | 2>(1)
  const [categoryId, setCategoryId] = useState(activeCategories[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [convokedIds, setConvokedIds] = useState<Set<string>>(new Set())
  const [convocationSearch, setConvocationSearch] = useState('')
  const [sideAIds, setSideAIds] = useState<Set<string>>(new Set())
  const [sideBIds, setSideBIds] = useState<Set<string>>(new Set())
  const [sideACaptainId, setSideACaptainId] = useState<string | null>(null)
  const [sideBCaptainId, setSideBCaptainId] = useState<string | null>(null)
  const [sideACoachId, setSideACoachId] = useState<string | null>(null)
  const [sideBCoachId, setSideBCoachId] = useState<string | null>(null)
  const [refereeEventTypes, setRefereeEventTypes] = useState<EventType[]>(
    DEFAULT_REFEREE_EVENT_TYPES
  )
  const [regionCode, setRegionCode] = useState('')
  const [communeCode, setCommuneCode] = useState('')
  const [sideAName, setSideAName] = useState('')
  const [sideBName, setSideBName] = useState('')
  const [footballFormat, setFootballFormat] = useState('FUTBOL_11')
  const [refereeId, setRefereeId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [venue, setVenue] = useState('')

  const roster = friendlyPlayers.filter((p) => p.categoryIds.includes(categoryId))
  const convoked = roster.filter((p) => convokedIds.has(p.id))

  function resetRosterState() {
    setConvokedIds(new Set())
    setConvocationSearch('')
    setSideAIds(new Set())
    setSideBIds(new Set())
    setSideACaptainId(null)
    setSideBCaptainId(null)
    setSideACoachId(null)
    setSideBCoachId(null)
    setStep(1)
  }

  function onCategoryChange(nextId: string) {
    setCategoryId(nextId)
    resetRosterState()
    setError('')
  }

  function handleToggleConvocation(playerId: string, checked: boolean) {
    setError('')
    const next = toggleConvocation({
      playerId,
      checked,
      convokedIds,
      sideAIds,
      sideBIds,
      sideACaptainId,
      sideBCaptainId,
      sideACoachId,
      sideBCoachId,
    })
    setConvokedIds(next.convokedIds)
    setSideAIds(next.sideAIds)
    setSideBIds(next.sideBIds)
    setSideACaptainId(next.sideACaptainId)
    setSideBCaptainId(next.sideBCaptainId)
    setSideACoachId(next.sideACoachId)
    setSideBCoachId(next.sideBCoachId)
  }

  function handleSideChange(playerId: string, side: 'A' | 'B') {
    setError('')
    const next = setPlayerSide({
      playerId,
      side,
      sideAIds,
      sideBIds,
      sideACaptainId,
      sideBCaptainId,
      sideACoachId,
      sideBCoachId,
    })
    setSideAIds(next.sideAIds)
    setSideBIds(next.sideBIds)
    setSideACaptainId(next.sideACaptainId)
    setSideBCaptainId(next.sideBCaptainId)
    setSideACoachId(next.sideACoachId)
    setSideBCoachId(next.sideBCoachId)
  }

  function goToStep2() {
    setError('')
    if (!categoryId) {
      setError('Selecciona una categoría.')
      return
    }
    if (convokedIds.size < 2) {
      setError('Selecciona al menos dos jugadores convocados.')
      return
    }
    if (!sideAName.trim() || !sideBName.trim()) {
      setError('Ingresa el nombre de ambos lados.')
      return
    }
    if (!date || !time) {
      setError('Ingresa fecha y hora del partido.')
      return
    }
    const split = mapToSideSets(initialSideSplit(convoked))
    setSideAIds(split.sideAIds)
    setSideBIds(split.sideBIds)
    setSideACaptainId(null)
    setSideBCaptainId(null)
    setSideACoachId(null)
    setSideBCoachId(null)
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setError('')

    const rosterError = validateRoster(
      sideAIds,
      sideBIds,
      sideACaptainId,
      sideBCaptainId,
      sideACoachId,
      sideBCoachId
    )
    if (rosterError) {
      setError(rosterError)
      return
    }

    if (!date || !time) {
      setError('Ingresa fecha y hora del partido.')
      return
    }

    let scheduledAt: string
    try {
      scheduledAt = scheduleInputToIso(date, time)
    } catch {
      setError('Fecha u hora inválida.')
      return
    }

    setLoading(true)

    const result = await submitJson('/api/matches', 'POST', {
      matchType: 'FRIENDLY',
      friendlyCategoryId: categoryId,
      footballFormat,
      sideAName,
      sideBName,
      refereeId: refereeId || undefined,
      refereeEventTypes,
      venue: venue || undefined,
      regionCode: regionCode || undefined,
      communeCode: communeCode || undefined,
      scheduledAt,
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
    resetRosterState()
    setSideAName('')
    setSideBName('')
    setFootballFormat('FUTBOL_11')
    setRefereeId('')
    setDate('')
    setTime('')
    setVenue('')
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
      onSubmit={step === 2 ? handleSubmit : (e) => e.preventDefault()}
      className="grid gap-3 rounded-xl border border-kelme-border bg-kelme-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Crear partido amistoso</h2>
        <p className="text-sm text-kelme-gray-500">
          <span className={step === 1 ? 'font-semibold text-kelme-gray-900' : ''}>
            1. Convocatoria
          </span>
          <span className="mx-2">→</span>
          <span className={step === 2 ? 'font-semibold text-kelme-gray-900' : ''}>
            2. Equipos
          </span>
        </p>
      </div>

      {step === 1 ? (
        <>
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
            value={footballFormat}
            onChange={(e) => setFootballFormat(e.target.value)}
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
              value={sideAName}
              onChange={(e) => setSideAName(e.target.value)}
              required
              className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
            />
            <input
              name="sideBName"
              placeholder="Nombre lado B"
              value={sideBName}
              onChange={(e) => setSideBName(e.target.value)}
              required
              className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
            />
          </div>
          <FriendlyMatchConvocationPicker
            roster={roster}
            convokedIds={convokedIds}
            search={convocationSearch}
            onSearchChange={setConvocationSearch}
            onToggle={handleToggleConvocation}
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
              value={refereeId}
              onChange={(e) => setRefereeId(e.target.value)}
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
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
            />
            <input
              name="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
            />
            <input
              name="venue"
              placeholder="Cancha"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2"
            />
            <button
              type="button"
              disabled={roster.length === 0}
              onClick={() => goToStep2()}
              className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50"
            >
              Siguiente: equipos
            </button>
          </div>
        </>
      ) : (
        <>
          <FriendlyMatchTeamAssigner
            convoked={convoked}
            sideAName={sideAName || 'A'}
            sideBName={sideBName || 'B'}
            sideAIds={sideAIds}
            sideBIds={sideBIds}
            sideACaptainId={sideACaptainId}
            sideBCaptainId={sideBCaptainId}
            sideACoachId={sideACoachId}
            sideBCoachId={sideBCoachId}
            onSideChange={handleSideChange}
            onSideACaptainChange={setSideACaptainId}
            onSideBCaptainChange={setSideBCaptainId}
            onSideACoachChange={setSideACoachId}
            onSideBCoachChange={setSideBCoachId}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-kelme-border px-4 py-2 font-semibold hover:bg-white"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-kelme-red px-4 py-2 font-semibold hover:bg-kelme-red-dark disabled:opacity-50"
            >
              {loading ? 'Creando…' : 'Crear amistoso'}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-sm text-kelme-red">{error}</p>}
    </form>
  )
}
