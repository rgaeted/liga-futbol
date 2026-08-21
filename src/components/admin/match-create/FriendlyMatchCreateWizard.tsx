'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { EventType, FootballFormat } from '@prisma/client'
import { MatchCreateWizardShell } from '@/components/admin/match-create/MatchCreateWizardShell'
import { MatchCreateSummary } from '@/components/admin/match-create/MatchCreateSummary'
import { WizardStep } from '@/components/admin/match-create/WizardStep'
import { RefereeEventPresetSelect, syncPresetFromEventTypes } from '@/components/admin/match-create/RefereeEventPresetSelect'
import { useMatchCreateDraft } from '@/components/admin/match-create/useMatchCreateDraft'
import { useChileLocationLabels } from '@/components/admin/match-create/useChileLocationLabels'
import { ChileLocationPicker } from '@/components/admin/ChileLocationPicker'
import { MatchRefereeEventsPicker } from '@/components/admin/MatchRefereeEventsPicker'
import {
  FriendlyMatchConvocationPicker,
  type FriendlyRosterPlayer,
} from '@/components/admin/FriendlyMatchConvocationPicker'
import { FriendlyMatchTeamAssigner } from '@/components/admin/FriendlyMatchTeamAssigner'
import { FriendlyTeamBulkAdd } from '@/components/admin/FriendlyTeamBulkAdd'
import { submitJson } from '@/components/admin/submit'
import { useOrgPath } from '@/hooks/useOrgPath'
import {
  FOOTBALL_FORMATS,
  FOOTBALL_FORMAT_LABELS,
  footballFormatLabel,
} from '@/lib/football-format'
import {
  initialSideSplit,
  mapToSideSets,
  rosterEntriesFromSets,
  setPlayerSide,
  toggleConvocation,
  addTeamToSide,
} from '@/lib/friendly-match-roster-ui'
import {
  refereeEventTypesForPreset,
  type RefereeEventPreset,
} from '@/lib/match-referee-event-presets'
import { scheduleInputToIso } from '@/lib/schedule-datetime'
import { APP_LOCALE, APP_TIMEZONE } from '@/lib/locale'

const DRAFT_KEY = 'match-create-draft:friendly'

type Referee = { id: string; name: string }
type FriendlyCategoryOption = { id: string; name: string; isActive: boolean }
type OrganizationDirectoryItem = { id: string; slug: string; name: string; logoUrl: string | null }
type FriendlyMode = 'intra' | 'challenge'

type FriendlyDraft = {
  openStep: number
  rosterPhase: 'convocation' | 'teams'
  friendlyMode: FriendlyMode
  guestOrganizationSlug: string
  categoryId: string
  sideAName: string
  sideBName: string
  refereeId: string
  date: string
  time: string
  venue: string
  regionCode: string
  communeCode: string
  footballFormat: string
  refereeEventTypes: EventType[]
  eventPreset: RefereeEventPreset
  convokedIds: string[]
  convocationSearch: string
  sideAIds: string[]
  sideBIds: string[]
  sideACaptainId: string | null
  sideBCaptainId: string | null
  sideACoachId: string | null
  sideBCoachId: string | null
}

type Props = {
  referees: Referee[]
  categories: FriendlyCategoryOption[]
  friendlyPlayers: FriendlyRosterPlayer[]
  teams: Array<{ id: string; name: string }>
}

function createInitialDraft(categories: FriendlyCategoryOption[]): FriendlyDraft {
  const firstActive = categories.find((category) => category.isActive)
  return {
    openStep: 1,
    rosterPhase: 'convocation',
    friendlyMode: 'intra',
    guestOrganizationSlug: '',
    categoryId: firstActive?.id ?? '',
    sideAName: '',
    sideBName: '',
    refereeId: '',
    date: '',
    time: '',
    venue: '',
    regionCode: '',
    communeCode: '',
    footballFormat: 'FUTBOL_11',
    refereeEventTypes: refereeEventTypesForPreset('completo'),
    eventPreset: 'completo',
    convokedIds: [],
    convocationSearch: '',
    sideAIds: [],
    sideBIds: [],
    sideACaptainId: null,
    sideBCaptainId: null,
    sideACoachId: null,
    sideBCoachId: null,
  }
}

function formatScheduleLabel(date: string, time: string): string {
  if (!date || !time) return ''
  try {
    const iso = scheduleInputToIso(date, time)
    return new Intl.DateTimeFormat(APP_LOCALE, {
      timeZone: APP_TIMEZONE,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(iso))
  } catch {
    return `${date} ${time}`
  }
}

function validateRoster(draft: FriendlyDraft): string | null {
  const sideAIds = new Set(draft.sideAIds)
  const sideBIds = new Set(draft.sideBIds)
  if (draft.friendlyMode === 'challenge') {
    if (sideAIds.size < 1) {
      return 'Selecciona al menos un jugador para tu lado.'
    }
    if (!draft.sideACaptainId || !draft.sideACoachId) {
      return 'Debes elegir un capitán y un DT para tu lado.'
    }
    return null
  }
  if (sideAIds.size < 1 || sideBIds.size < 1) {
    return 'Selecciona al menos un jugador por lado.'
  }
  if (!draft.sideACaptainId || !draft.sideBCaptainId) {
    return 'Debes elegir un capitán por equipo.'
  }
  if (!draft.sideACoachId || !draft.sideBCoachId) {
    return 'Debes elegir un DT por equipo.'
  }
  return null
}

export function FriendlyMatchCreateWizard({ referees, categories, friendlyPlayers, teams }: Props) {
  const orgPath = useOrgPath()
  const router = useRouter()
  const activeCategories = categories.filter((category) => category.isActive)
  const initialDraft = useMemo(
    () => createInitialDraft(activeCategories),
    [activeCategories]
  )
  const { data, setData, savedAtLabel, hydrated, clearDraft } = useMatchCreateDraft(
    DRAFT_KEY,
    initialDraft
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [extraPlayers, setExtraPlayers] = useState<FriendlyRosterPlayer[]>([])
  const [organizationDirectory, setOrganizationDirectory] = useState<OrganizationDirectoryItem[]>(
    []
  )
  const [directoryLoading, setDirectoryLoading] = useState(false)

  useEffect(() => {
    if (data.friendlyMode !== 'challenge') return
    let cancelled = false
    setDirectoryLoading(true)
    void fetch('/api/admin/organizations-directory')
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudo cargar el directorio')
        return response.json() as Promise<OrganizationDirectoryItem[]>
      })
      .then((items) => {
        if (!cancelled) setOrganizationDirectory(items)
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar las organizaciones disponibles.')
      })
      .finally(() => {
        if (!cancelled) setDirectoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [data.friendlyMode])

  const { regionName, communeName } = useChileLocationLabels(data.regionCode, data.communeCode)

  const convokedIds = useMemo(() => new Set(data.convokedIds), [data.convokedIds])
  const sideAIds = useMemo(() => new Set(data.sideAIds), [data.sideAIds])
  const sideBIds = useMemo(() => new Set(data.sideBIds), [data.sideBIds])

  const roster = useMemo(() => {
    const base = friendlyPlayers.filter((player) =>
      player.categoryIds.includes(data.categoryId)
    )
    const byId = new Map(base.map((player) => [player.id, player]))
    for (const extra of extraPlayers) {
      if (extra.categoryIds.includes(data.categoryId)) {
        byId.set(extra.id, extra)
      }
    }
    return [...byId.values()]
  }, [data.categoryId, extraPlayers, friendlyPlayers])

  const convoked = roster.filter((player) => convokedIds.has(player.id))
  const category = activeCategories.find((item) => item.id === data.categoryId)
  const referee = referees.find((item) => item.id === data.refereeId)
  const selectedGuestOrg = organizationDirectory.find(
    (item) => item.slug === data.guestOrganizationSlug
  )

  function patch(partial: Partial<FriendlyDraft>) {
    setData((current) => {
      const next = { ...current, ...partial }
      if (partial.friendlyMode === 'intra') {
        next.guestOrganizationSlug = ''
      }
      if (partial.friendlyMode === 'challenge') {
        next.sideBIds = []
        next.sideBCaptainId = null
        next.sideBCoachId = null
      }
      const guestSlug = partial.guestOrganizationSlug ?? next.guestOrganizationSlug
      if (guestSlug) {
        const guest = organizationDirectory.find((item) => item.slug === guestSlug)
        if (guest) next.sideBName = guest.name
      }
      return next
    })
  }

  function setOpenStep(step: number) {
    patch({ openStep: step })
  }

  function resetRosterState() {
    setExtraPlayers([])
    patch({
      convokedIds: [],
      convocationSearch: '',
      sideAIds: [],
      sideBIds: [],
      sideACaptainId: null,
      sideBCaptainId: null,
      sideACoachId: null,
      sideBCoachId: null,
      rosterPhase: 'convocation',
    })
  }

  function onCategoryChange(categoryId: string) {
    patch({ categoryId })
    resetRosterState()
    setError('')
  }

  function handlePlayerCreated(player: FriendlyRosterPlayer) {
    setExtraPlayers((current) => {
      if (current.some((p) => p.id === player.id)) return current
      return [...current, player]
    })
    setData((current) => ({
      ...current,
      convokedIds: [...new Set([...current.convokedIds, player.id])],
    }))
  }

  function handleToggleConvocation(playerId: string, checked: boolean) {
    setError('')
    const next = toggleConvocation({
      playerId,
      checked,
      convokedIds,
      sideAIds,
      sideBIds,
      sideACaptainId: data.sideACaptainId,
      sideBCaptainId: data.sideBCaptainId,
      sideACoachId: data.sideACoachId,
      sideBCoachId: data.sideBCoachId,
    })
    patch({
      convokedIds: [...next.convokedIds],
      sideAIds: [...next.sideAIds],
      sideBIds: [...next.sideBIds],
      sideACaptainId: next.sideACaptainId,
      sideBCaptainId: next.sideBCaptainId,
      sideACoachId: next.sideACoachId,
      sideBCoachId: next.sideBCoachId,
    })
  }

  function handleSideChange(playerId: string, side: 'A' | 'B') {
    setError('')
    const next = setPlayerSide({
      playerId,
      side,
      sideAIds,
      sideBIds,
      sideACaptainId: data.sideACaptainId,
      sideBCaptainId: data.sideBCaptainId,
      sideACoachId: data.sideACoachId,
      sideBCoachId: data.sideBCoachId,
    })
    patch({
      sideAIds: [...next.sideAIds],
      sideBIds: [...next.sideBIds],
      sideACaptainId: next.sideACaptainId,
      sideBCaptainId: next.sideBCaptainId,
      sideACoachId: next.sideACoachId,
      sideBCoachId: next.sideBCoachId,
    })
  }

  function handleAddTeamToSide(side: 'A' | 'B', playerIds: string[]) {
    setError('')
    const next = addTeamToSide({
      teamPlayerIds: playerIds,
      side,
      convokedIds,
      sideAIds,
      sideBIds,
      sideACaptainId: data.sideACaptainId,
      sideBCaptainId: data.sideBCaptainId,
      sideACoachId: data.sideACoachId,
      sideBCoachId: data.sideBCoachId,
    })
    patch({
      convokedIds: [...next.convokedIds],
      sideAIds: [...next.sideAIds],
      sideBIds: [...next.sideBIds],
      sideACaptainId: next.sideACaptainId,
      sideBCaptainId: next.sideBCaptainId,
      sideACoachId: next.sideACoachId,
      sideBCoachId: next.sideBCoachId,
    })
  }

  function goToTeamsPhase() {
    setError('')
    const minimumConvoked = data.friendlyMode === 'challenge' ? 1 : 2
    if (convokedIds.size < minimumConvoked) {
      setError(
        data.friendlyMode === 'challenge'
          ? 'Selecciona al menos un jugador convocado.'
          : 'Selecciona al menos dos jugadores convocados.'
      )
      return
    }
    const split = mapToSideSets(initialSideSplit(convoked))
    if (data.friendlyMode === 'challenge') {
      patch({
        rosterPhase: 'teams',
        sideAIds: [...convokedIds],
        sideBIds: [],
        sideACaptainId: null,
        sideBCaptainId: null,
        sideACoachId: null,
        sideBCoachId: null,
      })
      return
    }
    patch({
      rosterPhase: 'teams',
      sideAIds: [...split.sideAIds],
      sideBIds: [...split.sideBIds],
      sideACaptainId: null,
      sideBCaptainId: null,
      sideACoachId: null,
      sideBCoachId: null,
    })
  }

  async function handleSubmit() {
    setError('')

    if (!data.categoryId) {
      setError('Selecciona una categoría.')
      setOpenStep(1)
      return
    }
    if (data.friendlyMode === 'challenge' && !data.guestOrganizationSlug) {
      setError('Selecciona la organización que quieres desafiar.')
      setOpenStep(1)
      return
    }
    if (!data.sideAName.trim()) {
      setError('Ingresa el nombre de tu lado.')
      setOpenStep(1)
      return
    }
    if (data.friendlyMode === 'intra' && !data.sideBName.trim()) {
      setError('Ingresa el nombre de ambos lados.')
      setOpenStep(1)
      return
    }
    if (!data.date || !data.time) {
      setError('Ingresa fecha y hora del partido.')
      setOpenStep(1)
      return
    }

    const rosterError = validateRoster(data)
    if (rosterError) {
      setError(rosterError)
      setOpenStep(4)
      patch({ rosterPhase: 'teams' })
      return
    }

    let scheduledAt: string
    try {
      scheduledAt = scheduleInputToIso(data.date, data.time)
    } catch {
      setError('Fecha u hora inválida.')
      setOpenStep(1)
      return
    }

    setLoading(true)
    const sideBName =
      data.friendlyMode === 'challenge'
        ? selectedGuestOrg?.name ?? data.sideBName
        : data.sideBName

    const payload =
      data.friendlyMode === 'challenge'
        ? {
            matchType: 'FRIENDLY' as const,
            guestOrganizationSlug: data.guestOrganizationSlug,
            friendlyCategoryId: data.categoryId,
            footballFormat: data.footballFormat,
            sideAName: data.sideAName,
            sideBName,
            refereeId: data.refereeId || undefined,
            refereeEventTypes: data.refereeEventTypes,
            venue: data.venue || undefined,
            regionCode: data.regionCode || undefined,
            communeCode: data.communeCode || undefined,
            scheduledAt,
            players: rosterEntriesFromSets(
              sideAIds,
              new Set<string>(),
              data.sideACaptainId,
              null,
              data.sideACoachId,
              null
            ),
          }
        : {
            matchType: 'FRIENDLY' as const,
            friendlyCategoryId: data.categoryId,
            footballFormat: data.footballFormat,
            sideAName: data.sideAName,
            sideBName: data.sideBName,
            refereeId: data.refereeId || undefined,
            refereeEventTypes: data.refereeEventTypes,
            venue: data.venue || undefined,
            regionCode: data.regionCode || undefined,
            communeCode: data.communeCode || undefined,
            scheduledAt,
            players: rosterEntriesFromSets(
              sideAIds,
              sideBIds,
              data.sideACaptainId,
              data.sideBCaptainId,
              data.sideACoachId,
              data.sideBCoachId
            ),
          }

    const result = await submitJson('/api/matches', 'POST', payload)
    setLoading(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    clearDraft()
    router.push(orgPath('/admin/matches'))
    router.refresh()
  }

  if (!hydrated) {
    return <p className="text-sm text-kelme-gray-500">Cargando formulario…</p>
  }

  if (activeCategories.length === 0) {
    return (
      <div className="rounded-xl border border-kelme-border bg-kelme-surface p-6">
        <h1 className="font-display text-xl font-bold">Crear partido amistoso</h1>
        <p className="mt-2 text-sm text-kelme-gray-500">
          Primero crea una categoría amistosa activa.
        </p>
        <Link href={orgPath('/admin/friendly-categories')} className="mt-4 inline-block text-sm text-kelme-red hover:underline">
          Ir a categorías amistosas
        </Link>
      </div>
    )
  }

  const rosterReady =
    data.friendlyMode === 'challenge'
      ? sideAIds.size >= 1 &&
        Boolean(data.sideACaptainId) &&
        Boolean(data.sideACoachId)
      : sideAIds.size >= 1 &&
        sideBIds.size >= 1 &&
        Boolean(data.sideACaptainId) &&
        Boolean(data.sideBCaptainId) &&
        Boolean(data.sideACoachId) &&
        Boolean(data.sideBCoachId)

  const matchTitle =
    data.sideAName.trim() &&
    (data.friendlyMode === 'challenge'
      ? selectedGuestOrg?.name || data.sideBName.trim()
      : data.sideBName.trim())
      ? `${data.sideAName.trim()} vs ${
          data.friendlyMode === 'challenge'
            ? selectedGuestOrg?.name ?? data.sideBName.trim()
            : data.sideBName.trim()
        }`
      : ''

  const summaryRows = [
    { label: 'Categoría', value: category?.name ?? '' },
    { label: 'Partido', value: matchTitle },
    { label: 'Lado A', value: data.sideAName },
    { label: 'Lado B', value: data.sideBName },
    { label: 'Formato', value: footballFormatLabel(data.footballFormat as FootballFormat) },
    { label: 'Árbitro', value: referee?.name ?? '' },
    { label: 'Fecha y hora', value: formatScheduleLabel(data.date, data.time) },
    { label: 'Cancha', value: data.venue },
  ]

  return (
    <MatchCreateWizardShell
      variant="friendly"
      icon="⚽"
      title="Crear partido amistoso"
      subtitle="Configura el amistoso, convoca jugadores y revisa antes de crear."
      badge="Amistoso"
      savedAtLabel={savedAtLabel}
      onDiscardDraft={clearDraft}
      submitLabel="Crear partido amistoso"
      loading={loading}
      error={error}
      onSubmit={() => void handleSubmit()}
      summary={
        <MatchCreateSummary
          rows={summaryRows}
          regionLabel={regionName}
          communeLabel={communeName}
          eventTypes={data.refereeEventTypes}
          eventPreset={data.eventPreset}
          friendlyRoster={{
            convokedCount: convokedIds.size,
            sideACount: sideAIds.size,
            sideBCount: sideBIds.size,
            rosterReady,
          }}
          footerMessage="Este es un partido amistoso. Las estadísticas no afectan competencias oficiales."
        />
      }
    >
      <WizardStep
        step={1}
        title="Información general"
        subtitle="Categoría, lados, árbitro y horario"
        isOpen={data.openStep === 1}
        onToggle={() => setOpenStep(1)}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <fieldset className="md:col-span-2 space-y-2">
            <legend className="text-sm font-semibold text-kelme-gray-800">Tipo de amistoso</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="friendlyMode"
                checked={data.friendlyMode === 'intra'}
                onChange={() => patch({ friendlyMode: 'intra', rosterPhase: 'convocation' })}
              />
              Solo mi organización
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="friendlyMode"
                checked={data.friendlyMode === 'challenge'}
                onChange={() => patch({ friendlyMode: 'challenge', rosterPhase: 'convocation' })}
              />
              Desafiar a otra liga
            </label>
          </fieldset>
          {data.friendlyMode === 'challenge' ? (
            <select
              value={data.guestOrganizationSlug}
              onChange={(event) => patch({ guestOrganizationSlug: event.target.value })}
              className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2"
              required
            >
              <option value="">
                {directoryLoading ? 'Cargando organizaciones…' : 'Organización visitante'}
              </option>
              {organizationDirectory.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : null}
          <select
            value={data.categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2"
            required
          >
            {activeCategories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            value={data.sideAName}
            onChange={(e) => patch({ sideAName: e.target.value })}
            placeholder="Nombre lado A (local)"
            className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
            required
          />
          {data.friendlyMode === 'intra' ? (
            <input
              value={data.sideBName}
              onChange={(e) => patch({ sideBName: e.target.value })}
              placeholder="Nombre lado B (visitante)"
              className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
              required
            />
          ) : (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              Lado B: {selectedGuestOrg?.name ?? 'El visitante arma su lado cuando acepte.'}
            </div>
          )}
          <select
            value={data.refereeId}
            onChange={(e) => patch({ refereeId: e.target.value })}
            className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
          >
            <option value="">Árbitro</option>
            {referees.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={data.date}
            onChange={(e) => patch({ date: e.target.value })}
            className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
            required
          />
          <input
            type="time"
            value={data.time}
            onChange={(e) => patch({ time: e.target.value })}
            className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
            required
          />
          <input
            value={data.venue}
            onChange={(e) => patch({ venue: e.target.value })}
            placeholder="Cancha"
            className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2"
          />
        </div>
      </WizardStep>

      <WizardStep
        step={2}
        title="Ubicación en Chile"
        subtitle="Región y comuna (opcional)"
        isOpen={data.openStep === 2}
        onToggle={() => setOpenStep(2)}
      >
        <ChileLocationPicker
          regionCode={data.regionCode}
          communeCode={data.communeCode}
          onRegionChange={(regionCode) => patch({ regionCode, communeCode: '' })}
          onCommuneChange={(communeCode) => patch({ communeCode })}
        />
      </WizardStep>

      <WizardStep
        step={3}
        title="Configuración del amistoso"
        subtitle="Formato y registro de eventos"
        isOpen={data.openStep === 3}
        onToggle={() => setOpenStep(3)}
      >
        <div className="space-y-4">
          <select
            value={data.footballFormat}
            onChange={(e) => patch({ footballFormat: e.target.value })}
            className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
            required
          >
            {FOOTBALL_FORMATS.map((format) => (
              <option key={format} value={format}>
                {FOOTBALL_FORMAT_LABELS[format]}
              </option>
            ))}
          </select>
          <RefereeEventPresetSelect
            preset={data.eventPreset}
            onPresetChange={(eventPreset) => patch({ eventPreset })}
            eventTypes={data.refereeEventTypes}
            onEventTypesChange={(refereeEventTypes) => patch({ refereeEventTypes })}
          />
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Este es un partido amistoso. Las estadísticas no afectan competencias oficiales.
          </div>
        </div>
      </WizardStep>

      <WizardStep
        step={4}
        title="Convocatoria y equipos"
        subtitle="Jugadores, lados, capitán y DT"
        isOpen={data.openStep === 4}
        onToggle={() => setOpenStep(4)}
      >
        {data.rosterPhase === 'convocation' ? (
          <div className="space-y-4">
            <FriendlyTeamBulkAdd
              teams={teams}
              roster={roster}
              onAddToSide={handleAddTeamToSide}
              sideOnly={data.friendlyMode === 'challenge' ? 'A' : undefined}
            />
            <FriendlyMatchConvocationPicker
              roster={roster}
              convokedIds={convokedIds}
              search={data.convocationSearch}
              onSearchChange={(convocationSearch) => patch({ convocationSearch })}
              onToggle={handleToggleConvocation}
              categoryId={data.categoryId}
              onPlayerCreated={handlePlayerCreated}
            />
            <button
              type="button"
              disabled={convokedIds.size < (data.friendlyMode === 'challenge' ? 1 : 2)}
              onClick={goToTeamsPhase}
              className="rounded-lg bg-kelme-red px-4 py-2 font-semibold text-white hover:bg-kelme-red-dark disabled:opacity-50"
            >
              Continuar a equipos
            </button>
          </div>
        ) : data.friendlyMode === 'challenge' ? (
          <div className="space-y-4">
            <p className="text-sm text-kelme-gray-600">
              Asigna capitán y DT solo para tu lado. El visitante completa su plantel al aceptar.
            </p>
            <FriendlyMatchTeamAssigner
              convoked={convoked}
              sideAName={data.sideAName || 'A'}
              sideBName={selectedGuestOrg?.name || 'Visitante'}
              sideAIds={sideAIds}
              sideBIds={new Set<string>()}
              sideACaptainId={data.sideACaptainId}
              sideBCaptainId={null}
              sideACoachId={data.sideACoachId}
              sideBCoachId={null}
              onSideChange={(playerId) => handleSideChange(playerId, 'A')}
              onSideACaptainChange={(sideACaptainId) => patch({ sideACaptainId })}
              onSideBCaptainChange={() => undefined}
              onSideACoachChange={(sideACoachId) => patch({ sideACoachId })}
              onSideBCoachChange={() => undefined}
            />
            <button
              type="button"
              onClick={() => patch({ rosterPhase: 'convocation' })}
              className="rounded-lg border border-kelme-border px-4 py-2 font-semibold hover:bg-kelme-gray-50"
            >
              Volver a convocatoria
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <FriendlyMatchTeamAssigner
              convoked={convoked}
              sideAName={data.sideAName || 'A'}
              sideBName={data.sideBName || 'B'}
              sideAIds={sideAIds}
              sideBIds={sideBIds}
              sideACaptainId={data.sideACaptainId}
              sideBCaptainId={data.sideBCaptainId}
              sideACoachId={data.sideACoachId}
              sideBCoachId={data.sideBCoachId}
              onSideChange={handleSideChange}
              onSideACaptainChange={(sideACaptainId) => patch({ sideACaptainId })}
              onSideBCaptainChange={(sideBCaptainId) => patch({ sideBCaptainId })}
              onSideACoachChange={(sideACoachId) => patch({ sideACoachId })}
              onSideBCoachChange={(sideBCoachId) => patch({ sideBCoachId })}
            />
            <button
              type="button"
              onClick={() => patch({ rosterPhase: 'convocation' })}
              className="rounded-lg border border-kelme-border px-4 py-2 font-semibold hover:bg-kelme-gray-50"
            >
              Volver a convocatoria
            </button>
          </div>
        )}
      </WizardStep>

      <WizardStep
        step={5}
        title="Eventos del árbitro"
        subtitle="Ajusta el registro del árbitro"
        isOpen={data.openStep === 5}
        onToggle={() => setOpenStep(5)}
      >
        <MatchRefereeEventsPicker
          value={data.refereeEventTypes}
          onChange={(next) =>
            syncPresetFromEventTypes(
              next,
              (refereeEventTypes) => patch({ refereeEventTypes }),
              (eventPreset) => patch({ eventPreset })
            )
          }
        />
      </WizardStep>

      <WizardStep
        step={6}
        title="Resumen"
        subtitle="Revisa antes de crear"
        isOpen={data.openStep === 6}
        onToggle={() => setOpenStep(6)}
      >
        <dl className="grid gap-2 text-sm">
          {summaryRows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3 border-b border-kelme-border py-2">
              <dt className="text-kelme-gray-500">{row.label}</dt>
              <dd className="font-medium text-kelme-gray-900">{row.value || '—'}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-b border-kelme-border py-2">
            <dt className="text-kelme-gray-500">Convocados</dt>
            <dd className="font-medium text-kelme-gray-900">{convokedIds.size}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-kelme-border py-2">
            <dt className="text-kelme-gray-500">Plantel</dt>
            <dd className="font-medium text-kelme-gray-900">
              {rosterReady ? 'Listo' : 'Pendiente'}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-2">
            <dt className="text-kelme-gray-500">Ubicación</dt>
            <dd className="font-medium text-kelme-gray-900">
              {regionName || communeName
                ? [communeName, regionName].filter(Boolean).join(', ')
                : '—'}
            </dd>
          </div>
        </dl>
      </WizardStep>
    </MatchCreateWizardShell>
  )
}
