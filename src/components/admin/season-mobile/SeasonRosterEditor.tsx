'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { submitJson } from '@/components/admin/submit'
import { MobileConfigForm } from '@/components/admin/season-mobile/MobileConfigForm'
import {
  SeasonTeamsEditor,
  type TeamEnrollment,
} from '@/components/admin/season-mobile/SeasonTeamsEditor'

type SeasonMobilePageClientProps = {
  seasonId: string
  seasonName: string
  config: {
    slug: string
    displayName: string
    shortName: string | null
    description: string | null
    primaryColor: string | null
    secondaryColor: string | null
    isPublished: boolean
  } | null
  teams: TeamEnrollment[]
}

export function SeasonMobilePageClient({
  seasonId,
  seasonName,
  config,
  teams,
}: SeasonMobilePageClientProps) {
  const router = useRouter()
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(
    teams.filter((t) => t.selectedPlayerIds.length > 0).map((t) => t.teamId),
  )
  const [rosterByTeam, setRosterByTeam] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(teams.map((t) => [t.teamId, t.selectedPlayerIds])),
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedTeams = useMemo(
    () => teams.filter((t) => selectedTeamIds.includes(t.teamId)),
    [teams, selectedTeamIds],
  )

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((current) =>
      current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId],
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
    setSaving(true)
    setError('')
    const payload = {
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
          Configura la edición pública y la inscripción histórica de equipos.
        </p>
      </div>

      <MobileConfigForm
        seasonId={seasonId}
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

      <SeasonTeamsEditor
        teams={teams}
        selectedTeamIds={selectedTeamIds}
        onToggleTeam={toggleTeam}
      />

      <section className="space-y-4 rounded-lg border border-kelme-border p-4">
        <h2 className="font-display text-lg font-semibold">Planteles</h2>
        {selectedTeams.map((team) => (
          <div key={team.teamId} className="space-y-2">
            <h3 className="font-semibold">{team.name}</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {team.players.map((player) => (
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
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveEnrollment}
            disabled={saving}
            className="rounded-lg bg-kelme-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Guardar inscripción
          </button>
          {error && <p className="text-sm text-kelme-red">{error}</p>}
        </div>
      </section>
    </div>
  )
}
