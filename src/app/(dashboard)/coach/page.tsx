import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CoachDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const team = await db.team.findUnique({
    where: { coachId: session.user.id },
    include: {
      players: { include: { user: { select: { name: true } } } },
    },
  })

  if (!team) {
    return <p>No tenés un equipo asignado.</p>
  }

  const matches = await db.match.findMany({
    where: {
      OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { scheduledAt: 'asc' },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{team.name}</h1>
      <p className="text-slate-400">{team.players.length} jugadores en plantilla</p>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Partidos</h2>
        <div className="space-y-3">
          {matches.map((match) => (
            <Link
              key={match.id}
              href={`/coach/callups/${match.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-emerald-600"
            >
              <p className="font-semibold">
                {match.homeTeam.name} vs {match.awayTeam.name}
              </p>
              <p className="text-sm text-slate-400">
                {match.scheduledAt.toLocaleString('es-AR')} · {match.status}
              </p>
            </Link>
          ))}
          {matches.length === 0 && (
            <p className="text-slate-500">No hay partidos programados.</p>
          )}
        </div>
      </section>
    </div>
  )
}
