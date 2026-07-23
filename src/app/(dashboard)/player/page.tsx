import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MatchStatus } from '@prisma/client'
import { matchDisplayName } from '@/lib/match-label'

export default async function PlayerDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const player = await db.player.findUnique({
    where: { userId: session.user.id },
    include: {
      team: true,
      callUps: {
        where: { match: { matchType: 'LEAGUE' } },
        include: {
          match: {
            include: {
              homeTeam: true,
              awayTeam: true,
              teamMvps: { select: { id: true, playerId: true } },
            },
          },
        },
        orderBy: { match: { scheduledAt: 'desc' } },
      },
    },
  })

  if (!player) {
    return <p className="text-kelme-gray-900">Perfil de jugador no encontrado.</p>
  }

  const mvpCount = await db.matchTeamMvp.count({
    where: { playerId: player.id, match: { status: MatchStatus.FINISHED } },
  })

  const upcoming = player.callUps.filter(
    (c) => c.match.status === 'SCHEDULED' || c.match.status === 'LIVE'
  )
  const played = player.callUps.filter((c) => c.match.status === 'FINISHED')

  return (
    <div className="space-y-6 text-kelme-gray-900">
      <header>
        <h1 className="font-display text-2xl font-bold">{session.user.name}</h1>
        <p className="text-kelme-gray-400">
          {player.team?.name ?? 'Sin equipo'} · #{player.jerseyNumber ?? '—'} · {player.position ?? '—'}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Goles" value={player.goals} />
        <StatCard label="Asistencias" value={player.assists} />
        <StatCard label="MVPs" value={mvpCount} />
        <StatCard label="Amarillas" value={player.yellowCards} />
        <StatCard label="Rojas" value={player.redCards} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Próximos partidos</h2>
        <MatchList
          items={upcoming}
          playerId={player.id}
          emptyText="No hay partidos programados."
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Partidos jugados</h2>
        <MatchList
          items={played.slice(0, 5)}
          playerId={player.id}
          emptyText="Aún no has jugado partidos."
        />
      </section>

      <Link href="/player/matches" className="text-kelme-red hover:underline">
        Ver todos mis partidos →
      </Link>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-kelme-border bg-kelme-surface p-4 text-center">
      <p className="font-display text-2xl font-bold text-kelme-red">{value}</p>
      <p className="text-sm text-kelme-gray-400">{label}</p>
    </div>
  )
}

function MatchList({
  items,
  playerId,
  emptyText,
}: {
  items: Array<{
    match: {
      id: string
      scheduledAt: Date
      homeTeam: { name: string } | null
      awayTeam: { name: string } | null
      matchType: 'LEAGUE' | 'FRIENDLY'
      sideAName: string | null
      sideBName: string | null
      homeScore: number
      awayScore: number
      status: string
      teamMvps: Array<{ id: string; playerId: string | null }>
    }
  }>
  playerId: string
  emptyText: string
}) {
  if (items.length === 0) return <p className="text-kelme-gray-400">{emptyText}</p>
  return (
    <ul className="space-y-2">
      {items.map(({ match }) => (
        <li key={match.id} className="rounded-lg border border-kelme-border bg-kelme-surface p-3">
          <div className="flex justify-between gap-2">
            <span>
              {matchDisplayName(match)}
              {match.teamMvps.some((mvp) => mvp.playerId === playerId) && (
                <span className="ml-2 text-xs font-semibold text-amber-600">⭐ MVP</span>
              )}
            </span>
            <span className="font-mono">
              {match.status === 'FINISHED'
                ? `${match.homeScore} - ${match.awayScore}`
                : new Date(match.scheduledAt).toLocaleDateString('es-CL')}
            </span>
          </div>
          {match.status === 'LIVE' && (
            <Link href={`/live/${match.id}`} className="font-ui text-xs text-kelme-red">
              EN VIVO →
            </Link>
          )}
        </li>
      ))}
    </ul>
  )
}
