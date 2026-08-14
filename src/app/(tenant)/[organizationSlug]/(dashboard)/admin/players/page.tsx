import { db } from '@/lib/db'
import { PlayerForm } from '@/components/admin/PlayerForm'
import { PlayersTable } from '@/components/admin/PlayersTable'

export default async function AdminPlayersPage() {
  const [players, teams] = await Promise.all([
    db.player.findMany({
      include: {
        user: { select: { name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { user: { name: 'asc' } },
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
          name: p.user.name,
          email: p.user.email,
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
