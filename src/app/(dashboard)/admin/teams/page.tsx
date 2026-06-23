import { db } from '@/lib/db'
import { TeamForm } from '@/components/admin/TeamForm'

export default async function AdminTeamsPage() {
  const teams = await db.team.findMany({
    include: { coach: true, _count: { select: { players: true } } },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Equipos</h1>
      <TeamForm />
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">DT</th>
              <th className="p-3">Jugadores</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-t border-slate-800">
                <td className="p-3">{team.name}</td>
                <td className="p-3">{team.coach?.name ?? '—'}</td>
                <td className="p-3">{team._count.players}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
