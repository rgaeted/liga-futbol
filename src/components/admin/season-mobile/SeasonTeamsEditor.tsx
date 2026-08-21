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
            <span>{team.name}</span>
          </label>
        ))}
      </div>
    </section>
  )
}

export type { TeamEnrollment, PlayerOption }
