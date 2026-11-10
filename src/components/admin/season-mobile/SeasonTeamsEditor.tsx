'use client'

type PlayerOption = {
  id: string
  name: string
  jerseyNumber: number | null
  position: string | null
  categoryIds?: string[]
}

type TeamEnrollment = {
  teamId: string
  name: string
  color: string | null
  categoryId?: string | null
  categoryName?: string | null
  players: PlayerOption[]
  selectedPlayerIds: string[]
}

type SeasonTeamsEditorProps = {
  teams: TeamEnrollment[]
  selectedTeamIds: string[]
  onToggleTeam: (teamId: string) => void
}

export function SeasonTeamsEditor({
  teams,
  selectedTeamIds,
  onToggleTeam,
}: SeasonTeamsEditorProps) {
  return (
    <section className="space-y-3 rounded-lg border border-kelme-border p-4">
      <h2 className="font-display text-lg font-semibold">Equipos inscritos</h2>
      <div className="grid gap-2 md:grid-cols-2">
        {teams.map((team) => (
          <label
            key={team.teamId}
            className="flex items-center gap-2 rounded-lg border border-kelme-border px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selectedTeamIds.includes(team.teamId)}
              onChange={() => onToggleTeam(team.teamId)}
            />
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              <span>{team.name}</span>
              {team.categoryName ? (
                <span className="rounded-full bg-kelme-gray-100 px-2 py-0.5 text-xs font-semibold text-kelme-gray-600">
                  {team.categoryName}
                </span>
              ) : (
                <span className="rounded-full border border-dashed border-kelme-border px-2 py-0.5 text-xs text-kelme-gray-500">
                  Sin categoría
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}

export type { TeamEnrollment, PlayerOption }
