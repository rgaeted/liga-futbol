'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FootballFormat } from '@prisma/client'
import { MatchCreateWizardShell } from '@/components/admin/match-create/MatchCreateWizardShell'
import { WizardStep } from '@/components/admin/match-create/WizardStep'
import { useMatchCreateDraft } from '@/components/admin/match-create/useMatchCreateDraft'
import { SeasonCreateSummary } from '@/components/admin/season-create/SeasonCreateSummary'
import {
  createInitialMobileDraft,
  SeasonMobileConfigFields,
} from '@/components/admin/season-create/SeasonMobileConfigFields'
import {
  SeasonTeamsEditor,
  type TeamEnrollment,
} from '@/components/admin/season-mobile/SeasonTeamsEditor'
import { submitJson } from '@/components/admin/submit'
import { useOrgPath } from '@/hooks/useOrgPath'
import { formatApiError } from '@/lib/api-error'
import {
  FOOTBALL_FORMATS,
  FOOTBALL_FORMAT_LABELS,
  footballFormatLabel,
} from '@/lib/football-format'
import { APP_LOCALE, APP_TIMEZONE } from '@/lib/locale'
import { slugFromSeasonName } from '@/lib/validations/mobile-season'

const DRAFT_KEY = 'season-create-draft:v3'

type CategoryOption = {
  id: string
  name: string
}

type SeasonDraft = {
  openStep: number
  name: string
  footballFormat: FootballFormat
  startDate: string
  endDate: string
  selectedCategoryIds: string[]
  selectedTeamIdsByCategory: Record<string, string[]>
  rosterByCategory: Record<string, Record<string, string[]>>
  slugManuallyEdited: boolean
  mobile: ReturnType<typeof createInitialMobileDraft>
}

type Props = {
  organizationSlug: string
  categories: CategoryOption[]
  teams: TeamEnrollment[]
}

function createInitialDraft(): SeasonDraft {
  return {
    openStep: 1,
    name: '',
    footballFormat: 'FUTBOL_11',
    startDate: '',
    endDate: '',
    selectedCategoryIds: [],
    selectedTeamIdsByCategory: {},
    rosterByCategory: {},
    slugManuallyEdited: false,
    mobile: createInitialMobileDraft(),
  }
}

function formatDateLabel(isoDate: string): string {
  if (!isoDate) return ''
  try {
    return new Intl.DateTimeFormat(APP_LOCALE, {
      timeZone: APP_TIMEZONE,
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${isoDate}T12:00:00`))
  } catch {
    return isoDate
  }
}

function eligiblePlayerIds(team: TeamEnrollment, categoryId: string): string[] {
  return team.players
    .filter((player) => player.categoryIds?.includes(categoryId))
    .map((player) => player.id)
}

function countEnrolledPlayers(
  selectedTeamIds: string[],
  rosterByTeam: Record<string, string[]>,
): number {
  const unique = new Set<string>()
  for (const teamId of selectedTeamIds) {
    for (const playerId of rosterByTeam[teamId] ?? []) {
      unique.add(playerId)
    }
  }
  return unique.size
}

export function SeasonCreateWizard({ organizationSlug, categories, teams }: Props) {
  const router = useRouter()
  const orgPath = useOrgPath()
  const slugManuallyEditedRef = useRef(false)
  const { data, setData, savedAtLabel, hydrated, clearDraft } = useMatchCreateDraft(
    DRAFT_KEY,
    createInitialDraft(),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedCategories = useMemo(
    () =>
      data.selectedCategoryIds
        .map((id) => categories.find((category) => category.id === id))
        .filter((category): category is CategoryOption => category != null),
    [categories, data.selectedCategoryIds],
  )

  const enrollmentByCategory = useMemo(
    () =>
      selectedCategories.map((category) => {
        const selectedTeamIds = data.selectedTeamIdsByCategory[category.id] ?? []
        const rosterByTeam = data.rosterByCategory[category.id] ?? {}
        return {
          name: category.name,
          teamCount: selectedTeamIds.length,
          playerCount: countEnrolledPlayers(selectedTeamIds, rosterByTeam),
        }
      }),
    [data.rosterByCategory, data.selectedTeamIdsByCategory, selectedCategories],
  )

  const hasAnyEnrollment = enrollmentByCategory.some(
    (block) => block.teamCount > 0 || block.playerCount > 0,
  )

  function patch(partial: Partial<Omit<SeasonDraft, 'mobile'>>) {
    setData((current) => ({ ...current, ...partial }))
  }

  function patchMobile(partial: Partial<SeasonDraft['mobile']>) {
    setData((current) => ({
      ...current,
      mobile: { ...current.mobile, ...partial },
    }))
  }

  function patchName(name: string) {
    setData((current) => {
      const trimmed = name
      const next: SeasonDraft = { ...current, name: trimmed }
      if (!current.slugManuallyEdited && !slugManuallyEditedRef.current) {
        next.mobile = {
          ...current.mobile,
          slug: slugFromSeasonName(trimmed),
          displayName: trimmed.trim(),
        }
      }
      return next
    })
  }

  function setOpenStep(step: number) {
    patch({ openStep: step })
  }

  function toggleCategory(categoryId: string) {
    setData((current) => {
      const isSelected = current.selectedCategoryIds.includes(categoryId)
      if (isSelected) {
        const { [categoryId]: _teams, ...restTeams } = current.selectedTeamIdsByCategory
        const { [categoryId]: _roster, ...restRoster } = current.rosterByCategory
        return {
          ...current,
          selectedCategoryIds: current.selectedCategoryIds.filter((id) => id !== categoryId),
          selectedTeamIdsByCategory: restTeams,
          rosterByCategory: restRoster,
        }
      }
      return {
        ...current,
        selectedCategoryIds: [...current.selectedCategoryIds, categoryId],
      }
    })
  }

  function toggleTeam(categoryId: string, teamId: string) {
    setData((current) => {
      const selectedTeamIds = current.selectedTeamIdsByCategory[categoryId] ?? []
      const rosterByTeam = current.rosterByCategory[categoryId] ?? {}
      const isSelected = selectedTeamIds.includes(teamId)

      if (isSelected) {
        const { [teamId]: _, ...restRoster } = rosterByTeam
        return {
          ...current,
          selectedTeamIdsByCategory: {
            ...current.selectedTeamIdsByCategory,
            [categoryId]: selectedTeamIds.filter((id) => id !== teamId),
          },
          rosterByCategory: {
            ...current.rosterByCategory,
            [categoryId]: restRoster,
          },
        }
      }

      const team = teams.find((item) => item.teamId === teamId)
      return {
        ...current,
        selectedTeamIdsByCategory: {
          ...current.selectedTeamIdsByCategory,
          [categoryId]: [...selectedTeamIds, teamId],
        },
        rosterByCategory: {
          ...current.rosterByCategory,
          [categoryId]: {
            ...rosterByTeam,
            [teamId]: team ? eligiblePlayerIds(team, categoryId) : [],
          },
        },
      }
    })
  }

  function togglePlayer(categoryId: string, teamId: string, playerId: string) {
    setData((current) => {
      const rosterByTeam = current.rosterByCategory[categoryId] ?? {}
      const existing = new Set(rosterByTeam[teamId] ?? [])
      if (existing.has(playerId)) existing.delete(playerId)
      else existing.add(playerId)
      return {
        ...current,
        rosterByCategory: {
          ...current.rosterByCategory,
          [categoryId]: {
            ...rosterByTeam,
            [teamId]: [...existing],
          },
        },
      }
    })
  }

  function selectAllTeamsForCategory(categoryId: string) {
    setData((current) => ({
      ...current,
      selectedTeamIdsByCategory: {
        ...current.selectedTeamIdsByCategory,
        [categoryId]: teams.map((team) => team.teamId),
      },
      rosterByCategory: {
        ...current.rosterByCategory,
        [categoryId]: Object.fromEntries(
          teams.map((team) => [team.teamId, eligiblePlayerIds(team, categoryId)]),
        ),
      },
    }))
  }

  function clearCategoryEnrollment(categoryId: string) {
    setData((current) => {
      const { [categoryId]: _teams, ...restTeams } = current.selectedTeamIdsByCategory
      const { [categoryId]: _roster, ...restRoster } = current.rosterByCategory
      return {
        ...current,
        selectedTeamIdsByCategory: restTeams,
        rosterByCategory: restRoster,
      }
    })
  }

  function selectAllPlayersForTeam(categoryId: string, teamId: string) {
    const team = teams.find((item) => item.teamId === teamId)
    if (!team) return
    setData((current) => {
      const rosterByTeam = current.rosterByCategory[categoryId] ?? {}
      return {
        ...current,
        rosterByCategory: {
          ...current.rosterByCategory,
          [categoryId]: {
            ...rosterByTeam,
            [teamId]: eligiblePlayerIds(team, categoryId),
          },
        },
      }
    })
  }

  function markSlugManualEdit() {
    slugManuallyEditedRef.current = true
    patch({ slugManuallyEdited: true })
  }

  async function handleSubmit() {
    setError('')

    if (!data.name.trim() || data.name.trim().length < 2) {
      setError('Ingresa un nombre de al menos 2 caracteres.')
      setOpenStep(1)
      return
    }
    if (!data.startDate || !data.endDate) {
      setError('Indica fecha de inicio y término.')
      setOpenStep(1)
      return
    }
    if (new Date(data.endDate) < new Date(data.startDate)) {
      setError('La fecha de término debe ser igual o posterior al inicio.')
      setOpenStep(1)
      return
    }
    if (data.selectedCategoryIds.length === 0) {
      setError('Elige al menos una categoría para la temporada.')
      setOpenStep(2)
      return
    }
    if (data.mobile.configureMobile) {
      if (!data.mobile.slug.trim() || !data.mobile.displayName.trim()) {
        setError('Completa slug y nombre visible de la app móvil.')
        setOpenStep(4)
        return
      }
    }

    setLoading(true)

    let seasonId: string
    try {
      const res = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          startDate: new Date(data.startDate).toISOString(),
          endDate: new Date(data.endDate).toISOString(),
          footballFormat: data.footballFormat,
          categoryIds: data.selectedCategoryIds,
        }),
      })
      if (!res.ok) {
        let message = `Error ${res.status}`
        try {
          const payload = await res.json()
          if (typeof payload?.error === 'string') message = payload.error
          else if (payload?.error) message = formatApiError(payload.error, message)
        } catch {
          // respuesta sin JSON
        }
        setError(message)
        setLoading(false)
        return
      }
      const season = (await res.json()) as { id: string }
      seasonId = season.id
    } catch {
      setError('No se pudo conectar con el servidor.')
      setLoading(false)
      return
    }

    for (const categoryId of data.selectedCategoryIds) {
      const selectedTeamIds = data.selectedTeamIdsByCategory[categoryId] ?? []
      if (selectedTeamIds.length === 0) continue

      const selectedTeams = teams.filter((team) => selectedTeamIds.includes(team.teamId))
      const rosterByTeam = data.rosterByCategory[categoryId] ?? {}
      const enrollmentPayload = {
        categoryId,
        teams: selectedTeams.map((team, index) => ({
          teamId: team.teamId,
          displayName: team.name,
          color: team.color,
          sortOrder: index,
          playerIds: rosterByTeam[team.teamId] ?? [],
        })),
      }
      const enrollmentResult = await submitJson(
        `/api/admin/seasons/${seasonId}/enrollment`,
        'PUT',
        enrollmentPayload,
      )
      if (!enrollmentResult.ok) {
        const categoryName =
          categories.find((category) => category.id === categoryId)?.name ?? 'una categoría'
        setError(
          `La temporada se creó, pero falló la inscripción de ${categoryName}: ${enrollmentResult.message}. Puedes completarla en App móvil.`,
        )
        setLoading(false)
        router.push(orgPath(`/admin/seasons/${seasonId}/mobile`))
        router.refresh()
        return
      }
    }

    if (data.mobile.configureMobile) {
      const mobileResult = await submitJson(`/api/admin/seasons/${seasonId}/mobile`, 'PUT', {
        slug: data.mobile.slug.trim(),
        displayName: data.mobile.displayName.trim(),
        shortName: data.mobile.shortName.trim() || null,
        description: data.mobile.description.trim() || null,
        primaryColor: data.mobile.primaryColor.trim() || null,
        secondaryColor: data.mobile.secondaryColor.trim() || null,
        isPublished: false,
      })
      if (!mobileResult.ok) {
        setError(
          `La temporada se creó, pero falló la config móvil: ${mobileResult.message}. Puedes completarla en App móvil.`,
        )
        setLoading(false)
        router.push(orgPath(`/admin/seasons/${seasonId}/mobile`))
        router.refresh()
        return
      }
    }

    setLoading(false)
    clearDraft()
    slugManuallyEditedRef.current = false
    router.push(orgPath('/admin/seasons'))
    router.refresh()
  }

  if (!hydrated) {
    return <p className="text-sm text-kelme-gray-500">Cargando formulario…</p>
  }

  const summaryRows = [
    { label: 'Nombre', value: data.name },
    { label: 'Formato', value: footballFormatLabel(data.footballFormat) },
    { label: 'Inicio', value: formatDateLabel(data.startDate) },
    { label: 'Término', value: formatDateLabel(data.endDate) },
  ]

  return (
    <MatchCreateWizardShell
      variant="season"
      icon="🏆"
      title="Nueva temporada"
      subtitle="Configura la temporada, categorías, equipos y app móvil paso a paso."
      savedAtLabel={savedAtLabel}
      onDiscardDraft={() => {
        slugManuallyEditedRef.current = false
        clearDraft()
      }}
      backLabel="← Volver a temporadas"
      submitLabel="Crear temporada"
      loading={loading}
      error={error}
      onSubmit={() => void handleSubmit()}
      summary={
        <SeasonCreateSummary
          rows={summaryRows}
          categoryNames={selectedCategories.map((category) => category.name)}
          enrollmentByCategory={hasAnyEnrollment ? enrollmentByCategory : undefined}
          mobile={
            data.mobile.configureMobile
              ? { slug: data.mobile.slug, displayName: data.mobile.displayName }
              : undefined
          }
          footerMessage="Revisa el resumen antes de crear la temporada."
        />
      }
    >
      <WizardStep
        step={1}
        title="Datos de la temporada"
        subtitle="Nombre, formato y fechas"
        isOpen={data.openStep === 1}
        onToggle={() => setOpenStep(1)}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={data.name}
            onChange={(e) => patchName(e.target.value)}
            placeholder="Nombre de la temporada"
            className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2"
            required
          />
          <select
            value={data.footballFormat}
            onChange={(e) => patch({ footballFormat: e.target.value as FootballFormat })}
            className="rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2 md:col-span-2"
            required
          >
            {FOOTBALL_FORMATS.map((format) => (
              <option key={format} value={format}>
                {FOOTBALL_FORMAT_LABELS[format]}
              </option>
            ))}
          </select>
          <label className="block text-sm">
            <span className="mb-1 block text-kelme-gray-600">Fecha de inicio</span>
            <input
              type="date"
              value={data.startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
              className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-kelme-gray-600">Fecha de término</span>
            <input
              type="date"
              value={data.endDate}
              onChange={(e) => patch({ endDate: e.target.value })}
              className="w-full rounded-lg border border-kelme-border bg-kelme-gray-100 px-3 py-2"
              required
            />
          </label>
        </div>
      </WizardStep>

      <WizardStep
        step={2}
        title="Categorías"
        subtitle="Elige las categorías que incluirá la temporada"
        isOpen={data.openStep === 2}
        onToggle={() => setOpenStep(2)}
      >
        {categories.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-kelme-gray-600">
              Crea al menos una categoría en Categorías amistosas (menú Partidos) antes de armar la
              temporada.
            </p>
            <Link
              href={orgPath('/admin/friendly-categories')}
              className="inline-block text-sm text-kelme-red hover:underline"
            >
              Ir a categorías amistosas
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-kelme-gray-500">
              Marca una o más categorías. Cada una tendrá su propia inscripción de equipos.
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-2 rounded-lg border border-kelme-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={data.selectedCategoryIds.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </WizardStep>

      <WizardStep
        step={3}
        title="Inscripción"
        subtitle="Opcional — puedes hacerlo después en App móvil"
        isOpen={data.openStep === 3}
        onToggle={() => setOpenStep(3)}
      >
        {data.selectedCategoryIds.length === 0 ? (
          <p className="text-sm text-kelme-gray-600">
            Primero elige al menos una categoría en el paso anterior.
          </p>
        ) : teams.length === 0 ? (
          <p className="text-sm text-kelme-gray-600">
            Aún no hay equipos en tu organización. Puedes crear la temporada y agregar equipos
            después.
          </p>
        ) : (
          <div className="space-y-8">
            {selectedCategories.map((category) => {
              const selectedTeamIds = data.selectedTeamIdsByCategory[category.id] ?? []
              const rosterByTeam = data.rosterByCategory[category.id] ?? {}
              const selectedTeams = teams.filter((team) => selectedTeamIds.includes(team.teamId))

              return (
                <section key={category.id} className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-kelme-gray-900">
                      {category.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectAllTeamsForCategory(category.id)}
                        className="rounded-lg border border-kelme-border px-3 py-1.5 text-sm hover:border-kelme-red"
                      >
                        Seleccionar todos los equipos
                      </button>
                      {selectedTeamIds.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => clearCategoryEnrollment(category.id)}
                          className="rounded-lg border border-kelme-border px-3 py-1.5 text-sm text-kelme-gray-600 hover:border-kelme-red"
                        >
                          Limpiar selección
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <SeasonTeamsEditor
                    teams={teams}
                    selectedTeamIds={selectedTeamIds}
                    onToggleTeam={(teamId) => toggleTeam(category.id, teamId)}
                  />

                  {selectedTeams.length > 0 ? (
                    <section className="space-y-4 rounded-lg border border-kelme-border p-4">
                      <h4 className="font-semibold text-kelme-gray-900">Planteles</h4>
                      <p className="text-sm text-kelme-gray-500">
                        Al inscribir un equipo se seleccionan sus jugadores elegibles para esta
                        categoría. Ajusta la lista si necesitas.
                      </p>
                      {selectedTeams.map((team) => {
                        const eligiblePlayers = team.players.filter((player) =>
                          player.categoryIds?.includes(category.id),
                        )

                        return (
                          <div key={team.teamId} className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h5 className="font-medium">{team.name}</h5>
                              {eligiblePlayers.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => selectAllPlayersForTeam(category.id, team.teamId)}
                                  className="text-xs text-kelme-red hover:underline"
                                >
                                  Seleccionar todos
                                </button>
                              ) : null}
                            </div>
                            {eligiblePlayers.length === 0 ? (
                              <p className="text-sm text-kelme-gray-500">
                                Este equipo no tiene jugadores en esta categoría.
                              </p>
                            ) : (
                              <div className="grid gap-2 md:grid-cols-2">
                                {eligiblePlayers.map((player) => (
                                  <label
                                    key={player.id}
                                    className="flex items-center gap-2 rounded-lg border border-kelme-border px-3 py-2 text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={(rosterByTeam[team.teamId] ?? []).includes(
                                        player.id,
                                      )}
                                      onChange={() =>
                                        togglePlayer(category.id, team.teamId, player.id)
                                      }
                                    />
                                    <span>
                                      {player.jerseyNumber != null ? `#${player.jerseyNumber} ` : ''}
                                      {player.name}
                                      {player.position ? ` (${player.position})` : ''}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </section>
                  ) : null}
                </section>
              )
            })}
          </div>
        )}
      </WizardStep>

      <WizardStep
        step={4}
        title="App móvil"
        subtitle="Opcional — slug, nombre y colores de la edición"
        isOpen={data.openStep === 4}
        onToggle={() => setOpenStep(4)}
      >
        <SeasonMobileConfigFields
          organizationSlug={organizationSlug}
          value={data.mobile}
          onChange={patchMobile}
          onSlugManualEdit={markSlugManualEdit}
        />
      </WizardStep>

      <WizardStep
        step={5}
        title="Resumen"
        subtitle="Revisa antes de crear"
        isOpen={data.openStep === 5}
        onToggle={() => setOpenStep(5)}
      >
        <dl className="grid gap-2 text-sm">
          {summaryRows.map((row) => (
            <div
              key={row.label}
              className="flex justify-between gap-3 border-b border-kelme-border py-2"
            >
              <dt className="text-kelme-gray-500">{row.label}</dt>
              <dd className="font-medium text-kelme-gray-900">{row.value || '—'}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-b border-kelme-border py-2">
            <dt className="text-kelme-gray-500">Categorías</dt>
            <dd className="font-medium text-kelme-gray-900">
              {selectedCategories.length > 0
                ? selectedCategories.map((category) => category.name).join(', ')
                : 'Ninguna'}
            </dd>
          </div>
          {enrollmentByCategory.map((block) => (
            <div
              key={block.name}
              className="flex justify-between gap-3 border-b border-kelme-border py-2"
            >
              <dt className="text-kelme-gray-500">{block.name}</dt>
              <dd className="text-right font-medium text-kelme-gray-900">
                {block.teamCount > 0
                  ? `${block.teamCount} equipos · ${block.playerCount} jugadores`
                  : 'Sin inscripción (por ahora)'}
              </dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 py-2">
            <dt className="text-kelme-gray-500">App móvil</dt>
            <dd className="font-medium text-kelme-gray-900">
              {data.mobile.configureMobile
                ? `${data.mobile.displayName || data.mobile.slug || 'Configurada'}`
                : 'Después'}
            </dd>
          </div>
        </dl>
      </WizardStep>
    </MatchCreateWizardShell>
  )
}
