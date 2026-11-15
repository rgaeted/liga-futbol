import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { matchDisplayName } from '@/lib/match-label'
import { matchStatusLabel } from '@/lib/match-status-ui'

export default async function CoachDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // Un DT puede dirigir varios equipos (uno por categoría).
  const teams = await db.team.findMany({
    where: { coachId: session.user.id },
    include: {
      category: { select: { name: true } },
      _count: { select: { players: true } },
    },
    orderBy: { name: 'asc' },
  })

  if (teams.length === 0) {
    return <p>No tienes un equipo asignado.</p>
  }

  const matches = await db.match.findMany({
    where: {
      matchType: 'LEAGUE',
      OR: [
        { homeTeamId: { in: teams.map((team) => team.id) } },
        { awayTeamId: { in: teams.map((team) => team.id) } },
      ],
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { scheduledAt: 'asc' },
  })

  return (
    <div className="space-y-8">
      {teams.map((team) => {
        const teamMatches = matches.filter(
          (match) => match.homeTeamId === team.id || match.awayTeamId === team.id,
        )
        return (
          <div key={team.id} className="space-y-6">
            <div>
              <h1 className="font-display text-2xl font-bold">{team.name}</h1>
              <p className="text-kelme-gray-400">
                {team.category?.name ? `Categoría ${team.category.name} · ` : ''}
                {team._count.players} jugadores en plantilla
              </p>
            </div>
            <section>
              <h2 className="mb-3 text-lg font-semibold">Partidos</h2>
              <div className="space-y-3">
                {teamMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/coach/callups/${match.id}`}
                    className="block rounded-xl border border-kelme-border bg-kelme-surface p-4 hover:border-kelme-red"
                  >
                    <p className="font-semibold">{matchDisplayName(match)}</p>
                    <p className="text-sm text-kelme-gray-400">
                      {match.scheduledAt.toLocaleString('es-CL')} · {matchStatusLabel(match.status)}
                    </p>
                  </Link>
                ))}
                {teamMatches.length === 0 && (
                  <p className="text-kelme-gray-400">No hay partidos programados.</p>
                )}
              </div>
            </section>
          </div>
        )
      })}
    </div>
  )
}
