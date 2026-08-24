'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { submitJson } from '@/components/admin/submit'
import { MobileConfigForm } from '@/components/admin/season-mobile/MobileConfigForm'
import {
  SeasonTeamsEditor,
  type TeamEnrollment,
} from '@/components/admin/season-mobile/SeasonTeamsEditor'

export type CategoryEnrollment = {
  categoryId: string
  seasonCategoryId: string
  name: string
  teams: TeamEnrollment[]
}

type SeasonMobilePageClientProps = {
  seasonId: string
  seasonName: string
  organizationSlug: string
  slugLocked: boolean
  config: {
    slug: string
    displayName: string
    shortName: string | null
    description: string | null
    primaryColor: string | null
    secondaryColor: string | null
    isPublished: boolean
  } | null
  categories: CategoryEnrollment[]
}

function rosterStateFromTeams(teams: TeamEnrollment[]) {
  return {
    selectedTeamIds: teams.filter((t) => t.selectedPlayerIds.length > 0).map((t) => t.teamId),
    rosterByTeam: Object.fromEntries(teams.map((t) => [t.teamId, t.selectedPlayerIds])),
  }
}

export function SeasonMobilePageClient({
  seasonId,
  seasonName,
  organizationSlug,
  slugLocked,
  config,
  categories,
}: SeasonMobilePageClientProps) {
  const router = useRouter()
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    () => categories[0]?.categoryId ?? ''
  )
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [rosterByTeam, setRosterByTeam] = useState<Record<string, string[]>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedCategory = useMemo(
    () => categories.find((category) => category.categoryId === selectedCategoryId),
    [categories, selectedCategoryId]
  )

  const teams = selectedCategory?.teams ?? []

  useEffect(() => {
    const category = categories.find((item) => item.categoryId === selectedCategoryId)
    const next = rosterStateFromTeams(category?.teams ?? [])
    setSelectedTeamIds(next.selectedTeamIds)
    setRosterByTeam(next.rosterByTeam)
  }, [selectedCategoryId, categories])

  const selectedTeams = useMemo(
    () => teams.filter((t) => selectedTeamIds.includes(t.teamId)),
    [teams, selectedTeamIds]
  )

  function handleCategoryChange(categoryId: string) {
    setSelectedCategoryId(categoryId)
    setError('')
  }

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((current) =>
      current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId]
    )
  }

  function togglePlayer(teamId: string, playerId: string) {
    setRosterByTeam((current) => {
      const existing = new Set(current[teamId] ?? [])
      if (existing.has(playerId)) existing.delete(playerId)
      else existing.add(playerId)
      return { ...current, [teamId]: [...existing] }
    })
  }

  async function saveEnrollment() {
    if (!selectedCategoryId) {
      setError('Selecciona una categoría.')
      return
    }

    setSaving(true)
    setError('')
    const payload = {
      categoryId: selectedCategoryId,
      teams: selectedTeams.map((team, index) => ({
        teamId: team.teamId,
        displayName: team.name,
        color: team.color,
        sortOrder: index,
        playerIds: rosterByTeam[team.teamId] ?? [],
      })),
    }
    const result = await submitJson(`/api/admin/seasons/${seasonId}/enrollment`, 'PUT', payload)
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">App móvil — {seasonName}</h1>
        <p className="text-sm text-kelme-gray-600">
          Configura la edición pública y la inscripción histórica de equipos por categoría.
        </p>
      </div>

      <MobileConfigForm
        seasonId={seasonId}
        organizationSlug={organizationSlug}
        slugLocked={slugLocked}
        initial={{
          slug: config?.slug ?? seasonName.toLowerCase().replace(/\s+/g, '-'),
          displayName: config?.displayName ?? seasonName,
          shortName: config?.shortName ?? '',
          description: config?.description ?? '',
          primaryColor: config?.primaryColor ?? '#CD212A',
          secondaryColor: config?.secondaryColor ?? '#FFFFFF',
          isPublished: config?.isPublished ?? false,
        }}
      />

      {categories.length === 0 ? (
        <div className="rounded-lg border border-kelme-border p-4 text-sm text-kelme-gray-600">
          Esta temporada no tiene categorías configuradas. Agrega categorías al crear o editar la
          temporada.
        </div>
      ) : (
        <>
          <section className="space-y-3 rounded-lg border border-kelme-border p-4">
            <h2 className="font-display text-lg font-semibold">Categoría</h2>
            <select
              value={selectedCategoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full input-kelme rounded-lg px-3 py-2 text-sm"
            >
              {categories.map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.name}
                </option>
              ))}
            </select>
          </section>

          <SeasonTeamsEditor
            teams={teams}
            selectedTeamIds={selectedTeamIds}
            onToggleTeam={toggleTeam}
          />

          <section className="space-y-4 rounded-lg border border-kelme-border p-4">
            <h2 className="font-display text-lg font-semibold">Planteles</h2>
            {selectedTeams.length === 0 ? (
              <p className="text-sm text-kelme-gray-500">
                Selecciona al menos un equipo inscrito para configurar planteles.
              </p>
            ) : (
              selectedTeams.map((team) => {
                const eligiblePlayers = team.players.filter(
                  (player) =>
                    !player.categoryIds?.length ||
                    player.categoryIds.includes(selectedCategoryId)
                )

                return (
                  <div key={team.teamId} className="space-y-2">
                    <h3 className="font-semibold">{team.name}</h3>
                    {eligiblePlayers.length === 0 ? (
                      <p className="text-sm text-kelme-gray-500">
                        No hay jugadores elegibles para esta categoría en este equipo.
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
                              checked={(rosterByTeam[team.teamId] ?? []).includes(player.id)}
                              onChange={() => togglePlayer(team.teamId, player.id)}
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
              })
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveEnrollment}
                disabled={saving || !selectedCategoryId}
                className="rounded-lg bg-kelme-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Guardar inscripción
              </button>
              {error && <p className="text-sm text-kelme-red">{error}</p>}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
