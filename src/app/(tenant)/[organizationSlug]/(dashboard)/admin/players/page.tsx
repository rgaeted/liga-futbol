import { db } from '@/lib/db'
import { PlayerForm } from '@/components/admin/PlayerForm'
import { PlayersTable } from '@/components/admin/PlayersTable'
import { playerDisplayName } from '@/lib/person-name'

export default async function AdminPlayersPage() {
  const [players, teams] = await Promise.all([
    db.player.findMany({
      include: {
        person: { include: { user: { select: { name: true, email: true } } } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { person: { firstName: 'asc' } },
    }),
    db.team.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Jugadores</h1>
      <PlayerForm teams={teams} />
      <PlayersTable
        players={players.map((p) => ({
          id: p.id,
          name: playerDisplayName(p),
          email: p.person.user?.email ?? '',
          teamId: p.team?.id ?? null,
          teamName: p.team?.name ?? null,
          jerseyNumber: p.jerseyNumber,
          position: p.position,
        }))}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  )
}
