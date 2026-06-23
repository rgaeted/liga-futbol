import { db } from '@/lib/db'
import { PlayerForm } from '@/components/admin/PlayerForm'

export default async function AdminPlayersPage() {
  const [players, teams] = await Promise.all([
    db.player.findMany({
      include: {
        user: { select: { name: true, email: true } },
        team: { select: { name: true } },
      },
      orderBy: { user: { name: 'asc' } },
    }),
    db.team.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Jugadores</h1>
      <PlayerForm teams={teams} />
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Email</th>
              <th className="p-3">Equipo</th>
              <th className="p-3">Dorsal</th>
              <th className="p-3">Posición</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id} className="border-t border-slate-800">
                <td className="p-3">{player.user.name}</td>
                <td className="p-3">{player.user.email}</td>
                <td className="p-3">{player.team?.name ?? '—'}</td>
                <td className="p-3">{player.jerseyNumber ?? '—'}</td>
                <td className="p-3">{player.position ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
