'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { EventType, FootballFormat, MatchType } from '@prisma/client'
import { FOOTBALL_FORMATS, footballFormatLabel } from '@/lib/football-format'
import { resolveRefereeEventTypes } from '@/lib/match-referee-events'
import { MATCH_STATUSES, matchStatusLabel } from '@/lib/match-status-ui'
import { matchSideCrestUrl } from '@/lib/match-side-crest'
import { scheduleInputToIso } from '@/lib/schedule-datetime'
import { submitJson } from './submit'
import { DeleteButton } from './DeleteButton'
import { CrestUploadField } from './CrestUploadField'
import { TeamColorPicker } from './TeamColorPicker'
import {
  convokedIdsFromPlayerSides,
  rosterEntriesFromSets,
  setsFromPlayerSides,
  setPlayerSide,
  toggleConvocation,
  addTeamToSide,
} from '@/lib/friendly-match-roster-ui'
import {
  FriendlyMatchConvocationPicker,
  type FriendlyRosterPlayer,
} from './FriendlyMatchConvocationPicker'
import { FriendlyMatchTeamAssigner } from './FriendlyMatchTeamAssigner'
import { FriendlyTeamBulkAdd } from './FriendlyTeamBulkAdd'
import { MatchRefereeEventsPicker } from './MatchRefereeEventsPicker'
import { ChileLocationPicker } from './ChileLocationPicker'
import { MatchWeatherPanel } from './MatchWeatherPanel'
import { resolveTeamColor } from '@/lib/team-color'

export type MatchRow = {
  id: string
  label: string
  matchType: MatchType
  sideAName: string | null
  sideBName: string | null
  sideAColor: string | null
  sideBColor: string | null
  friendlyCategoryId: string | null
  playerSides: Array<{ playerId: string; side: 'A' | 'B'; isCaptain?: boolean; isCoach?: boolean }>
  hasCrestA: boolean
  hasCrestB: boolean
  refereeId: string | null
  venue: string | null
  regionCode: string | null
  regionName: string | null
  communeCode: string | null
  communeName: string | null
  communeLat: number | null
  weatherTempC: number | null
  weatherHumidityPct: number | null
  weatherWindKmh: number | null
  weatherLabel: string | null
  weatherFetchedAt: string | null
  status: string
  footballFormat: FootballFormat
  refereeEventTypes: EventType[]
  date: string
  time: string
}

type RefereeOption = { id: string; name: string }

export function MatchActions({
  match,
  referees,
  friendlyPlayers = [],
  teams = [],
  editing: controlledEditing,
  onEditingChange,
  hideIdleToolbar = false,
}: {
  match: MatchRow
  referees: RefereeOption[]
  friendlyPlayers?: FriendlyRosterPlayer[]
  teams?: Array<{ id: string; name: string }>
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
  hideIdleToolbar?: boolean
}) {
  const router = useRouter()
  const [internalEditing, setInternalEditing] = useState(false)
  const editing = controlledEditing ?? internalEditing
  const setEditing = onEditingChange ?? setInternalEditing
  const [refereeId, setRefereeId] = useState(match.refereeId ?? '')
  const [venue, setVenue] = useState(match.venue ?? '')
  const [regionCode, setRegionCode] = useState(match.regionCode ?? '')
  const [communeCode, setCommuneCode] = useState(match.communeCode ?? '')
  const [status, setStatus] = useState(match.status)
  const [footballFormat, setFootballFormat] = useState(match.footballFormat)
  const [date, setDate] = useState(match.date)
  const [time, setTime] = useState(match.time)
  const [sideAColor, setSideAColor] = useState(match.sideAColor)
  const [sideBColor, setSideBColor] = useState(match.sideBColor)
  const initialRoster = useMemo(() => setsFromPlayerSides(match.playerSides), [match.playerSides])
  const [convokedIds, setConvokedIds] = useState(() =>
    convokedIdsFromPlayerSides(match.playerSides)
  )
  const [convocationSearch, setConvocationSearch] = useState('')
  const [sideAIds, setSideAIds] = useState(initialRoster.sideAIds)
  const [sideBIds, setSideBIds] = useState(initialRoster.sideBIds)
  const [sideACaptainId, setSideACaptainId] = useState<string | null>(initialRoster.sideACaptainId)
  const [sideBCaptainId, setSideBCaptainId] = useState<string | null>(initialRoster.sideBCaptainId)
  const [sideACoachId, setSideACoachId] = useState<string | null>(initialRoster.sideACoachId)
  const [sideBCoachId, setSideBCoachId] = useState<string | null>(initialRoster.sideBCoachId)
  const [refereeEventTypes, setRefereeEventTypes] = useState<EventType[]>(
    resolveRefereeEventTypes(match.refereeEventTypes)
  )
  const [extraPlayers, setExtraPlayers] = useState<FriendlyRosterPlayer[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const roster = useMemo(() => {
    const byId = new Map(friendlyPlayers.map((p) => [p.id, p]))
    for (const extra of extraPlayers) {
      byId.set(extra.id, extra)
    }
    return [...byId.values()]
  }, [extraPlayers, friendlyPlayers])

  const convoked = roster.filter((p) => convokedIds.has(p.id))

  function handlePlayerCreated(player: FriendlyRosterPlayer) {
    setExtraPlayers((current) => {
      if (current.some((p) => p.id === player.id)) return current
      return [...current, player]
    })
    setConvokedIds((current) => new Set([...current, player.id]))
  }

  function openEdit() {
    const next = setsFromPlayerSides(match.playerSides)
    setConvokedIds(convokedIdsFromPlayerSides(match.playerSides))
    setConvocationSearch('')
    setSideAIds(next.sideAIds)
    setSideBIds(next.sideBIds)
    setSideACaptainId(next.sideACaptainId)
    setSideBCaptainId(next.sideBCaptainId)
    setSideACoachId(next.sideACoachId)
    setSideBCoachId(next.sideBCoachId)
    setRefereeEventTypes(resolveRefereeEventTypes(match.refereeEventTypes))
    setRegionCode(match.regionCode ?? '')
    setCommuneCode(match.communeCode ?? '')
    setEditing(true)
  }

  function handleToggleConvocation(playerId: string, checked: boolean) {
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
    if (checked && !next.sideAIds.has(playerId) && !next.sideBIds.has(playerId)) {
      next.sideAIds.add(playerId)
    }
    setConvokedIds(next.convokedIds)
    setSideAIds(next.sideAIds)
    setSideBIds(next.sideBIds)
    setSideACaptainId(next.sideACaptainId)
    setSideBCaptainId(next.sideBCaptainId)
    setSideACoachId(next.sideACoachId)
    setSideBCoachId(next.sideBCoachId)
  }

  function handleSideChange(playerId: string, side: 'A' | 'B') {
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

  function handleAddTeamToSide(side: 'A' | 'B', playerIds: string[]) {
    const next = addTeamToSide({
      teamPlayerIds: playerIds,
      side,
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

  async function save() {
    setSaving(true)
    setError('')

    const payload: Record<string, unknown> = {
      refereeId: refereeId || null,
      venue: venue || null,
      regionCode: regionCode || null,
      communeCode: communeCode || null,
      status,
      footballFormat,
      refereeEventTypes,
      scheduledAt: scheduleInputToIso(date, time),
    }

    if (match.matchType === 'FRIENDLY') {
      payload.sideAColor = sideAColor
      payload.sideBColor = sideBColor
      if (convokedIds.size < 2) {
        setSaving(false)
        setError('Selecciona al menos dos jugadores convocados.')
        return
      }
      if (sideAIds.size < 1 || sideBIds.size < 1) {
        setSaving(false)
        setError('Selecciona al menos un jugador por lado.')
        return
      }
      if (!sideACaptainId || !sideBCaptainId) {
        setSaving(false)
        setError('Debes elegir un capitán por equipo.')
        return
      }
      if (!sideACoachId || !sideBCoachId) {
        setSaving(false)
        setError('Debes elegir un DT por equipo.')
        return
      }
      payload.players = rosterEntriesFromSets(
        sideAIds,
        sideBIds,
        sideACaptainId,
        sideBCaptainId,
        sideACoachId,
        sideBCoachId
      )
    }

    const result = await submitJson(`/api/matches/${match.id}`, 'PUT', payload)
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setEditing(false)
    router.refresh()
  }

  if (!editing) {
    if (hideIdleToolbar) return null

    return (
      <span className="inline-flex w-full flex-col gap-2">
        <MatchWeatherPanel
          matchId={match.id}
          regionName={match.regionName}
          communeName={match.communeName}
          venue={match.venue}
          weatherTempC={match.weatherTempC}
          weatherHumidityPct={match.weatherHumidityPct}
          weatherWindKmh={match.weatherWindKmh}
          weatherLabel={match.weatherLabel}
          weatherFetchedAt={match.weatherFetchedAt}
          regionCode={match.regionCode ?? undefined}
          communeCode={match.communeCode ?? undefined}
          hasCoordinates={
            match.communeLat !== null || Boolean(match.regionCode && match.communeCode)
          }
          compact
        />
        <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={openEdit}
          className="rounded-lg border border-kelme-border px-2 py-1 text-xs hover:border-kelme-red"
        >
          Editar
        </button>
        <DeleteButton
          url={`/api/matches/${match.id}`}
          confirmMessage={`¿Eliminar el partido ${match.label}? Se borran sus eventos y citaciones.`}
        />
        </span>
      </span>
    )
  }

  return (
    <div className="border-t border-kelme-border px-5 py-4">
      <div className="grid w-full gap-2 rounded-lg border border-kelme-border bg-kelme-gray-100 p-3 md:grid-cols-3">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg border border-kelme-border bg-kelme-surface px-2 py-1 text-sm"
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="rounded-lg border border-kelme-border bg-kelme-surface px-2 py-1 text-sm"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded-lg border border-kelme-border bg-kelme-surface px-2 py-1 text-sm"
      >
        {MATCH_STATUSES.map((s) => (
          <option key={s} value={s}>
            {matchStatusLabel(s)}
          </option>
        ))}
      </select>
      <select
        value={footballFormat}
        onChange={(e) => setFootballFormat(e.target.value as FootballFormat)}
        className="rounded-lg border border-kelme-border bg-kelme-surface px-2 py-1 text-sm"
      >
        {FOOTBALL_FORMATS.map((format) => (
          <option key={format} value={format}>
            {footballFormatLabel(format)}
          </option>
        ))}
      </select>
      <select
        value={refereeId}
        onChange={(e) => setRefereeId(e.target.value)}
        className="rounded-lg border border-kelme-border bg-kelme-surface px-2 py-1 text-sm"
      >
        <option value="">Sin árbitro</option>
        {referees.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <input
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
        placeholder="Cancha"
        className="rounded-lg border border-kelme-border bg-kelme-surface px-2 py-1 text-sm"
      />
      <ChileLocationPicker
        regionCode={regionCode}
        communeCode={communeCode}
        onRegionChange={setRegionCode}
        onCommuneChange={setCommuneCode}
      />
      <MatchWeatherPanel
        matchId={match.id}
        regionName={match.regionName}
        communeName={match.communeName}
        venue={venue}
        weatherTempC={match.weatherTempC}
        weatherHumidityPct={match.weatherHumidityPct}
        weatherWindKmh={match.weatherWindKmh}
        weatherLabel={match.weatherLabel}
        weatherFetchedAt={match.weatherFetchedAt}
        regionCode={regionCode || undefined}
        communeCode={communeCode || undefined}
        scheduledAt={scheduleInputToIso(date, time)}
        hasCoordinates={Boolean(regionCode && communeCode) || match.communeLat !== null}
      />
      {match.matchType === 'FRIENDLY' && (
        <>
          <div className="md:col-span-3 space-y-4">
            <FriendlyTeamBulkAdd
              teams={teams}
              roster={roster}
              onAddToSide={handleAddTeamToSide}
            />
            <FriendlyMatchConvocationPicker
              roster={roster}
              convokedIds={convokedIds}
              search={convocationSearch}
              onSearchChange={setConvocationSearch}
              onToggle={handleToggleConvocation}
              categoryId={match.friendlyCategoryId}
              onPlayerCreated={handlePlayerCreated}
            />
            <FriendlyMatchTeamAssigner
              convoked={convoked}
              sideAName={match.sideAName ?? 'A'}
              sideBName={match.sideBName ?? 'B'}
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
          </div>
          <div className="md:col-span-3">
            <TeamColorPicker
              name={match.sideAName ?? 'Lado A'}
              value={sideAColor}
              onChange={setSideAColor}
              hasCrest={match.hasCrestA}
              crestSrc={matchSideCrestUrl(match.id, 'A')}
            />
          </div>
          <CrestUploadField
            label={`Imagen escudo lado A (${match.sideAName ?? 'A'})`}
            name={match.sideAName ?? 'Lado A'}
            color={resolveTeamColor(sideAColor, match.sideAName ?? 'A')}
            uploadUrl={`/api/matches/${match.id}/crest/A`}
            previewUrl={matchSideCrestUrl(match.id, 'A')}
            hasCrest={match.hasCrestA}
            onUpdated={() => router.refresh()}
          />
          <div className="md:col-span-3">
            <TeamColorPicker
              name={match.sideBName ?? 'Lado B'}
              value={sideBColor}
              onChange={setSideBColor}
              hasCrest={match.hasCrestB}
              crestSrc={matchSideCrestUrl(match.id, 'B')}
            />
          </div>
          <CrestUploadField
            label={`Imagen escudo lado B (${match.sideBName ?? 'B'})`}
            name={match.sideBName ?? 'Lado B'}
            color={resolveTeamColor(sideBColor, match.sideBName ?? 'B')}
            uploadUrl={`/api/matches/${match.id}/crest/B`}
            previewUrl={matchSideCrestUrl(match.id, 'B')}
            hasCrest={match.hasCrestB}
            onUpdated={() => router.refresh()}
          />
        </>
      )}
      <MatchRefereeEventsPicker value={refereeEventTypes} onChange={setRefereeEventTypes} />
      <span className="inline-flex items-center gap-2 md:col-span-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-kelme-red px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-kelme-border px-3 py-1 text-xs"
        >
          Cancelar
        </button>
      </span>
      {error && <p className="text-xs text-kelme-red md:col-span-3">{error}</p>}
      </div>
    </div>
  )
}
