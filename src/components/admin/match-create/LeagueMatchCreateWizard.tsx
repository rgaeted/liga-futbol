'use client'

import { useMemo, useState } from 'react'
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
import { submitJson } from '@/components/admin/submit'
import { useOrgPath } from '@/hooks/useOrgPath'
import { footballFormatLabel } from '@/lib/football-format'
import { isConfigurableRefereeEvent } from '@/lib/match-referee-events'
import {
  refereeEventTypesForPreset,
  type RefereeEventPreset,
} from '@/lib/match-referee-event-presets'
import { scheduleInputToIso } from '@/lib/schedule-datetime'
import { APP_LOCALE, APP_TIMEZONE } from '@/lib/locale'

const DRAFT_KEY = 'match-create-draft:league'

type SeasonCategoryOption = {
  seasonCategoryId: string
  categoryId: string
  name: string
  teams: Array<{ id: string; name: string }>
}

type SeasonOption = {
  id: string
  name: string
  footballFormat?: FootballFormat
  categories: SeasonCategoryOption[]
}

type LeagueDraft = {
  openStep: number
  seasonId: string
  seasonCategoryId: string
  homeTeamId: string
  awayTeamId: string
  refereeId: string
  date: string
  time: string
  venue: string
  regionCode: string
  communeCode: string
  refereeEventTypes: EventType[]
  eventPreset: RefereeEventPreset
}

type Props = {
  seasons: SeasonOption[]
  referees: Array<{ id: string; name: string }>
}

function createInitialDraft(): LeagueDraft {
  return {
    openStep: 1,
    seasonId: '',
    seasonCategoryId: '',
    homeTeamId: '',
    awayTeamId: '',
    refereeId: '',
    date: '',
    time: '',
    venue: '',
    regionCode: '',
    communeCode: '',
    refereeEventTypes: refereeEventTypesForPreset('completo'),
    eventPreset: 'completo',
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

export function LeagueMatchCreateWizard({ seasons, referees }: Props) {
  const router = useRouter()
  const orgPath = useOrgPath()
  const { data, setData, savedAtLabel, hydrated, clearDraft } = useMatchCreateDraft(
    DRAFT_KEY,
    createInitialDraft()
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { regionName, communeName } = useChileLocationLabels(data.regionCode, data.communeCode)

  const selectedSeason = useMemo(
    () => seasons.find((season) => season.id === data.seasonId),
    [data.seasonId, seasons]
  )

  const selectedCategory = useMemo(
    () =>
      selectedSeason?.categories.find(
        (category) => category.seasonCategoryId === data.seasonCategoryId
      ),
    [data.seasonCategoryId, selectedSeason]
  )

  const enrolledTeams = selectedCategory?.teams ?? []

  const homeTeam = enrolledTeams.find((team) => team.id === data.homeTeamId)
  const awayTeam = enrolledTeams.find((team) => team.id === data.awayTeamId)
  const referee = referees.find((item) => item.id === data.refereeId)

  function patch(partial: Partial<LeagueDraft>) {
    setData((current) => ({ ...current, ...partial }))
  }

  function setOpenStep(step: number) {
    patch({ openStep: step })
  }

  function handleSeasonChange(seasonId: string) {
    patch({
      seasonId,
      seasonCategoryId: '',
      homeTeamId: '',
      awayTeamId: '',
    })
  }

  function handleCategoryChange(seasonCategoryId: string) {
    patch({
      seasonCategoryId,
      homeTeamId: '',
      awayTeamId: '',
    })
  }

  async function handleSubmit() {
    setError('')

    if (
      !data.seasonId ||
      !data.seasonCategoryId ||
      !data.homeTeamId ||
      !data.awayTeamId ||
      !data.date ||
      !data.time
    ) {
      setError('Completa temporada, categoría, equipos, fecha y hora.')
      setOpenStep(1)
      return
    }
    if (data.homeTeamId === data.awayTeamId) {
      setError('Local y visitante deben ser equipos distintos.')
      setOpenStep(1)
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
    const result = await submitJson('/api/matches', 'POST', {
      matchType: 'LEAGUE',
      seasonId: data.seasonId,
      seasonCategoryId: data.seasonCategoryId,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      refereeId: data.refereeId || undefined,
      refereeEventTypes: data.refereeEventTypes,
      venue: data.venue || undefined,
      regionCode: data.regionCode || undefined,
      communeCode: data.communeCode || undefined,
      scheduledAt,
    })
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

  const canCreate = seasons.some((season) =>
    season.categories.some((category) => category.teams.length >= 2)
  )

  const summaryRows = [
    { label: 'Temporada', value: selectedSeason?.name ?? '' },
    { label: 'Categoría', value: selectedCategory?.name ?? '' },
    {
      label: 'Formato',
      value: selectedSeason?.footballFormat
        ? footballFormatLabel(selectedSeason.footballFormat)
        : '',
    },
    { label: 'Local', value: homeTeam?.name ?? '' },
    { label: 'Visitante', value: awayTeam?.name ?? '' },
    { label: 'Árbitro', value: referee?.name ?? '' },
    { label: 'Fecha y hora', value: formatScheduleLabel(data.date, data.time) },
    { label: 'Cancha', value: data.venue },
  ]

  return (
    <MatchCreateWizardShell
      variant="league"
      icon="🛡"
      title="Crear partido"
      subtitle="Completa la información del partido de liga paso a paso."
      savedAtLabel={savedAtLabel}
      onDiscardDraft={clearDraft}
      submitLabel="Crear partido"
      loading={loading}
      disabled={!canCreate}
      error={error}
      onSubmit={() => void handleSubmit()}
      summary={
        <MatchCreateSummary
          rows={summaryRows}
          regionLabel={regionName}
          communeLabel={communeName}
          eventTypes={data.refereeEventTypes}
          eventPreset={data.eventPreset}
          footerMessage="Revisa el resumen antes de crear el partido."
        />
      }
    >
      {!canCreate ? (
        <div className="rounded-xl border border-kelme-border bg-kelme-surface p-4 text-sm text-kelme-gray-600">
          Necesitas al menos una temporada con una categoría que tenga dos equipos inscritos para
          crear un partido de liga.
        </div>
      ) : null}

      <WizardStep
        step={1}
        title="Datos del partido"
        subtitle="Temporada, categoría, equipos, árbitro y horario"
        isOpen={data.openStep === 1}
        onToggle={() => setOpenStep(1)}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={data.seasonId}
            onChange={(e) => handleSeasonChange(e.target.value)}
            className="input-kelme rounded-lg px-3 py-2 md:col-span-2"
            required
          >
            <option value="">Temporada</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
                {season.footballFormat ? ` · ${footballFormatLabel(season.footballFormat)}` : ''}
              </option>
            ))}
          </select>
          <select
            value={data.seasonCategoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="input-kelme rounded-lg px-3 py-2 md:col-span-2"
            required
            disabled={!selectedSeason}
          >
            <option value="">Categoría</option>
            {(selectedSeason?.categories ?? []).map((category) => (
              <option key={category.seasonCategoryId} value={category.seasonCategoryId}>
                {category.name}
                {category.teams.length > 0 ? ` · ${category.teams.length} equipos` : ''}
              </option>
            ))}
          </select>
          <select
            value={data.homeTeamId}
            onChange={(e) => patch({ homeTeamId: e.target.value })}
            className="input-kelme rounded-lg px-3 py-2"
            required
            disabled={!data.seasonCategoryId}
          >
            <option value="">Local</option>
            {enrolledTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select
            value={data.awayTeamId}
            onChange={(e) => patch({ awayTeamId: e.target.value })}
            className="input-kelme rounded-lg px-3 py-2"
            required
            disabled={!data.seasonCategoryId}
          >
            <option value="">Visitante</option>
            {enrolledTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select
            value={data.refereeId}
            onChange={(e) => patch({ refereeId: e.target.value })}
            className="input-kelme rounded-lg px-3 py-2"
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
            className="input-kelme rounded-lg px-3 py-2"
            required
          />
          <input
            type="time"
            value={data.time}
            onChange={(e) => patch({ time: e.target.value })}
            className="input-kelme rounded-lg px-3 py-2"
            required
          />
          <input
            value={data.venue}
            onChange={(e) => patch({ venue: e.target.value })}
            placeholder="Cancha"
            className="input-kelme rounded-lg px-3 py-2 md:col-span-2"
          />
          {selectedSeason?.footballFormat ? (
            <p className="text-sm text-kelme-gray-500 md:col-span-2">
              Tipo de fútbol: {footballFormatLabel(selectedSeason.footballFormat)} (heredado de la
              temporada)
            </p>
          ) : null}
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
        title="Eventos del árbitro"
        subtitle="Qué debe registrar el árbitro"
        isOpen={data.openStep === 3}
        onToggle={() => setOpenStep(3)}
      >
        <div className="space-y-4">
          <RefereeEventPresetSelect
            preset={data.eventPreset}
            onPresetChange={(eventPreset) => patch({ eventPreset })}
            eventTypes={data.refereeEventTypes}
            onEventTypesChange={(refereeEventTypes) => patch({ refereeEventTypes })}
          />
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
        </div>
      </WizardStep>

      <WizardStep
        step={4}
        title="Resumen"
        subtitle="Revisa antes de crear"
        isOpen={data.openStep === 4}
        onToggle={() => setOpenStep(4)}
      >
        <dl className="grid gap-2 text-sm">
          {summaryRows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3 border-b border-kelme-border py-2">
              <dt className="text-kelme-gray-500">{row.label}</dt>
              <dd className="font-medium text-kelme-gray-900">{row.value || '—'}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-b border-kelme-border py-2">
            <dt className="text-kelme-gray-500">Ubicación</dt>
            <dd className="font-medium text-kelme-gray-900">
              {regionName || communeName
                ? [communeName, regionName].filter(Boolean).join(', ')
                : '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-2">
            <dt className="text-kelme-gray-500">Eventos</dt>
            <dd className="font-medium text-kelme-gray-900">
              {data.refereeEventTypes.filter(isConfigurableRefereeEvent).length} tipos seleccionados
            </dd>
          </div>
        </dl>
      </WizardStep>
    </MatchCreateWizardShell>
  )
}
